import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Box,
    Typography,
    Checkbox,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Button,
    CircularProgress,
    Alert,
    Snackbar,
    Chip
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import { getCardsByListandMember, moveCardToList, updateCardDueComplete } from '../api/trelloApi';
import listsId from '../data/listsId.json';
import CardDetailModal from './CardDetailModal';
import members from '../data/members.json';


const priorityColors = {
    high: '#f44336',    // Đỏ cho ưu tiên cao
    medium: '#ff9800',  // Cam cho ưu tiên trung bình
    low: '#4caf50'      // Xanh cho ưu tiên thấp
};

const TsWorkspace = () => {
    const [expandedSections, setExpandedSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sections, setSections] = useState([
        {
            id: 3,
            title: 'Need to follow up',
            color: '#E91E63',
            tasks: []
        },
        {
            id: 1,
            title: 'Waiting to do',
            color: '#FF9800',
            tasks: []
        },
        {
            id: 2,
            title: 'Doing',
            color: '#2196F3',
            tasks: []
        },
        {
            id: 7,
            title: 'Complete',
            color: '#4CAF50',
            tasks: []
        }
    ]);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    const refreshData = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                throw new Error('User data not found');
            }

            const user = JSON.parse(userData);
            if (!user || !user.trelloId) {
                throw new Error('User Trello ID not found');
            }

            // Lấy listId cho 2 cột cần thiết
            const waitingToFixList = listsId.find(list => list.name === 'Waiting to fix (from dev)');
            const updateWorkflowList = listsId.find(list => list.name === 'Update workflow required or Waiting for access (SLA: 2 days)');
            if (!waitingToFixList || !updateWorkflowList) {
                throw new Error('Required list IDs for Need to follow up not found');
            }

            // Lấy card từ 2 cột này
            const [waitingToFixCards, updateWorkflowCards] = await Promise.all([
                getCardsByListandMember(waitingToFixList.id, user.trelloId),
                getCardsByListandMember(updateWorkflowList.id, user.trelloId)
            ]);
            const needToFollowUpCards = [...waitingToFixCards, ...updateWorkflowCards];

            // Map cards cho section
            const mapCard = card => ({
                id: card.id,
                title: card.name,
                completed: card.dueComplete || false,
                priority: card.labels?.length > 0 ? card.labels[0].name.toLowerCase() : 'medium',
                dueDate: card.due,
                customer: card.desc?.split('\n')[0] || 'Unknown',
                ticketId: card.shortUrl?.split('/').pop() || ''
            });
            const needToFollowUpTasks = needToFollowUpCards.map(mapCard);

            // Thêm vào sau đoạn lấy needToFollowUpTasks
            const newIssuesListId = listsId.find(list => list.name === 'New Issues');
            if (!newIssuesListId) {
                throw new Error('New Issues list ID not found');
            }
            const newIssuesCards = await getCardsByListandMember(newIssuesListId.id, user.trelloId);
            const waitingToDoTasks = newIssuesCards.map(card => ({
                id: card.id,
                title: card.name,
                completed: false,
                priority: card.labels?.length > 0 ? card.labels[0].name.toLowerCase() : 'medium',
                dueDate: card.due,
                customer: card.desc?.split('\n')[0] || 'Unknown',
                ticketId: card.shortUrl.split('/').pop()
            }));

            // Fetch Doing cards
            const doingListId = listsId.find(list => list.name === 'Doing (Inshift)');
            if (!doingListId) {
                throw new Error('Doing list ID not found');
            }
            const doingCards = await getCardsByListandMember(doingListId.id, user.trelloId);
            
            const incompleteCards = doingCards.filter(card => !card.dueComplete);
            const completedCards = doingCards.filter(card => card.dueComplete);

            const doingTasks = incompleteCards.map(card => ({
                id: card.id,
                title: card.name,
                completed: false,
                priority: card.labels?.length > 0 ? card.labels[0].name.toLowerCase() : 'medium',
                dueDate: card.due,
                customer: card.desc?.split('\n')[0] || 'Unknown',
                ticketId: card.shortUrl.split('/').pop()
            }));

            const completedTasks = completedCards.map(card => ({
                id: card.id,
                title: card.name,
                completed: true,
                priority: card.labels?.length > 0 ? card.labels[0].name.toLowerCase() : 'medium',
                dueDate: card.due,
                customer: card.desc?.split('\n')[0] || 'Unknown',
                ticketId: card.shortUrl.split('/').pop()
            }));

            // Update all sections
            setSections(prevSections => {
                const updatedSections = [...prevSections];
                const needToFollowUpSection = updatedSections.find(section => section.id === 3);
                const waitingToDoSection = updatedSections.find(section => section.id === 1);
                const doingSection = updatedSections.find(section => section.id === 2);
                const completeSection = updatedSections.find(section => section.id === 7);

                if (needToFollowUpSection) needToFollowUpSection.tasks = needToFollowUpTasks;
                if (waitingToDoSection) waitingToDoSection.tasks = waitingToDoTasks;
                if (doingSection) doingSection.tasks = doingTasks;
                if (completeSection) completeSection.tasks = completedTasks;

                return updatedSections;
            });
        } catch (err) {
            console.error('Error refreshing data:', err);
            setError(err.message);
            setSnackbar({
                open: true,
                message: 'Failed to refresh data: ' + err.message,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial data fetch
        refreshData();

        // Set up interval to refresh data every 10 seconds
        const intervalId = setInterval(() => {
            refreshData();
        }, 10000); // 10000ms = 10 seconds

        // Cleanup interval on component unmount
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const handleSectionChange = (sectionId) => {
        setExpandedSections(prev => {
            if (prev.includes(sectionId)) {
                return prev.filter(id => id !== sectionId);
            } else {
                return [...prev, sectionId];
            }
        });
    };

    const handleTaskToggle = async (sectionId, taskId) => {
        try {
            setLoading(true);
            // API call to toggle task status will be added here
            await refreshData(); // Refresh data after toggle
            setSnackbar({
                open: true,
                message: 'Cập nhật trạng thái thành công',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.message || 'Có lỗi xảy ra',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (sectionId) => {
        try {
            setLoading(true);
            // Add task logic will be implemented here
            await refreshData(); // Refresh data after adding
            setSnackbar({
                open: true,
                message: 'Thêm công việc thành công',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.message || 'Có lỗi xảy ra',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditTask = async (sectionId, taskId) => {
        try {
            setLoading(true);
            // Edit task logic will be implemented here
            await refreshData(); // Refresh data after editing
            setSnackbar({
                open: true,
                message: 'Cập nhật công việc thành công',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.message || 'Có lỗi xảy ra',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (sectionId, taskId) => {
        try {
            setLoading(true);
            // Delete task logic will be implemented here
            await refreshData(); // Refresh data after deleting
            setSnackbar({
                open: true,
                message: 'Xóa công việc thành công',
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.message || 'Có lỗi xảy ra',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = async () => {
        setIsModalOpen(false);
        setSelectedTask(null);
        await refreshData(); // Refresh data after closing modal
    };

    const renderTaskSecondary = (task) => {
        // Format date
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 0.5,
                mt: 0.5
            }}>
                {/* Customer and Ticket ID */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {task.customer && (
                        <Chip
                            label={task.customer}
                            size="small"
                            sx={{
                                bgcolor: '#E91E6320',
                                color: '#E91E63',
                                fontWeight: 'medium',
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                    {task.ticketId && (
                        <Chip
                            label={task.ticketId}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(0,0,0,0.08)',
                                fontWeight: 'medium',
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                </Box>

                {/* Priority and Due Date */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {task.priority && (
                        <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                                bgcolor: `${priorityColors[task.priority]}20`,
                                color: priorityColors[task.priority],
                                fontWeight: 'medium',
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                    {task.dueDate && (
                        <Chip
                            label={`Due: ${formatDate(task.dueDate)}`}
                            size="small"
                            sx={{ 
                                bgcolor: 'rgba(0,0,0,0.08)',
                                fontWeight: 'medium',
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                </Box>

                {/* Urgent Label */}
                {task.labels?.includes('urgent') && (
                    <Chip
                        label="URGENT"
                        size="small"
                        sx={{
                            bgcolor: '#f4433620',
                            color: '#f44336',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            border: '1px solid #f44336'
                        }}
                    />
                )}
            </Box>
        );
    };

    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination } = result;
        
        // Tìm source và destination sections
        const sourceSection = sections.find(s => s.id.toString() === source.droppableId);
        const destSection = sections.find(s => s.id.toString() === destination.droppableId);

        // Không cho phép kéo card về cột Need to follow up (id: 3)
        if (destSection && destSection.id === 3) {
            return;
        }

        if (!sourceSection || !destSection) {
            console.error('Source or destination section not found');
            return;
        }

        if (!sourceSection.tasks || !destSection.tasks) {
            console.error('Tasks array not found in section');
            return;
        }

        try {
            const task = sourceSection.tasks[source.index];

            // Nếu kéo sang cột Waiting to do (id: 1)
            if (destSection.id === 1) {
                const newIssuesListId = listsId.find(list => list.name === 'New Issues');
                
                if (!newIssuesListId) {
                    throw new Error('New Issues list ID not found');
                }

                // Cập nhật UI trước khi gọi API
                const sourceTasks = [...sourceSection.tasks];
                const destTasks = [...destSection.tasks];
                const [removed] = sourceTasks.splice(source.index, 1);
                destTasks.splice(destination.index, 0, removed);
                
                setSections(sections.map(s => {
                    if (s.id.toString() === source.droppableId) return { ...s, tasks: sourceTasks };
                    if (s.id.toString() === destination.droppableId) return { ...s, tasks: destTasks };
                    return s;
                }));

                // Thực hiện các API calls song song
                const promises = [];
                
                // Chuyển card về New Issues
                promises.push(moveCardToList(task.id, newIssuesListId.id));
                
                // Nếu card đang ở cột Complete, unmark complete
                if (sourceSection.id === 7) {
                    promises.push(updateCardDueComplete(task.id, false));
                }

                // Thực hiện tất cả các API calls cùng lúc
                await Promise.all(promises);

                // Refresh data sau khi hoàn thành
                await refreshData();

                setSnackbar({
                    open: true,
                    message: 'Di chuyển công việc về Waiting to do thành công',
                    severity: 'success'
                });
            }
            // Nếu kéo sang cột Doing (id: 2)
            else if (destSection.id === 2) {
                const doingListId = listsId.find(list => list.name === 'Doing (Inshift)');
                
                if (!doingListId) {
                    throw new Error('Doing list ID not found');
                }

                // Cập nhật UI trước khi gọi API
                const sourceTasks = [...sourceSection.tasks];
                const destTasks = [...destSection.tasks];
                const [removed] = sourceTasks.splice(source.index, 1);
                destTasks.splice(destination.index, 0, removed);
                
                setSections(sections.map(s => {
                    if (s.id.toString() === source.droppableId) return { ...s, tasks: sourceTasks };
                    if (s.id.toString() === destination.droppableId) return { ...s, tasks: destTasks };
                    return s;
                }));

                // Nếu card đang ở cột Complete, unmark complete sau khi chuyển sang Doing
                const promises = [moveCardToList(task.id, doingListId.id)];
                if (sourceSection.id === 7) {
                    promises.push(updateCardDueComplete(task.id, false));
                }
                await Promise.all(promises);

                // Refresh data sau khi di chuyển
                await refreshData();

                setSnackbar({
                    open: true,
                    message: 'Di chuyển công việc thành công',
                    severity: 'success'
                });
            }
            // Nếu kéo sang cột Complete (id: 7)
            else if (destSection.id === 7) {
                const doingListId = listsId.find(list => list.name === 'Doing (Inshift)');
                
                if (!doingListId) {
                    throw new Error('Doing list ID not found');
                }

                // Cập nhật UI ngay lập tức cho cả hai bước
                const sourceTasks = [...sourceSection.tasks];
                const [removed] = sourceTasks.splice(source.index, 1);
                const completeTasks = [...destSection.tasks];
                completeTasks.splice(destination.index, 0, removed);

                // Cập nhật UI cho cả hai cột cùng lúc
                setSections(sections.map(s => {
                    if (s.id.toString() === source.droppableId) return { ...s, tasks: sourceTasks };
                    if (s.id === 7) return { ...s, tasks: completeTasks };
                    return s;
                }));

                // Thực hiện các API calls song song
                const promises = [];
                
                // Nếu card không ở cột Doing, chuyển nó vào Doing
                if (sourceSection.id !== 2) {
                    promises.push(moveCardToList(task.id, doingListId.id));
                }
                
                // Đánh dấu card là đã hoàn thành
                promises.push(updateCardDueComplete(task.id, true));

                // Thực hiện tất cả các API calls cùng lúc
                await Promise.all(promises);

                // Refresh data sau khi hoàn thành
                await refreshData();

                setSnackbar({
                    open: true,
                    message: 'Đánh dấu công việc hoàn thành thành công',
                    severity: 'success'
                });
            } else {
                // Xử lý các trường hợp kéo thả khác ở đây
                if (source.droppableId === destination.droppableId) {
                    // Chỉ cập nhật UI, KHÔNG gọi refreshData, KHÔNG await gì cả
                    const tasks = [...sourceSection.tasks];
                    const [removed] = tasks.splice(source.index, 1);
                    tasks.splice(destination.index, 0, removed);
                    setSections(sections.map(s => 
                        s.id.toString() === source.droppableId ? { ...s, tasks } : s
                    ));
                    return; // Dừng luôn, không làm gì thêm
                } else {
                    const sourceTasks = [...sourceSection.tasks];
                    const destTasks = [...destSection.tasks];
                    const [removed] = sourceTasks.splice(source.index, 1);
                    destTasks.splice(destination.index, 0, removed);
                    
                    setSections(sections.map(s => {
                        if (s.id.toString() === source.droppableId) return { ...s, tasks: sourceTasks };
                        if (s.id.toString() === destination.droppableId) return { ...s, tasks: destTasks };
                        return s;
                    }));
                }
            }
        } catch (err) {
            console.error('Error handling drag end:', err);
            setSnackbar({
                open: true,
                message: 'Có lỗi xảy ra khi di chuyển công việc: ' + err.message,
                severity: 'error'
            });
            // Refresh data để khôi phục trạng thái ban đầu nếu có lỗi
            await refreshData();
        } finally {
            setLoading(false);
        }
    };

    // Thêm hàm moveCardToList để gọi API Trello

    const handleDragUpdate = (result) => {
        const { destination, draggableId } = result;
        if (!destination) return;

        // Handle vertical scrolling within a section
        const container = document.querySelector(`[data-rbd-droppable-id="${destination.droppableId}"]`);
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const draggableElement = document.querySelector(`[data-rbd-draggable-id="${draggableId}"]`);
            if (draggableElement) {
                const draggableRect = draggableElement.getBoundingClientRect();
                const scrollThreshold = 50; // Giảm ngưỡng xuống 50px

                // Check if near bottom edge
                if (containerRect.bottom - draggableRect.bottom < scrollThreshold) {
                    container.scrollTop += 20; // Tăng tốc độ scroll
                }
                // Check if near top edge
                else if (draggableRect.top - containerRect.top < scrollThreshold) {
                    container.scrollTop -= 20; // Tăng tốc độ scroll
                }
            }
        }

        // Handle horizontal scrolling for sections container
        const sectionsContainer = document.querySelector('.sections-container');
        if (sectionsContainer) {
            const sectionsRect = sectionsContainer.getBoundingClientRect();
            const draggableElement = document.querySelector(`[data-rbd-draggable-id="${draggableId}"]`);
            if (draggableElement) {
                const draggableRect = draggableElement.getBoundingClientRect();
                const scrollThreshold = 100; // Giảm ngưỡng xuống 100px

                // Check if near right edge
                if (sectionsRect.right - draggableRect.right < scrollThreshold) {
                    sectionsContainer.scrollLeft += 30; // Tăng tốc độ scroll
                }
                // Check if near left edge
                else if (draggableRect.left - sectionsRect.left < scrollThreshold) {
                    sectionsContainer.scrollLeft -= 30; // Tăng tốc độ scroll
                }
            }
        }
    };

    return (
        <DragDropContext 
            onDragEnd={handleDragEnd}
            onDragUpdate={handleDragUpdate}
        >
            <Box sx={{ 
                p: { xs: 2, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                bgcolor: '#f8f9fa',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            }}>
                {/* Header */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2,
                    bgcolor: 'white',
                    p: { xs: 2, md: 2.5 },
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)'
                    }
                }}>
                    <Typography 
                        variant="h4" 
                        component="h1" 
                        sx={{ 
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px',
                            fontSize: { xs: '1.5rem', md: '2rem' }
                        }}
                    >
                        TS Workspace
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        sx={{
                            background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #06038D 20%, #1B263B 100%)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(6,3,141,0.2)'
                            },
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(6,3,141,0.15)',
                            borderRadius: '12px',
                            px: { xs: 2, md: 3 },
                            py: { xs: 1, md: 1.5 },
                            fontSize: { xs: '0.875rem', md: '1rem' }
                        }}
                    >
                        Thêm công việc mới
                    </Button>
                </Box>

                {/* Sections Container */}
                <Box 
                    className="sections-container"
                    sx={{ 
                        display: 'flex',
                        gap: { xs: 2, md: 3 },
                        width: '100%',
                        height: 'calc(100vh - 120px)',
                        overflow: 'auto',
                        pb: 2,
                        scrollBehavior: 'smooth',
                        scrollSnapType: 'x mandatory',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                            height: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'rgba(0,0,0,0.05)',
                            borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            '&:hover': {
                                background: 'rgba(0,0,0,0.3)'
                            }
                        }
                    }}
                >
                    {sections.map((section) => (
                        <Box
                            key={section.id}
                            sx={{
                                flex: 1,
                                minWidth: { xs: '280px', md: '320px' },
                                maxWidth: { xs: '320px', md: '380px' },
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                scrollSnapAlign: 'start'
                            }}
                        >
                            <Box
                                sx={{
                                    bgcolor: 'white',
                                    p: { xs: 1.5, md: 2 },
                                    borderRadius: '16px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    borderLeft: `4px solid ${section.color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 24px rgba(0,0,0,0.12)'
                                    }
                                }}
                            >
                                <Typography 
                                    variant="h6" 
                                    component="div" 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        color: '#1a237e',
                                        fontSize: { xs: '1rem', md: '1.25rem' }
                                    }}
                                >
                                    {section.title}
                                </Typography>
                                <Chip 
                                    label={`${section.tasks.filter(t => t.completed).length}/${section.tasks.length}`}
                                    size="small"
                                    sx={{ 
                                        bgcolor: 'rgba(0,0,0,0.04)',
                                        fontWeight: 'medium',
                                        color: 'text.secondary',
                                        borderRadius: '8px',
                                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                                    }}
                                />
                            </Box>
                            <Droppable droppableId={section.id.toString()}>
                                {(provided, snapshot) => (
                                    <List 
                                        sx={{ 
                                            flex: 1,
                                            bgcolor: 'white',
                                            borderRadius: '16px',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            p: { xs: 1, md: 1.5 },
                                            overflow: 'auto',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'all 0.3s ease',
                                            ...(snapshot.isDraggingOver && {
                                                bgcolor: 'rgba(33, 150, 243, 0.05)',
                                                border: '2px dashed #2196F3',
                                                boxShadow: '0 6px 24px rgba(33, 150, 243,0.15)'
                                            }),
                                            '&::-webkit-scrollbar': {
                                                width: '6px'
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: 'rgba(0,0,0,0.05)',
                                                borderRadius: '3px'
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '3px',
                                                '&:hover': {
                                                    background: 'rgba(0,0,0,0.3)'
                                                }
                                            }
                                        }}
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {section.tasks.map((task, index) => (
                                            <Draggable
                                                key={task.id}
                                                draggableId={task.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <ListItem
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => handleTaskClick(task)}
                                                        sx={{
                                                            bgcolor: snapshot.isDragging ? 'rgba(33, 150, 243, 0.05)' : 'inherit',
                                                            transition: 'all 0.3s ease',
                                                            transform: snapshot.isDragging ? 'scale(1.02) rotate(1deg)' : 'none',
                                                            boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
                                                            borderRadius: '12px',
                                                            mb: 1.5,
                                                            p: { xs: 1.5, md: 2 },
                                                            position: 'relative',
                                                            zIndex: snapshot.isDragging ? 1000 : 0,
                                                            pointerEvents: snapshot.isDragging ? 'none' : 'auto',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(0,0,0,0.02)',
                                                                transform: 'translateX(4px)',
                                                                cursor: 'pointer'
                                                            },
                                                            border: '1px solid rgba(0,0,0,0.05)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 1
                                                        }}
                                                        disablePadding
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
                                                            <Box sx={{ minWidth: 'auto', mt: 0.5 }}>
                                                                <Checkbox
                                                                    edge="start"
                                                                    checked={task.completed}
                                                                    onChange={() => handleTaskToggle(section.id, task.id)}
                                                                    icon={<UncheckedIcon />}
                                                                    checkedIcon={<CheckCircleIcon />}
                                                                    sx={{
                                                                        color: section.color,
                                                                        '&.Mui-checked': {
                                                                            color: section.color,
                                                                        },
                                                                        transition: 'all 0.3s ease',
                                                                        '&:hover': {
                                                                            transform: 'scale(1.1)'
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Box sx={{ flex: 1, mr: 6 }}>
                                                                <Typography
                                                                    sx={{
                                                                        textDecoration: task.completed ? 'line-through' : 'none',
                                                                        color: task.completed ? 'text.secondary' : 'text.primary',
                                                                        fontWeight: 'medium',
                                                                        fontSize: { xs: '0.875rem', md: '0.95rem' },
                                                                        lineHeight: 1.4,
                                                                        mb: 1
                                                                    }}
                                                                >
                                                                    {task.title}
                                                                </Typography>
                                                                {renderTaskSecondary(task)}
                                                            </Box>
                                                            <Box sx={{ 
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                display: 'flex'
                                                            }}>
                                                                <IconButton 
                                                                    edge="end" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditTask(section.id, task.id);
                                                                    }}
                                                                    sx={{ 
                                                                        mr: 1,
                                                                        color: 'text.secondary',
                                                                        transition: 'all 0.3s ease',
                                                                        '&:hover': {
                                                                            color: 'primary.main',
                                                                            bgcolor: 'rgba(0,0,0,0.04)',
                                                                            transform: 'scale(1.1)'
                                                                        }
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton 
                                                                    edge="end" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(section.id, task.id);
                                                                    }}
                                                                    sx={{ 
                                                                        color: 'text.secondary',
                                                                        transition: 'all 0.3s ease',
                                                                        '&:hover': {
                                                                            color: 'error.main',
                                                                            bgcolor: 'rgba(244,67,54,0.04)',
                                                                            transform: 'scale(1.1)'
                                                                        }
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </Box>
                                                    </ListItem>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        <ListItem
                                            sx={{
                                                justifyContent: 'center',
                                                py: 1.5,
                                                minHeight: '50px',
                                                bgcolor: snapshot.isDraggingOver ? 'rgba(33, 150, 243, 0.05)' : 'inherit',
                                                transition: 'all 0.3s ease',
                                                position: 'relative',
                                                zIndex: snapshot.isDraggingOver ? 1 : 0,
                                                borderRadius: '12px',
                                                border: '1px dashed rgba(0,0,0,0.1)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(33, 150, 243, 0.05)',
                                                    borderColor: '#2196F3',
                                                    transform: 'translateY(-2px)'
                                                }
                                            }}
                                        >
                                            <Button
                                                startIcon={<AddIcon />}
                                                onClick={() => handleAddTask(section.id)}
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        color: 'primary.main',
                                                        bgcolor: 'rgba(0,0,0,0.02)',
                                                        transform: 'scale(1.05)'
                                                    }
                                                }}
                                            >
                                                Thêm công việc
                                            </Button>
                                        </ListItem>
                                    </List>
                                )}
                            </Droppable>
                        </Box>
                    ))}
                </Box>

                {/* Card Detail Modal */}
                {selectedTask && isModalOpen && (
                    <CardDetailModal 
                        open={isModalOpen}
                        onClose={handleCloseModal}
                        cardId={selectedTask}
                    />
                )}

                {/* Loading and Error states */}
                {loading && (
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        mt: 2,
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9999
                    }}>
                        <CircularProgress 
                            sx={{
                                color: 'primary.main',
                                '& .MuiCircularProgress-circle': {
                                    strokeLinecap: 'round',
                                }
                            }}
                        />
                    </Box>
                )}
                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mt: 2,
                            position: 'fixed',
                            top: 20,
                            right: 20,
                            zIndex: 9999,
                            minWidth: '300px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            borderRadius: '12px'
                        }}
                    >
                        {error}
                    </Alert>
                )}

                {/* Notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={snackbar.severity}
                        sx={{ 
                            width: '100%',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            borderRadius: '12px'
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </DragDropContext>
    );
};

export default TsWorkspace;
