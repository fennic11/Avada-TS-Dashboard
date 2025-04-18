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
import { getCardsByListandMember } from '../api/trelloApi';
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
            id: 4,
            title: 'Waiting to permission',
            color: '#9C27B0',
            tasks: []
        },
        {
            id: 5,
            title: 'Waiting to reply customer',
            color: '#F44336',
            tasks: []
        },
        {
            id: 6,
            title: 'Replied customer',
            color: '#00BCD4',
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

    useEffect(() => {
        const fetchWaitingToDoCards = async () => {
            try {
                setLoading(true);
                const userData = localStorage.getItem('user');
                console.log('User data:', userData);
                if (!userData) {
                    throw new Error('User data not found');
                }

                const user = JSON.parse(userData);
                if (!user || !user.trelloId) {
                    throw new Error('User Trello ID not found');
                }

                const newIssuesListId = listsId.find(list => list.name === 'New Issues');
                if (!newIssuesListId) {
                    throw new Error('New Issues list ID not found');
                }

                console.log('Fetching cards for:', {
                    listId: newIssuesListId.id,
                    trelloId: user.trelloId
                });

                const cards = await getCardsByListandMember(newIssuesListId.id, user.trelloId);
                console.log('Fetched cards:', cards);

                if (!cards) {
                    throw new Error('Failed to fetch cards');
                }

                // Transform Trello cards into our task format
                const waitingToDoTasks = cards.map(card => ({
                    id: card.id,
                    title: card.name,
                    completed: false,
                    priority: card.labels?.length > 0 ? card.labels[0].name.toLowerCase() : 'medium',
                    dueDate: card.due,
                    customer: card.desc?.split('\n')[0] || 'Unknown',
                    ticketId: card.shortUrl.split('/').pop()
                }));

                // Update the sections with the fetched cards
                setSections(prevSections => {
                    const updatedSections = [...prevSections];
                    const waitingToDoSection = updatedSections.find(section => section.id === 1);
                    if (waitingToDoSection) {
                        waitingToDoSection.tasks = waitingToDoTasks;
                    }
                    return updatedSections;
                });
            } catch (err) {
                console.error('Error fetching cards:', err);
                setError(err.message);
                setSnackbar({
                    open: true,
                    message: 'Failed to fetch waiting to do tasks: ' + err.message,
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchWaitingToDoCards();
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

    const handleAddTask = (sectionId) => {
        // Add task logic will be implemented here
    };

    const handleEditTask = (sectionId, taskId) => {
        // Edit task logic will be implemented here
    };

    const handleDeleteTask = (sectionId, taskId) => {
        // Delete task logic will be implemented here
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
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

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const { source, destination } = result;
        
        // Tìm source và destination sections
        const sourceSection = sections.find(s => s.id.toString() === source.droppableId);
        const destSection = sections.find(s => s.id.toString() === destination.droppableId);

        if (!sourceSection || !destSection) {
            console.error('Source or destination section not found');
            return;
        }

        if (!sourceSection.tasks || !destSection.tasks) {
            console.error('Tasks array not found in section');
            return;
        }

        // Mở section đích nếu nó đang đóng
        if (!expandedSections.includes(destSection.id)) {
            setExpandedSections(prev => [...prev, destSection.id]);
            // Đợi một chút để section mở ra trước khi thực hiện drop
            setTimeout(() => {
                performDrop(sourceSection, destSection, source, destination);
            }, 100);
        } else {
            performDrop(sourceSection, destSection, source, destination);
        }
    };

    const performDrop = (sourceSection, destSection, source, destination) => {
        if (source.droppableId === destination.droppableId) {
            const tasks = [...sourceSection.tasks];
            const [removed] = tasks.splice(source.index, 1);
            tasks.splice(destination.index, 0, removed);
            
            setSections(sections.map(s => 
                s.id.toString() === source.droppableId ? { ...s, tasks } : s
            ));
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
    };

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
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                bgcolor: '#f8f9fa'
            }}>
                {/* Header */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2,
                    bgcolor: 'white',
                    p: 2.5,
                    borderRadius: '12px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <Typography 
                        variant="h4" 
                        component="h1" 
                        sx={{ 
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
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
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(6,3,141,0.2)'
                            },
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(6,3,141,0.15)',
                            borderRadius: '8px',
                            px: 3,
                            py: 1
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
                        gap: 3,
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
                            background: '#f1f1f1',
                            borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#888',
                            borderRadius: '4px',
                            '&:hover': {
                                background: '#555'
                            }
                        }
                    }}
                >
                    {sections.map((section) => (
                        <Box
                            key={section.id}
                            sx={{
                                flex: 1,
                                minWidth: '320px',
                                maxWidth: '380px',
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
                                    p: 2,
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    borderLeft: `4px solid ${section.color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                                    }
                                }}
                            >
                                <Typography 
                                    variant="h6" 
                                    component="div" 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        color: '#1a237e'
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
                                        borderRadius: '6px'
                                    }}
                                />
                            </Box>
                            <Droppable droppableId={section.id.toString()}>
                                {(provided, snapshot) => (
                                    <List 
                                        sx={{ 
                                            flex: 1,
                                            bgcolor: 'white',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            p: 1.5,
                                            overflow: 'auto',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            '&::-webkit-scrollbar': {
                                                width: '6px'
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: '#f1f1f1',
                                                borderRadius: '3px'
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                background: '#888',
                                                borderRadius: '3px',
                                                '&:hover': {
                                                    background: '#555'
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
                                                            bgcolor: snapshot.isDragging ? 'rgba(0,0,0,0.04)' : 'inherit',
                                                            transition: 'all 0.2s ease',
                                                            transform: snapshot.isDragging ? 'scale(1.02)' : 'none',
                                                            boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                                            borderRadius: '8px',
                                                            mb: 1.5,
                                                            p: 1.5,
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
                                                                        fontSize: '0.95rem',
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
                                                                        '&:hover': {
                                                                            color: 'primary.main',
                                                                            bgcolor: 'rgba(0,0,0,0.04)'
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
                                                                        '&:hover': {
                                                                            color: 'error.main',
                                                                            bgcolor: 'rgba(244,67,54,0.04)'
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
                                                bgcolor: snapshot.isDraggingOver ? 'rgba(0, 0, 0, 0.02)' : 'inherit',
                                                transition: 'background-color 0.2s ease',
                                                position: 'relative',
                                                zIndex: snapshot.isDraggingOver ? 1 : 0,
                                                borderRadius: '8px',
                                                border: '1px dashed rgba(0,0,0,0.1)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0,0,0,0.02)',
                                                    borderColor: 'primary.main'
                                                }
                                            }}
                                        >
                                            <Button
                                                startIcon={<AddIcon />}
                                                onClick={() => handleAddTask(section.id)}
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': {
                                                        color: 'primary.main',
                                                        bgcolor: 'rgba(0,0,0,0.02)'
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
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
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </DragDropContext>
    );
};

export default TsWorkspace;
