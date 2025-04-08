import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Checkbox,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Alert,
    Snackbar,
    Chip
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';

const sections = [
    {
        id: 1,
        title: 'Check-in',
        color: '#4CAF50', // Xanh lá - thể hiện bắt đầu ngày
        tasks: [
            { id: 1, title: 'Check-in CRM', completed: false, priority: 'high', dueDate: new Date().toISOString().split('T')[0] }
        ]
    },
    {
        id: 2,
        title: 'Customer Support',
        color: '#E91E63', // Hồng - cần phản hồi khách hàng gấp
        tasks: [
            { 
                id: 3, 
                title: 'Shopify App Installation Issue - Store ABC', 
                completed: false, 
                priority: 'high', 
                dueDate: '2024-03-20',
                customer: 'Store ABC',
                waitingTime: '2h',
                ticketId: 'TIC-123'
            },
            { 
                id: 4, 
                title: 'API Integration Question - Store XYZ', 
                completed: false, 
                priority: 'high', 
                dueDate: '2024-03-20',
                customer: 'Store XYZ',
                waitingTime: '1h',
                ticketId: 'TIC-124'
            }
        ]
    },
    {
        id: 3,
        title: 'Follow Up',
        color: '#FF9800', // Cam - cần theo dõi
        tasks: [
            { id: 5, title: 'Follow up with team A about API integration', completed: false, priority: 'high', dueDate: '2024-03-22' },
            { id: 6, title: 'Check progress on UI improvements', completed: false, priority: 'medium', dueDate: '2024-03-23' }
        ]
    },
    {
        id: 4,
        title: 'Pending',
        color: '#F44336', // Đỏ - đang chờ, có thể bị block
        tasks: [
            { id: 7, title: 'Waiting for client feedback', completed: false, priority: 'medium', dueDate: '2024-03-25' },
            { id: 8, title: 'Blocked by dependency update', completed: false, priority: 'high', dueDate: '2024-03-24' }
        ]
    },
    {
        id: 5,
        title: 'In Progress',
        color: '#2196F3', // Xanh dương - đang làm
        tasks: [
            { id: 9, title: 'Implementing new feature', completed: false, priority: 'high', dueDate: '2024-03-21' },
            { id: 10, title: 'Code review PR #456', completed: false, priority: 'medium', dueDate: '2024-03-21' }
        ]
    },
    {
        id: 6,
        title: 'Completed',
        color: '#4CAF50', // Xanh lá - đã hoàn thành
        tasks: [
            { id: 11, title: 'Fix login bug', completed: true, priority: 'high', dueDate: '2024-03-19' },
            { id: 12, title: 'Update documentation', completed: true, priority: 'low', dueDate: '2024-03-18' }
        ]
    },
    {
        id: 7,
        title: 'Check-out',
        color: '#9C27B0', // Tím - kết thúc ngày
        tasks: [
            { id: 13, title: 'Update daily report', completed: false, priority: 'high', dueDate: '2024-03-20' },
            { id: 14, title: 'Plan tomorrow tasks', completed: false, priority: 'high', dueDate: '2024-03-20' }
        ]
    }
];

const priorityColors = {
    high: '#f44336',    // Đỏ cho ưu tiên cao
    medium: '#ff9800',  // Cam cho ưu tiên trung bình
    low: '#4caf50'      // Xanh cho ưu tiên thấp
};

