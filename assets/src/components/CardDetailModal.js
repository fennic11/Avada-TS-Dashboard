import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Modal, Box, Typography, CircularProgress, Chip,
    Link, Stack, IconButton, Tooltip,
    MenuItem, Select, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Button, Paper,
    TextField, List, ListItem, ListItemText, Avatar,
    Divider, Tabs, Tab, Snackbar, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import LabelIcon from '@mui/icons-material/Label';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ImageIcon from '@mui/icons-material/Image';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import {
    getActionsByCard,
    removeMemberByID,
    addMemberByID,
    moveCardToList,
    removeLabelByID,
    addLabelByID,
    addCommentToCard,
    addAttachmentToCard
} from '../api/trelloApi';
import members from '../data/members.json';
import lists from '../data/listsId.json';
import labels from '../data/labels.json';
import CardActivityHistory from './CardActivityHistory';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from '../firebase/firebase';
import { calculateResolutionTime } from '../utils/resolutionTime';
import { searchArticles } from '../api/notionApi';
import { storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Label color mapping
const LABEL_COLORS = {
    'Bug': '#E53935', // Red
    'Feature': '#43A047', // Green
    'Enhancement': '#1E88E5', // Blue
    'Documentation': '#8E24AA', // Purple
    'Question': '#FB8C00', // Orange
    'High Priority': '#D32F2F', // Dark Red
    'Medium Priority': '#F57C00', // Dark Orange
    'Low Priority': '#388E3C', // Dark Green
    'In Progress': '#1976D2', // Dark Blue
    'Blocked': '#C62828', // Darker Red
    'Need Review': '#7B1FA2', // Dark Purple
    'Ready': '#2E7D32', // Forest Green
    'Testing': '#0277BD', // Ocean Blue
    'Done': '#2E7D32', // Forest Green
    'Won\'t Fix': '#757575', // Grey
    'Duplicate': '#616161', // Dark Grey
    'Invalid': '#424242', // Darker Grey
    'Help Wanted': '#00695C', // Teal
    'Good First Issue': '#00897B', // Light Teal
    'Discussion': '#5E35B1', // Deep Purple
    // Default color for any other label
    'default': '#0079BF'
};

// Function to get color based on label name
const getLabelColor = (labelName) => {
    // Try to find exact match
    if (LABEL_COLORS[labelName]) {
        return LABEL_COLORS[labelName];
    }
    
    // Try to find partial match
    const partialMatch = Object.keys(LABEL_COLORS).find(key => 
        labelName.toLowerCase().includes(key.toLowerCase())
    );
    
    return partialMatch ? LABEL_COLORS[partialMatch] : LABEL_COLORS.default;
};

const CardDetailModal = ({ open, onClose, card }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState([]);
    const [newAgentId, setNewAgentId] = useState('');
    const [newLabelId, setNewLabelId] = useState('');
    const [currentListId, setCurrentListId] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [commentContent, setCommentContent] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [notionQuery, setNotionQuery] = useState('');
    const [notionResults, setNotionResults] = useState([]);
    const [notionLoading, setNotionLoading] = useState(false);
    const [timingData, setTimingData] = useState({
        resolutionTime: null,
        TSResolutionTime: null,
        firstActionTime: null
    });
    const [imageUpload, setImageUpload] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' // 'success' | 'error' | 'warning' | 'info'
    });
    const [lastUpdateTime, setLastUpdateTime] = useState(null);
    const [lastActionId, setLastActionId] = useState(null);

    const safeCard = useMemo(() => {
        if (!card) return null;
        return {
            id: card.id || '',
            name: card.name || '',
            desc: card.desc || '',
            idMembers: card.idMembers || [],
            idList: card.idList || '',
            labels: card.labels || [],
            due: card.due || null,
            shortUrl: card.shortUrl || '',
            badges: card.badges || {},
            dateLastActivity: card.dateLastActivity || new Date().toISOString(),
            section: card.section || { id: '', name: 'Unknown' },
            ...card
        };
    }, [card]);

    const extractLinksFromDescription = useCallback((desc) => {
        if (!desc) return { shopUrl: '', crispUrl: '' };
        
        // Updated patterns to be more flexible
        const shopUrlPattern = /(shop url|shop|store url|store):\s*(https?:\/\/[^\s\n]+)/i;
        const crispUrlPattern = /(crisp chat url|crisp url|chat url|chat):\s*(https?:\/\/[^\s\n]+)/i;
        
        const shopMatch = desc.match(shopUrlPattern);
        const crispMatch = desc.match(crispUrlPattern);
        
        return {
            shopUrl: shopMatch ? shopMatch[2] : '',
            crispUrl: crispMatch ? crispMatch[2] : ''
        };
    }, []);

    const { shopUrl, crispUrl } = useMemo(() => {
        return extractLinksFromDescription(safeCard?.desc);
    }, [safeCard?.desc, extractLinksFromDescription]);

    const handleNotionSearch = useCallback(async (query = notionQuery) => {
        if (!query) return;
        
        setNotionLoading(true);
        try {
            const results = await searchArticles(query);
            setNotionResults(results);
        } catch (error) {
            console.error('Error searching Notion:', error);
            setNotionResults([]);
        } finally {
            setNotionLoading(false);
        }
    }, [notionQuery]);

    useEffect(() => {
        if (!open || !card) return;

        const fetchActions = async () => {
            setLoading(true);
            try {
                const result = await getActionsByCard(card.id);
                const timing = calculateResolutionTime(result);
                
                // Update timing data state
                setTimingData(timing || {
                    resolutionTime: null,
                    TSResolutionTime: null,
                    firstActionTime: null
                });
                
                setActions(result);
            } catch (err) {
                console.error('Error fetching actions:', err);
                setTimingData({
                    resolutionTime: null,
                    TSResolutionTime: null,
                    firstActionTime: null
                });
            } finally {
                setLoading(false);
            }
        };

        fetchActions();
        
        // Update agents with full member data
        const assigned = card.idMembers.map(id => {
            const member = members.find(m => m.id === id);
            if (!member) return null;
            
            // Ensure we have the correct avatar URL
            const avatarUrl = member.avatarUrl || member.avatarHash ? 
                `https://trello-members.s3.amazonaws.com/${member.id}/${member.avatarHash}/170.png` : 
                null;
            
            return {
                id: member.id,
                fullName: member.fullName,
                initials: member.initials,
                avatarUrl: avatarUrl
            };
        }).filter(Boolean);
        
        setAgents(assigned);
        setCurrentListId(card.idList);
    }, [open, card]);

    const availableAgents = members.filter(m => !agents.some(a => a.id === m.id));
    const availableLabels = card?.labels
        ? labels.filter(l => !card.labels.some(ex => ex.id === l.id))
        : [];

    // Enhance labels with colors
    const enhancedLabels = useMemo(() => {
        if (!safeCard?.labels) return [];
        return safeCard.labels.map(label => ({
            ...label,
            color: getLabelColor(label.name)
        }));
    }, [safeCard?.labels]);

    const handleRemoveMember = (memberId) => {
        const member = agents.find(a => a.id === memberId);
        setConfirmAction({
            message: `Xoá agent "${member.fullName}" khỏi card?`,
            onConfirm: async () => {
                await removeMemberByID(card.id, memberId);
                setAgents(prev => prev.filter(a => a.id !== memberId));
            }
        });
        setConfirmOpen(true);
    };

    const handleAddMember = () => {
        const member = members.find(m => m.id === newAgentId);
        setConfirmAction({
            message: `Thêm agent "${member.fullName}" vào card?`,
            onConfirm: async () => {
                await addMemberByID(card.id, newAgentId);
                setAgents(prev => [...prev, member]);
                setNewAgentId('');
            }
        });
        setConfirmOpen(true);
    };

    const handleReviewed = async () => {
        if (!actions || actions.length === 0 || !timingData.resolutionTime) return;

        const firstAction = actions[actions.length - 1];
        const createdAt = new Date(firstAction.date);

        const labelNames = card.labels?.map(l => l.name).join(', ') || 'No label';

        const dataToSave = {
            cardId: card.id,
            cardName: card.name,
            label: labelNames,
            resolutionTime: timingData.resolutionTime,
            TSResolutionTime: timingData.TSResolutionTime,
            firstActionTime: timingData.firstActionTime,
            createdAt
        };

        console.log("📝 Saving to Firebase:", dataToSave);

        try {
            const q = query(collection(db, "resolutionTimes"), where("cardId", "==", card.id));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return;
            }

            await addDoc(collection(db, "resolutionTimes"), dataToSave);
        } catch (err) {
            console.error("❌ Firebase save error:", err);
        }
    };

    const handleRemoveLabel = (label) => {
        setConfirmAction({
            message: `Xoá label "${label.name}" khỏi card?`,
            onConfirm: async () => {
                await removeLabelByID(card.id, label.id);
                card.labels = card.labels.filter(l => l.id !== label.id);
            }
        });
        setConfirmOpen(true);
    };

    const handleAddLabel = async () => {
        try {
            const label = labels.find(l => l.id === newLabelId);
            await addLabelByID(card.id, newLabelId);
            card.labels.push(label); // Cập nhật UI
            setNewLabelId('');
        } catch (err) {
            console.error('Failed to add label:', err);
        }
    };

    const handleMoveList = (newListId) => {
        const newList = lists.find(l => l.id === newListId);
        setConfirmAction({
            message: `Chuyển card sang list "${newList.name}"?`,
            onConfirm: async () => {
                await moveCardToList(card.id, newListId);
                setCurrentListId(newListId);
            }
        });
        setConfirmOpen(true);
    };

    const handleImageUpload = async () => {
        if (!imageUpload) return;
        
        try {
            const formData = new FormData();
            formData.append('file', imageUpload);
            
            await addAttachmentToCard(card.id, formData);
            return true;
        } catch (error) {
            console.error('Error uploading image:', error);
            return false;
        }
    };

    const handleAddComment = async () => {
        if (!commentContent.trim()) return;

        setCommentLoading(true);
        try {
            if (imageUpload) {
                await handleImageUpload();
            }

            await addCommentToCard(card.id, commentContent.trim());
            setCommentContent('');
            setImageUpload(null);

            // Load lại actions để hiển thị comment mới
            const updatedActions = await getActionsByCard(card.id);
            setActions(updatedActions);
        } catch (err) {
            console.error('Failed to add comment:', err);
        } finally {
            setCommentLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (confirmAction?.onConfirm) {
            await confirmAction.onConfirm();
        }
        setConfirmOpen(false);
        setConfirmAction(null);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        await addAttachmentToCard(card.id, formData);
                        
                        // Load lại actions để hiển thị ảnh mới
                        const updatedActions = await getActionsByCard(card.id);
                        setActions(updatedActions);

                        // Hiển thị thông báo thành công
                        setSnackbar({
                            open: true,
                            message: 'Ảnh đã được upload thành công',
                            severity: 'success'
                        });
                    } catch (error) {
                        console.error('Error uploading pasted image:', error);
                        // Hiển thị thông báo lỗi
                        setSnackbar({
                            open: true,
                            message: 'Có lỗi xảy ra khi upload ảnh',
                            severity: 'error'
                        });
                    }
                }
            }
        }
    };

    // Hàm kiểm tra comment mới
    const checkForNewComments = async () => {
        if (!card?.id || !open) return;

        try {
            const currentActions = await getActionsByCard(card.id);
            
            // Nếu có action mới
            if (currentActions.length > 0 && currentActions[0].id !== lastActionId) {
                setActions(currentActions);
                setLastActionId(currentActions[0].id);
                
                // Chỉ hiển thị thông báo nếu action mới là comment
                if (currentActions[0].type === 'commentCard') {
                    setSnackbar({
                        open: true,
                        message: 'Có comment mới',
                        severity: 'info'
                    });
                }
            }
        } catch (error) {
            console.error('Error checking for new comments:', error);
        }
    };

    // Bắt đầu polling khi modal mở
    useEffect(() => {
        if (open && card?.id) {
            // Lấy actions ban đầu và set lastActionId
            const fetchInitialActions = async () => {
                try {
                    const initialActions = await getActionsByCard(card.id);
                    setActions(initialActions);
                    if (initialActions.length > 0) {
                        setLastActionId(initialActions[0].id);
                    }
                } catch (error) {
                    console.error('Error fetching initial actions:', error);
                }
            };
            
            fetchInitialActions();
            
            // Bắt đầu polling
            const interval = setInterval(checkForNewComments, 2000); // Kiểm tra mỗi 2 giây
            
            return () => {
                clearInterval(interval);
            };
        }
    }, [open, card?.id]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: // Details & Comments
                return (
                    <Stack spacing={3}>
                        {/* Description */}
                        <Box>
                            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DescriptionIcon fontSize="small" />
                                Description
                            </Typography>
                            <Paper variant="outlined" sx={{ 
                                p: 2.5,
                                borderRadius: 1.5,
                                borderColor: 'rgba(0, 0, 0, 0.12)',
                                bgcolor: '#ffffff',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                                }
                            }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={10}
                                    value={card.desc || ''}
                                    onChange={(e) => {
                                        // Handle content change
                                    }}
                                    onPaste={handlePaste}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: 'rgba(0, 0, 0, 0.12)',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                />
                            </Paper>
                        </Box>

                        {/* Attachments Section */}
                        {safeCard.attachments && safeCard.attachments.length > 0 && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ImageIcon fontSize="small" />
                                    Attachments
                                </Typography>
                                <Paper variant="outlined" sx={{ 
                                    p: 2,
                                    borderRadius: 1.5,
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    bgcolor: '#ffffff'
                                }}>
                                    <Stack spacing={2}>
                                        {safeCard.attachments.map((attachment, index) => {
                                            // Check if the attachment is an image
                                            const isImage = attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                                                          attachment.mimeType?.startsWith('image/');
                                            
                                            if (!isImage) return null;

                                            return (
                                                <Box 
                                                    key={attachment.id || index}
                                                    sx={{
                                                        position: 'relative',
                                                        '&:hover .image-overlay': {
                                                            opacity: 1
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src={attachment.url}
                                                        alt={attachment.name || 'Attachment'}
                                                        sx={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            maxHeight: 400,
                                                            objectFit: 'contain',
                                                            borderRadius: 1,
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => window.open(attachment.url, '_blank')}
                                                    />
                                                    <Box
                                                        className="image-overlay"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s',
                                                            borderRadius: 1
                                                        }}
                                                    >
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={() => window.open(attachment.url, '_blank')}
                                                            startIcon={<ImageIcon />}
                                                        >
                                                            View Full Size
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                </Paper>
                            </Box>
                        )}

                        {/* Comments Section */}
                        <Box>
                            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ChatIcon fontSize="small" />
                                Comments
                            </Typography>
                            <Stack spacing={2}>
                                <Paper variant="outlined" sx={{ 
                                    p: 2.5,
                                    borderRadius: 1.5,
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    bgcolor: '#ffffff',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                                    }
                                }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        onPaste={handlePaste}
                                        placeholder="Add a comment..."
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'primary.main',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: 'primary.main',
                                                },
                                            },
                                        }}
                                    />
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mt: 2
                                    }}>
                                        <Button
                                            component="label"
                                            variant="outlined"
                                            startIcon={<ImageIcon />}
                                            sx={{ 
                                                textTransform: 'none',
                                                fontWeight: 500
                                            }}
                                        >
                                            Upload Image
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => setImageUpload(e.target.files[0])}
                                            />
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={handleAddComment}
                                            disabled={commentLoading || !commentContent.trim()}
                                            startIcon={commentLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                minWidth: '120px'
                                            }}
                                        >
                                            {commentLoading ? 'Sending...' : 'Comment'}
                                        </Button>
                                    </Box>
                                </Paper>
                                <CardActivityHistory actions={actions} />
                            </Stack>
                        </Box>
                    </Stack>
                );

            case 1: // Documentation
                return (
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SearchIcon fontSize="small" />
                                Search Documentation
                            </Typography>
                            <Paper variant="outlined" sx={{ 
                                p: 2.5,
                                borderRadius: 1.5,
                                borderColor: 'rgba(0, 0, 0, 0.12)',
                                bgcolor: '#ffffff',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                            }}>
                                <Stack spacing={2}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        gap: 1,
                                        alignItems: 'center'
                                    }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Tìm kiếm tài liệu..."
                                            value={notionQuery}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setNotionQuery(newValue);
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <SearchIcon color="action" sx={{ mr: 1 }} />
                                                ),
                                                endAdornment: notionLoading && (
                                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                                )
                                            }}
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': {
                                                        borderColor: 'rgba(0, 0, 0, 0.23)',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'primary.main',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: 'primary.main',
                                                    },
                                                },
                                                '& .MuiInputBase-input': {
                                                    cursor: 'text',
                                                    '&:focus': {
                                                        cursor: 'text',
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={() => handleNotionSearch()}
                                            disabled={notionLoading || !notionQuery}
                                            sx={{
                                                minWidth: '100px',
                                                textTransform: 'none',
                                                fontWeight: 500
                                            }}
                                        >
                                            Tìm kiếm
                                        </Button>
                                    </Box>
                                    {notionResults.length > 0 && (
                                        <List sx={{ 
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            maxHeight: '400px',
                                            overflow: 'auto'
                                        }}>
                                            {notionResults.map((article) => (
                                                <ListItem
                                                    key={article.id}
                                                    component={Link}
                                                    href={article.url}
                                                    target="_blank"
                                                    divider
                                                    sx={{
                                                        display: 'block',
                                                        py: 2,
                                                        '&:hover': {
                                                            bgcolor: 'action.hover',
                                                            cursor: 'pointer'
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                            {article.properties.title || article.title}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(article.lastEdited).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" sx={{ 
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {article.preview}
                                                    </Typography>
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                    {notionQuery && !notionLoading && notionResults.length === 0 && (
                                        <Box sx={{ 
                                            textAlign: 'center', 
                                            py: 4,
                                            bgcolor: 'background.default',
                                            borderRadius: 1
                                        }}>
                                            <SearchIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                            <Typography color="text.secondary">
                                                Không tìm thấy kết quả cho "{notionQuery}"
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                Hãy thử từ khóa khác hoặc kiểm tra lại chính tả
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        </Box>
                    </Stack>
                );

            default:
                return null;
        }
    };

    if (!safeCard) {
        return null;
    }

    const renderSidebarField = (icon, label, content) => (
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ py: 1 }}>
            <Box sx={{ color: 'text.secondary', pt: 0.5 }}>{icon}</Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {label}
                </Typography>
                {content}
            </Box>
        </Stack>
    );

    const renderResolutionTimes = () => (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon fontSize="small" />
                Resolution Times
            </Typography>
            <Stack spacing={2}>
                <Paper variant="outlined" sx={{ 
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: '#ffffff',
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}>
                    <Stack spacing={1.5}>
                        {/* Total Resolution Time */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                Total Resolution Time
                            </Typography>
                            <Typography 
                                variant="subtitle1" 
                                fontWeight="medium" 
                                color={timingData.resolutionTime > 120 ? 'error.main' : 'success.main'}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                                {timingData.resolutionTime != null ? (
                                    <>
                                        <AccessTimeIcon fontSize="small" />
                                        {Math.floor(timingData.resolutionTime / 60)}h {timingData.resolutionTime % 60}m
                                    </>
                                ) : 'N/A'}
                            </Typography>
                        </Box>

                        {/* TS Resolution Time */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                TS Resolution Time
                            </Typography>
                            <Typography 
                                variant="subtitle1" 
                                fontWeight="medium" 
                                color={timingData.TSResolutionTime > 60 ? 'error.main' : 'success.main'}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                                {timingData.TSResolutionTime != null ? (
                                    <>
                                        <AccessTimeIcon fontSize="small" />
                                        {Math.floor(timingData.TSResolutionTime / 60)}h {timingData.TSResolutionTime % 60}m
                                    </>
                                ) : 'N/A'}
                            </Typography>
                        </Box>

                        {/* First Action Time */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                First Action Time
                            </Typography>
                            <Typography 
                                variant="subtitle1" 
                                fontWeight="medium" 
                                color={timingData.firstActionTime > 30 ? 'error.main' : 'success.main'}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                                {timingData.firstActionTime != null ? (
                                    <>
                                        <AccessTimeIcon fontSize="small" />
                                        {Math.floor(timingData.firstActionTime / 60)}h {timingData.firstActionTime % 60}m
                                    </>
                                ) : 'N/A'}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* Review Button */}
                {!loading && timingData.resolutionTime != null && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleReviewed}
                        fullWidth
                        startIcon={<span>✅</span>}
                    >
                        Mark as Reviewed
                    </Button>
                )}
            </Stack>
        </Box>
    );

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Paper
                    elevation={24}
                    sx={{
                        width: '90vw',
                        maxWidth: 1200,
                        maxHeight: '90vh',
                        borderRadius: 2,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#ffffff',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ 
                        p: 2, 
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        background: 'linear-gradient(135deg, #f6f8fa 0%, #f1f4f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Typography variant="subtitle2" sx={{ 
                            color: 'primary.main',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            {safeCard.section?.name || 'Unknown Section'} 
                            <span style={{ color: '#94a3b8' }}>/</span> 
                            {lists.find(l => l.id === currentListId)?.name}
                        </Typography>
                        <IconButton 
                            size="small" 
                            onClick={onClose}
                            sx={{
                                ml: 'auto',
                                color: 'text.secondary',
                                '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    color: 'primary.main'
                                }
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Title & Tabs */}
                    <Box sx={{ 
                        background: 'linear-gradient(135deg, #f6f8fa 0%, #f1f4f7 100%)',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                    }}>
                        <Box sx={{ px: 3, pt: 2 }}>
                            <Typography variant="h5" gutterBottom sx={{ 
                                color: '#1e293b',
                                fontWeight: 600,
                                letterSpacing: '-0.01em'
                            }}>
                                {safeCard.name}
                            </Typography>
                        </Box>
                        <Tabs 
                            value={activeTab} 
                            onChange={(_, newValue) => setActiveTab(newValue)}
                            sx={{ 
                                px: 3,
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: '3px 3px 0 0',
                                    bgcolor: 'primary.main'
                                },
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.95rem',
                                    minHeight: 48,
                                    '&.Mui-selected': {
                                        color: 'primary.main'
                                    }
                                }
                            }}
                        >
                            <Tab label="Details" />
                            <Tab label="Documentation" />
                        </Tabs>
                    </Box>

                    {/* Main Content */}
                    <Box sx={{ 
                        display: 'flex', 
                        flex: 1,
                        overflow: 'hidden',
                        bgcolor: '#ffffff'
                    }}>
                        {/* Left Column */}
                        <Box sx={{ 
                            flex: 1,
                            overflowY: 'auto',
                            p: 3,
                            borderRight: '1px solid rgba(0, 0, 0, 0.08)'
                        }}>
                            {renderTabContent()}
                        </Box>

                        {/* Right Column - Sidebar */}
                        <Box sx={{ 
                            width: 300,
                            overflowY: 'auto',
                            p: 2.5,
                            bgcolor: '#f8fafc'
                        }}>
                            <Stack spacing={2.5} divider={<Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />}>
                                {/* Quick Links */}
                                {(shopUrl || crispUrl) && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                            Quick Links
                                        </Typography>
                                        <Stack spacing={1}>
                                            {shopUrl && (
                                                <Link
                                                    href={shopUrl}
                                                    target="_blank"
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        color: 'primary.main',
                                                        textDecoration: 'none',
                                                        p: 1,
                                                        borderRadius: 1,
                                                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(25, 118, 210, 0.12)',
                                                            transform: 'translateY(-1px)'
                                                        }
                                                    }}
                                                >
                                                    <Box component="span" sx={{ 
                                                        width: 24,
                                                        height: 24,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '50%',
                                                        bgcolor: 'primary.main',
                                                        color: 'white',
                                                        fontSize: '16px'
                                                    }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 3c0 .55.45 1 1 1h1l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h11c.55 0 1-.45 1-1s-.45-1-1-1H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A.996.996 0 0020.01 4H5.21l-.67-1.43a.993.993 0 00-.9-.57H2c-.55 0-1 .45-1 1zm16 15c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                                                        </svg>
                                                    </Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        View Shop
                                                    </Typography>
                                                </Link>
                                            )}
                                            {crispUrl && (
                                                <Link
                                                    href={crispUrl}
                                                    target="_blank"
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        color: '#00B884',
                                                        textDecoration: 'none',
                                                        p: 1,
                                                        borderRadius: 1,
                                                        bgcolor: 'rgba(0, 184, 132, 0.08)',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(0, 184, 132, 0.12)',
                                                            transform: 'translateY(-1px)'
                                                        }
                                                    }}
                                                >
                                                    <Box component="span" sx={{ 
                                                        width: 24,
                                                        height: 24,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '50%',
                                                        bgcolor: '#00B884',
                                                        color: 'white',
                                                        fontSize: '16px'
                                                    }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                                                        </svg>
                                                    </Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        View Chat
                                                    </Typography>
                                                </Link>
                                            )}
                                        </Stack>
                                    </Box>
                                )}

                                {/* Status */}
                                {renderSidebarField(
                                    <AccessTimeIcon fontSize="small" />,
                                    'Status',
                                    <Select
                                        size="small"
                                        fullWidth
                                        value={currentListId}
                                        onChange={(e) => handleMoveList(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(0, 0, 0, 0.12)'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'primary.main'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'primary.main'
                                            }
                                        }}
                                    >
                                        {lists.map(list => (
                                            <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
                                        ))}
                                    </Select>
                                )}

                                {/* Assignees */}
                                {renderSidebarField(
                                    <PersonIcon fontSize="small" />,
                                    'Assignees',
                                    <Stack spacing={1}>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {agents.map(agent => (
                                                <Chip
                                                    key={agent.id}
                                                    label={agent.fullName}
                                                    size="small"
                                                    onDelete={() => handleRemoveMember(agent.id)}
                                                    avatar={
                                                        <Avatar
                                                            src={agent.avatarUrl}
                                                            alt={agent.initials}
                                                            sx={{ 
                                                                width: 24, 
                                                                height: 24,
                                                                bgcolor: '#1976d2',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {agent.initials}
                                                        </Avatar>
                                                    }
                                                    sx={{
                                                        height: '28px',
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                        color: '#1976d2',
                                                        fontWeight: 500,
                                                        fontSize: '0.95rem',
                                                        border: '1px solid rgba(25, 118, 210, 0.1)',
                                                        '& .MuiChip-label': {
                                                            fontSize: '0.95rem',
                                                            lineHeight: 1.2
                                                        },
                                                        '& .MuiChip-deleteIcon': {
                                                            color: '#1976d2',
                                                            width: '16px',
                                                            height: '16px',
                                                            margin: '0 4px 0 -6px',
                                                            '&:hover': {
                                                                color: '#d32f2f',
                                                            }
                                                        },
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                        {availableAgents.length > 0 && (
                                            <Box
                                                sx={{
                                                    display: 'inline-flex',
                                                    position: 'relative',
                                                    height: '28px',
                                                    mt: -0.5
                                                }}
                                            >
                                                <Select
                                                    size="small"
                                                    value={newAgentId}
                                                    onChange={(e) => {
                                                        setNewAgentId(e.target.value);
                                                        if (e.target.value) {
                                                            handleAddMember();
                                                        }
                                                    }}
                                                    displayEmpty
                                                    variant="standard"
                                                    sx={{
                                                        '& .MuiSelect-select': {
                                                            py: 0,
                                                            px: 0,
                                                            width: '28px',
                                                            height: '28px',
                                                            minHeight: '28px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '1px solid rgba(0, 0, 0, 0.12)',
                                                            borderRadius: '14px',
                                                            bgcolor: '#ffffff',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                                                                borderColor: '#1976d2'
                                                            }
                                                        },
                                                        '&:before, &:after': { display: 'none' }
                                                    }}
                                                    renderValue={() => (
                                                        <Typography sx={{ 
                                                            fontSize: '1.25rem',
                                                            lineHeight: 1,
                                                            color: 'rgba(0, 0, 0, 0.54)',
                                                            fontWeight: 400
                                                        }}>
                                                            +
                                                        </Typography>
                                                    )}
                                                >
                                                    {availableAgents.map(agent => {
                                                        const avatarUrl = agent.avatarUrl || agent.avatarHash ? 
                                                            `https://trello-members.s3.amazonaws.com/${agent.id}/${agent.avatarHash}/170.png` : 
                                                            null;
                                                        
                                                        return (
                                                            <MenuItem 
                                                                key={agent.id} 
                                                                value={agent.id}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 1,
                                                                    py: 1
                                                                }}
                                                            >
                                                                <Avatar
                                                                    src={avatarUrl}
                                                                    alt={agent.initials}
                                                                    sx={{ 
                                                                        width: 24, 
                                                                        height: 24,
                                                                        bgcolor: '#1976d2',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    {agent.initials}
                                                                </Avatar>
                                                                <Typography variant="body2" sx={{ 
                                                                    fontSize: '0.95rem', 
                                                                    fontWeight: 500,
                                                                    color: 'text.primary'
                                                                }}>
                                                                    {agent.fullName}
                                                                </Typography>
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            </Box>
                                        )}
                                    </Stack>
                                )}

                                {/* Resolution Times */}
                                {renderResolutionTimes()}

                                {/* Labels */}
                                {renderSidebarField(
                                    <LabelIcon fontSize="small" />,
                                    'Labels',
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {enhancedLabels.map(label => (
                                                <Chip
                                                    key={label.id}
                                                    label={label.name}
                                                    size="small"
                                                    onDelete={() => handleRemoveLabel(label)}
                                                    sx={{
                                                        bgcolor: label.color,
                                                        color: 'white',
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem',
                                                        height: '24px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        '& .MuiChip-deleteIcon': {
                                                            color: 'rgba(255, 255, 255, 0.8)',
                                                            width: '16px',
                                                            height: '16px',
                                                            margin: '0 4px 0 -6px',
                                                            '&:hover': {
                                                                color: 'white'
                                                            }
                                                        },
                                                        '&:hover': {
                                                            bgcolor: label.color,
                                                            filter: 'brightness(90%)',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                        {availableLabels.length > 0 && (
                                            <Paper variant="outlined" sx={{ 
                                                bgcolor: '#ffffff',
                                                borderColor: 'rgba(0, 0, 0, 0.12)',
                                                borderStyle: 'dashed',
                                                '&:hover': {
                                                    borderColor: '#1976d2',
                                                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                                                }
                                            }}>
                                                <Select
                                                    size="small"
                                                    fullWidth
                                                    value={newLabelId}
                                                    onChange={(e) => {
                                                        setNewLabelId(e.target.value);
                                                        if (e.target.value) {
                                                            handleAddLabel();
                                                        }
                                                    }}
                                                    displayEmpty
                                                    variant="standard"
                                                    sx={{
                                                        '& .MuiSelect-select': {
                                                            py: 1,
                                                            px: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1
                                                        },
                                                        '&:before, &:after': { display: 'none' }
                                                    }}
                                                    renderValue={(value) => (
                                                        <Box sx={{ 
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            color: value ? '#1976d2' : 'rgba(0, 0, 0, 0.6)',
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            <AddIcon fontSize="small" />
                                                            {value ? labels.find(l => l.id === value)?.name : 'Add a label'}
                                                        </Box>
                                                    )}
                                                >
                                                    {availableLabels.map(label => {
                                                        const labelColor = getLabelColor(label.name);
                                                        return (
                                                            <MenuItem 
                                                                key={label.id} 
                                                                value={label.id}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 1,
                                                                    py: 1
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        width: 32,
                                                                        height: 4,
                                                                        borderRadius: 2,
                                                                        bgcolor: labelColor,
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                                    }}
                                                                />
                                                                <Typography variant="body2">
                                                                    {label.name}
                                                                </Typography>
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            </Paper>
                                        )}
                                    </Stack>
                                )}
                            </Stack>
                        </Box>
                    </Box>
                </Paper>
            </Modal>

            {/* Confirm Dialog */}
            <Dialog 
                open={confirmOpen} 
                onClose={() => setConfirmOpen(false)}
                PaperProps={{
                    sx: { 
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                    }
                }}
            >
                <DialogTitle>
                    Confirm Action
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {confirmAction?.message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} variant="contained" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar Notification */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default CardDetailModal;