const TsWorkspace = () => {
    const [expandedSection, setExpandedSection] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Kiểm tra xem section Check-in đã hoàn thành chưa
    const isCheckInCompleted = () => {
        const checkInSection = sections.find(s => s.title === 'Check-in');
        return checkInSection.tasks.every(task => task.completed);
    };

    const handleSectionChange = (sectionId) => {
        const targetSection = sections.find(s => s.id === sectionId);
        
        // Nếu là section Check-in hoặc Check-in đã hoàn thành, cho phép mở
        if (targetSection.title === 'Check-in' || isCheckInCompleted()) {
            setExpandedSection(expandedSection === sectionId ? null : sectionId);
        } else {
            // Hiển thị thông báo nếu chưa hoàn thành Check-in
            setSnackbar({
                open: true,
                message: 'Vui lòng hoàn thành Check-in trước khi thực hiện các công việc khác',
                severity: 'warning'
            });
        }
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

    const renderTaskSecondary = (task) => {
        return (
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {task.customer && (
                    <Chip
                        label={task.customer}
                        size="small"
                        sx={{
                            bgcolor: '#E91E6320',
                            color: '#E91E63',
                            fontWeight: 'medium'
                        }}
                    />
                )}
                {task.waitingTime && (
                    <Chip
                        label={`Waiting: ${task.waitingTime}`}
                        size="small"
                        sx={{
                            bgcolor: '#F4433620',
                            color: '#F44336',
                            fontWeight: 'medium'
                        }}
                    />
                )}
                {task.ticketId && (
                    <Chip
                        label={task.ticketId}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(0,0,0,0.08)',
                            fontWeight: 'medium'
                        }}
                    />
                )}
                <Chip
                    label={task.priority}
                    size="small"
                    sx={{
                        bgcolor: `${priorityColors[task.priority]}20`,
                        color: priorityColors[task.priority],
                        fontWeight: 'medium'
                    }}
                />
                <Chip
                    label={task.dueDate}
                    size="small"
                    sx={{ bgcolor: 'rgba(0,0,0,0.08)' }}
                />
            </Box>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 4 
            }}>
                <Typography 
                    variant="h4" 
                    component="h1" 
                    sx={{ 
                        fontWeight: 'bold',
                        color: '#06038D'
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
                        }
                    }}
                >
                    Thêm công việc mới
                </Button>
            </Box>

            {/* Sections */}
            {sections.map((section) => (
                <Accordion
                    key={section.id}
                    expanded={expandedSection === section.id}
                    onChange={() => handleSectionChange(section.id)}
                    sx={{
                        mb: 2,
                        borderRadius: '8px !important',
                        '&:before': {
                            display: 'none',
                        },
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        // Thêm style cho disabled state
                        opacity: section.title !== 'Check-in' && !isCheckInCompleted() ? 0.7 : 1,
                        pointerEvents: section.title !== 'Check-in' && !isCheckInCompleted() ? 'none' : 'auto',
                        '&:hover': {
                            cursor: section.title !== 'Check-in' && !isCheckInCompleted() ? 'not-allowed' : 'pointer'
                        }
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                            borderLeft: `4px solid ${section.color}`,
                            borderRadius: '8px',
                            '&.Mui-expanded': {
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                            }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {section.title}
                            </Typography>
                            <Chip 
                                label={`${section.tasks.filter(t => t.completed).length}/${section.tasks.length}`}
                                size="small"
                                sx={{ 
                                    bgcolor: 'rgba(0,0,0,0.08)',
                                    fontWeight: 'medium'
                                }}
                            />
                            {section.title === 'Customer Support' && (
                                <Chip 
                                    label="Urgent"
                                    size="small"
                                    sx={{ 
                                        bgcolor: '#E91E6320',
                                        color: '#E91E63',
                                        fontWeight: 'medium'
                                    }}
                                />
                            )}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <List sx={{ width: '100%' }}>
                            {section.tasks.map((task) => (
                                <ListItem
                                    key={task.id}
                                    sx={{
                                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                                        '&:last-child': {
                                            borderBottom: 'none'
                                        },
                                        '&:hover': {
                                            bgcolor: 'rgba(0,0,0,0.02)'
                                        }
                                    }}
                                >
                                    <ListItemIcon>
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
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography
                                                sx={{
                                                    textDecoration: task.completed ? 'line-through' : 'none',
                                                    color: task.completed ? 'text.secondary' : 'text.primary'
                                                }}
                                            >
                                                {task.title}
                                            </Typography>
                                        }
                                        secondary={renderTaskSecondary(task)}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton 
                                            edge="end" 
                                            onClick={() => handleEditTask(section.id, task.id)}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            edge="end" 
                                            onClick={() => handleDeleteTask(section.id, task.id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                            <ListItem
                                sx={{
                                    justifyContent: 'center',
                                    py: 1
                                }}
                            >
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => handleAddTask(section.id)}
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Thêm công việc
                                </Button>
                            </ListItem>
                        </List>
                    </AccordionDetails>
                </Accordion>
            ))}

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
    );
};

export default TsWorkspace;
