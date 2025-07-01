import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Modal, Box, Typography, CircularProgress, Chip,
    Link, Stack, IconButton,
    MenuItem, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Button, Paper,
    TextField, List, ListItem, Avatar,
    Divider, Snackbar, Alert, Menu
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
    getActionsByCard,
    removeMemberByID,
    addMemberByID,
    moveCardToList,
    removeLabelByID,
    addLabelByID,
    addCommentToCard,
    addAttachmentToCard,
    getCardById,
    updateCardDueComplete
} from '../api/trelloApi';
import members from '../data/members.json';
import lists from '../data/listsId.json';
import labels from '../data/labels.json';
import CardActivityHistory from './CardActivityHistory';
import { calculateResolutionTime } from '../utils/resolutionTime';
import { searchArticles } from '../api/notionApi';
import { postCards } from '../api/cardsApi';
import { format, formatDistanceToNow } from 'date-fns';

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

const CardDetailModal = ({ open, onClose, cardId }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState([]);
    const [newAgentId, setNewAgentId] = useState('');
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
    const [lastCheckTime, setLastCheckTime] = useState(Date.now());
    const [card, setCard] = useState(null);
    const [createDate, setCreateDate] = useState(null);
    const [labelMenuAnchorEl, setLabelMenuAnchorEl] = useState(null);
    const [assigneeMenuAnchorEl, setAssigneeMenuAnchorEl] = useState(null);
    const [labelMenuOpen, setLabelMenuOpen] = useState(false);
    const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    // Add state for list search
    const [listSearch, setListSearch] = useState('');
    const [listMenuAnchorEl, setListMenuAnchorEl] = useState(null);
    const listMenuOpen = Boolean(listMenuAnchorEl);
    // Thêm state cho tìm kiếm label
    const [labelSearch, setLabelSearch] = useState('');

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
            attachments: card.attachments || [],
            ...card
        };
    }, [card]);

    const extractLinksFromDescription = useCallback((desc) => {
        if (!desc) return { shopUrl: '', crispUrl: '' };
        
        // Updated patterns to match both markdown-style links and direct URLs
        const shopUrlPatterns = [
            /\[(https:\/\/[^\/\]]+\.myshopify\.com)\]\([^\)]+\s*"smartCard-inline"\)/i,  // Markdown style
            /Shop URL:\s*(https:\/\/[^\/\s]+\.myshopify\.com)/i,  // Direct URL with "Shop URL:" prefix
            /(https:\/\/[^\/\s]+\.myshopify\.com)/i  // Direct myshopify URL
        ];

        const crispUrlPatterns = [
            /\[(https:\/\/app\.crisp\.chat\/[^\]]+)\]\([^\)]+\s*"smartCard-inline"\)/i,  // Markdown style
            /Crisp chat URL:\s*(https:\/\/app\.crisp\.chat\/[^\s]+)/i,  // Direct URL with "Crisp chat URL:" prefix
            /(https:\/\/app\.crisp\.chat\/website\/[^\/\s]+\/inbox\/session_[^\/\s]+)/i  // Direct crisp URL
        ];
        
        let shopUrl = '';
        let crispUrl = '';

        // Try each pattern for shop URL
        for (const pattern of shopUrlPatterns) {
            const match = desc.match(pattern);
            if (match) {
                shopUrl = match[1];
                break;
            }
        }

        // Try each pattern for crisp URL
        for (const pattern of crispUrlPatterns) {
            const match = desc.match(pattern);
            if (match) {
                crispUrl = match[1];
                break;
            }
        }
        
        return {
            shopUrl,
            crispUrl
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
        if (!open || !cardId) return;

        const fetchCardDetails = async () => {
            setLoading(true);
            try {
                // Fetch card details
                const cardData = await getCardById(cardId);
                
                if (cardData) {
                    setCard(cardData);
                    
                    // Update agents with new information
                    const assigned = cardData.idMembers.map(id => {
                        const member = members.find(m => m.id === id);
                        if (!member) return null;
                        
                        const avatarUrl = member.avatarUrl || member.avatarHash ? 
                            `https://trello-members.s3.amazonaws.com/${member.id}/${member.avatarHash}/170.png` : 
                            null;
                        
                        return {
                            id: member.id,
                            username: member.username,
                            fullName: member.fullName,
                            initials: member.initials,
                            avatarUrl: avatarUrl
                        };
                    }).filter(Boolean);
                    
                    setAgents(assigned);
                    setCurrentListId(cardData.idList);

                    // Fetch actions
                    const result = await getActionsByCard(cardId);
                    const timing = calculateResolutionTime(result);
                    
                    setTimingData(timing || {
                        resolutionTime: null,
                        TSResolutionTime: null,
                        firstActionTime: null
                    });
                    
                    setActions(result);

                    // Find createCard action to get creation date
                    const createCardAction = result.find(action => action.type === 'createCard');
                    if (createCardAction) {
                        setCreateDate(new Date(createCardAction.date));
                    }
                }
            } catch (error) {
                console.error('Error fetching card details:', error);
                setSnackbar({
                    open: true,
                    message: 'Error loading card details',
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchCardDetails();
    }, [open, cardId]);

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

    const handleAddMember = async () => {
        if (!newAgentId || !card?.id) {
            console.log('Missing required data:', { newAgentId, cardId: card?.id });
            return;
        }
        
        const member = members.find(m => m.id === newAgentId);
        if (!member) {
            setSnackbar({
                open: true,
                message: 'Member not found',
                severity: 'error'
            });
            return;
        }


        try {
            const result = await addMemberByID(card.id, newAgentId);
            
            const avatarUrl = member.avatarUrl || member.avatarHash ? 
                `https://trello-members.s3.amazonaws.com/${member.id}/${member.avatarHash}/170.png` : 
                null;
                
            const newMember = {
                id: member.id,
                username: member.username,
                fullName: member.fullName,
                initials: member.initials,
                avatarUrl: avatarUrl
            };

            setAgents(prev => [...prev, newMember]);
            setNewAgentId('');

            // Refresh card data to get updated members
            const updatedCard = await getCardById(card.id);
            if (updatedCard) {
                setCard(updatedCard);
            }

            setSnackbar({
                open: true,
                message: 'Member added successfully',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error adding member:', error);
            setSnackbar({
                open: true,
                message: 'Failed to add member: ' + error.message,
                severity: 'error'
            });
        }
    };

    // Update the Select component's onChange handler
    const handleAgentSelect = async (event) => {
        const selectedId = event.target.value;
        if (!selectedId) return;
        
        const member = members.find(m => m.id === selectedId);
        if (!member) {
            setSnackbar({
                open: true,
                message: 'Member not found',
                severity: 'error'
            });
            return;
        }

        try {
            const result = await addMemberByID(card.id, selectedId);
            
            const avatarUrl = member.avatarUrl || member.avatarHash ? 
                `https://trello-members.s3.amazonaws.com/${member.id}/${member.avatarHash}/170.png` : 
                null;
                
            const newMember = {
                id: member.id,
                username: member.username,
                fullName: member.fullName,
                initials: member.initials,
                avatarUrl: avatarUrl
            };

            setAgents(prev => [...prev, newMember]);
            
            // Refresh card data to get updated members
            const updatedCard = await getCardById(card.id);
            if (updatedCard) {
                setCard(updatedCard);
            }

            setSnackbar({
                open: true,
                message: 'Member added successfully',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error adding member:', error);
            setSnackbar({
                open: true,
                message: 'Failed to add member: ' + error.message,
                severity: 'error'
            });
        }
    };

    const handleReviewed = async () => {
        if (!actions || actions.length === 0 || !timingData.resolutionTime) return;

        const firstAction = actions[actions.length - 1];
        const createdAt = new Date(firstAction.date);

        const dataToSave = {
            cardId: card.id,
            cardName: card.name || "",
            cardUrl: card.shortUrl || `https://trello.com/c/${card.idShort}`,
            labels: card.labels?.map(l => l.name) || [],
            resolutionTime: timingData.resolutionTime,
            resolutionTimeTS: timingData.TSResolutionTime,
            firstActionTime: timingData.firstActionTime,
            members: card.idMembers || [],
            createdAt: createdAt
        };

        try {
            await postCards(dataToSave);
            setSnackbar({
                open: true,
                message: 'Card marked as reviewed successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error("❌ Error saving card:", err);
            setSnackbar({
                open: true,
                message: 'Failed to mark card as reviewed',
                severity: 'error'
            });
        }
    };

    const handleRemoveLabel = async (labelId) => {
        try {
            const label = card.labels.find(l => l.id === labelId);
            if (!label) {
                setSnackbar({
                    open: true,
                    message: 'Label not found on card',
                    severity: 'error'
                });
                return;
            }

            await removeLabelByID(card.id, labelId);
            
            // Cập nhật state đúng cách
            setCard(prevCard => ({
                ...prevCard,
                labels: prevCard.labels.filter(l => l.id !== labelId)
            }));

            setSnackbar({
                open: true,
                message: 'Label removed successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Failed to remove label:', err);
            setSnackbar({
                open: true,
                message: 'Failed to remove label: ' + err.message,
                severity: 'error'
            });
        }
    };

    const handleAddLabel = async (labelId) => {
        try {
            const label = labels.find(l => l.id === labelId);
            if (!label) {
                setSnackbar({
                    open: true,
                    message: 'Label not found',
                    severity: 'error'
                });
                return;
            }

            // Kiểm tra xem label đã tồn tại trên card chưa
            if (card.labels.some(l => l.id === labelId)) {
                setSnackbar({
                    open: true,
                    message: 'Label already exists on this card',
                    severity: 'warning'
                });
                return;
            }

            await addLabelByID(card.id, labelId);
            
            // Cập nhật state đúng cách
            setCard(prevCard => ({
                ...prevCard,
                labels: [...prevCard.labels, label]
            }));

            setLabelMenuOpen(false);
            setLabelMenuAnchorEl(null);
            setLabelSearch('');

            setSnackbar({
                open: true,
                message: 'Label added successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Failed to add label:', err);
            setSnackbar({
                open: true,
                message: 'Failed to add label: ' + err.message,
                severity: 'error'
            });
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
        for (let item of items) {
            if (item.type.indexOf('image') === 0) {
                const file = item.getAsFile();
                setImageUpload(file);
                break;
            }
        }
    };

    // Hàm kiểm tra comment mới
    const checkForNewComments = async () => {
        if (!card?.id || !open) return;

        try {
            const currentActions = await getActionsByCard(card.id);
            const currentTime = Date.now();
            
            // Nếu có action mới và là comment card
            if (currentActions.length > 0 && 
                currentActions[0].id !== lastActionId && 
                currentActions[0].type === 'commentCard' &&
                new Date(currentActions[0].date).getTime() > lastCheckTime) {
                
                setActions(currentActions);
                setLastActionId(currentActions[0].id);
                setLastCheckTime(currentTime);
                
                setSnackbar({
                    open: true,
                    message: 'Có comment mới',
                    severity: 'info'
                });
            } else if (currentActions.length > 0 && currentActions[0].id !== lastActionId) {
                // Cập nhật actions nhưng không hiển thị thông báo nếu không phải comment mới
                setActions(currentActions);
                setLastActionId(currentActions[0].id);
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
                        setLastCheckTime(Date.now());
                    }
                } catch (error) {
                    console.error('Error fetching initial actions:', error);
                }
            };
            
            fetchInitialActions();
            
            // Bắt đầu polling
            const interval = setInterval(checkForNewComments, 5000); // Kiểm tra mỗi 5 giây
            
            return () => {
                clearInterval(interval);
                setLastActionId(null);
                setLastCheckTime(Date.now());
            };
        }
    }, [open, card?.id]);

    const handleCopyLink = (url, type = 'link') => {
        navigator.clipboard.writeText(url);
        setSnackbar({
            open: true,
            message: `${type} copied to clipboard`,
            severity: 'success'
        });
    };

    const filteredAgents = useMemo(() => {
        if (!assigneeSearch) return availableAgents;
        return availableAgents.filter(agent => 
            agent.username?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
            agent.fullName?.toLowerCase().includes(assigneeSearch.toLowerCase())
        );
    }, [availableAgents, assigneeSearch]);

    const handleToggleComplete = async () => {
        try {
            const updatedCard = await updateCardDueComplete(card.id, !card.dueComplete);
            setCard(updatedCard);

            // Nếu đánh dấu là complete, tính resolution time
            if (!card.dueComplete) {  // Kiểm tra trạng thái trước khi thay đổi
                const currentActions = await getActionsByCard(card.id);
                const timing = calculateResolutionTime(currentActions);
                
                setTimingData(timing || {
                    resolutionTime: null,
                    TSResolutionTime: null,
                    firstActionTime: null
                });

                // Tự động lưu card review khi mark complete
                const firstAction = currentActions[currentActions.length - 1];
                const createdAt = new Date(firstAction.date);

                const dataToSave = {
                    cardId: card.id,
                    cardName: card.name || "",
                    cardUrl: card.shortUrl || `https://trello.com/c/${card.idShort}`,
                    labels: card.labels?.map(l => l.name) || [],
                    resolutionTime: timing?.resolutionTime || null,
                    resolutionTimeTS: timing?.TSResolutionTime || null,
                    firstActionTime: timing?.firstActionTime || null,
                    members: card.idMembers || [],
                    createdAt: createdAt
                };

                await postCards(dataToSave);
            }

            setSnackbar({
                open: true,
                message: `Card marked as ${updatedCard.dueComplete ? 'completed' : 'incomplete'}`,
                severity: 'success'
            });
        } catch (error) {
            console.error('Error updating card status:', error);
            setSnackbar({
                open: true,
                message: 'Failed to update card status',
                severity: 'error'
            });
        }
    };

    // Add filtered lists
    const filteredLists = useMemo(() => {
        if (!listSearch) return lists;
        return lists.filter(list => 
            list.name.toLowerCase().includes(listSearch.toLowerCase())
        );
    }, [lists, listSearch]);

    // Thêm hàm lọc labels
    const filteredLabels = useMemo(() => {
        if (!labelSearch) return availableLabels;
        return availableLabels.filter(label => 
            label.name.toLowerCase().includes(labelSearch.toLowerCase())
        );
    }, [availableLabels, labelSearch]);

    // Add function to render description with clickable links
    const renderDescriptionWithLinks = (text) => {
        if (!text) return '';
        
        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        // Split text by URLs and map to components
        const parts = text.split(urlRegex);
        
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <Link 
                        key={index} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        sx={{ 
                            color: 'primary.main',
                            textDecoration: 'underline',
                            '&:hover': {
                                color: 'primary.dark'
                            }
                        }}
                    >
                        {part}
                    </Link>
                );
            }
            return part;
        });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: // Details & Comments
                return (
                    <Stack spacing={3}>
                        {/* Description */}
                        <Box sx={{
                            bgcolor: '#ffffff',
                            p: 2,
                            borderRadius: '4px'
                        }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ 
                                color: '#1e293b',
                                fontWeight: 600,
                                fontSize: '1rem',
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                Description
                            </Typography>
                            <Box sx={{
                                p: 2,
                                borderRadius: '4px',
                                bgcolor: '#f5f5f5'
                            }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#333333',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {renderDescriptionWithLinks(card.desc || '')}
                                </Typography>
                            </Box>
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
                        <Box sx={{ mt: 3 }}>
                            <Paper 
                                variant="outlined"
                                sx={{ 
                                    p: 2.5,
                                    borderRadius: 1.5,
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    bgcolor: '#ffffff',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                                    }
                                }}
                            >
                                <Typography variant="subtitle1" gutterBottom sx={{ 
                                    color: '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    Comments
                                </Typography>
                                <Box
                                    component="div"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const files = Array.from(e.dataTransfer.files);
                                        const imageFile = files.find(file => file.type.startsWith('image/'));
                                        if (imageFile) {
                                            setImageUpload(imageFile);
                                        }
                                    }}
                                    sx={{
                                        position: 'relative',
                                        '&:focus-within': {
                                            '& .comment-actions': {
                                                opacity: 1,
                                                transform: 'translateY(0)',
                                                visibility: 'visible'
                                            }
                                        }
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        onPaste={handlePaste}
                                        placeholder="Write a comment... You can also paste or drag & drop images"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: '#f8fafc',
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
                                            '& .MuiOutlinedInput-input': {
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                            }
                                        }}
                                    />
                                    
                                    {/* Image Preview */}
                                    {imageUpload && (
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                mt: 2,
                                                p: 1,
                                                borderRadius: 1,
                                                borderColor: 'rgba(0, 0, 0, 0.12)',
                                                position: 'relative'
                                            }}
                                        >
                                            <Box sx={{ position: 'relative' }}>
                                                <Box
                                                    component="img"
                                                    src={URL.createObjectURL(imageUpload)}
                                                    alt="Upload preview"
                                                    sx={{
                                                        width: '100%',
                                                        maxHeight: '200px',
                                                        objectFit: 'contain',
                                                        borderRadius: 0.5
                                                    }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setImageUpload(null)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: -8,
                                                        right: -8,
                                                        bgcolor: 'background.paper',
                                                        boxShadow: 1,
                                                        '&:hover': {
                                                            bgcolor: 'error.light',
                                                            color: 'white'
                                                        }
                                                    }}
                                                >
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            <Typography 
                                                variant="caption" 
                                                color="text.secondary"
                                                sx={{ 
                                                    display: 'block',
                                                    mt: 0.5,
                                                    textAlign: 'center'
                                                }}
                                            >
                                                {imageUpload.name}
                                            </Typography>
                                        </Paper>
                                    )}

                                    {/* Comment Actions */}
                                    <Box 
                                        className="comment-actions"
                                        sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mt: 2,
                                            gap: 2,
                                            opacity: commentContent || imageUpload ? 1 : 0,
                                            transform: commentContent || imageUpload ? 'translateY(0)' : 'translateY(10px)',
                                            transition: 'all 0.2s ease-in-out',
                                            visibility: commentContent || imageUpload ? 'visible' : 'hidden'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                startIcon={<ImageIcon />}
                                                sx={{ 
                                                    textTransform: 'none',
                                                    fontWeight: 500,
                                                    color: 'text.secondary',
                                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                                    '&:hover': {
                                                        borderColor: 'primary.main',
                                                        bgcolor: 'rgba(25, 118, 210, 0.04)'
                                                    }
                                                }}
                                            >
                                                Add Image
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept="image/*"
                                                    onChange={(e) => setImageUpload(e.target.files[0])}
                                                />
                                            </Button>
                                            <Typography 
                                                variant="caption" 
                                                color="text.secondary"
                                                sx={{
                                                    display: { xs: 'none', sm: 'block' },
                                                    fontStyle: 'italic'
                                                }}
                                            >
                                                or drag & drop
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            onClick={handleAddComment}
                                            disabled={commentLoading || (!commentContent.trim() && !imageUpload)}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                minWidth: '120px',
                                                position: 'relative',
                                                '&.Mui-disabled': {
                                                    bgcolor: 'rgba(0, 0, 0, 0.12)',
                                                    color: 'rgba(0, 0, 0, 0.26)'
                                                }
                                            }}
                                        >
                                            {commentLoading ? (
                                                <>
                                                    <CircularProgress
                                                        size={16}
                                                        thickness={4}
                                                        sx={{
                                                            color: 'inherit',
                                                            position: 'absolute',
                                                            left: '50%',
                                                            marginLeft: '-12px'
                                                        }}
                                                    />
                                                    <Box sx={{ opacity: 0 }}>Comment</Box>
                                                </>
                                            ) : (
                                                <>
                                                    <SendIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                                                    Comment
                                                </>
                                            )}
                                        </Button>
                                    </Box>
                                </Box>
                            </Paper>
                        </Box>

                        {/* Activity History */}
                        <Box sx={{ mt: 3 }}>
                            <Paper 
                                variant="outlined"
                                sx={{ 
                                    p: 2.5,
                                    borderRadius: 1.5,
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    bgcolor: '#ffffff'
                                }}
                            >
                                <Typography variant="subtitle1" gutterBottom sx={{ 
                                    color: '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    Activity History
                                </Typography>
                                <CardActivityHistory actions={actions} />
                            </Paper>
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

    if (!card) {
        return null;
    }

    const renderSidebarField = (label, content) => (
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ py: 1 }}>
            <Box sx={{ flex: 1, backgroundColor: '#ffffff', p: 2, borderRadius: '4px', width: '100%' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ 
                    color: '#1e293b',
                    fontWeight: 600,
                    fontSize: '1rem',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    {label}
                </Typography>
                {content}
            </Box>
        </Stack>
    );

    const renderResolutionTimes = () => (
        <Box sx={{
            backgroundColor: '#ffffff',
            p: 2.5,
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
            <Typography 
                variant="subtitle1" 
                gutterBottom 
                sx={{ 
                    color: '#1e293b',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                Resolution Times
            </Typography>
            <Stack spacing={2}>
                {/* Total Resolution Time */}
                <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2
                    }}>
                        <Typography variant="body2" sx={{ 
                            color: '#64748b', 
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto'
                        }}>
                            Total Resolution Time
                        </Typography>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: timingData.resolutionTime > 120 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: timingData.resolutionTime > 120 ? '#ef4444' : '#22c55e',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '16px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto'
                        }}>
                            {timingData.resolutionTime != null ? (
                                `${Math.floor(timingData.resolutionTime / 60)}h ${timingData.resolutionTime % 60}m`
                            ) : 'N/A'}
                        </Box>
                    </Box>
                </Box>

                {/* TS Resolution Time */}
                <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2
                    }}>
                        <Typography variant="body2" sx={{ 
                            color: '#64748b', 
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto'
                        }}>
                            TS Resolution Time
                        </Typography>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: timingData.TSResolutionTime > 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: timingData.TSResolutionTime > 60 ? '#ef4444' : '#22c55e',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '16px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto'
                        }}>
                            {timingData.TSResolutionTime != null ? (
                                `${Math.floor(timingData.TSResolutionTime / 60)}h ${timingData.TSResolutionTime % 60}m`
                            ) : 'N/A'}
                        </Box>
                    </Box>
                </Box>

                {/* First Action Time */}
                <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2
                    }}>
                        <Typography variant="body2" sx={{ 
                            color: '#64748b', 
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto'
                        }}>
                            First Action Time
                        </Typography>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: timingData.firstActionTime > 30 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: timingData.firstActionTime > 30 ? '#ef4444' : '#22c55e',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '16px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flex: '0 0 auto'
                        }}>
                            {timingData.firstActionTime != null ? (
                                `${Math.floor(timingData.firstActionTime / 60)}h ${timingData.firstActionTime % 60}m`
                            ) : 'N/A'}
                        </Box>
                    </Box>
                </Box>

                {/* Review Button */}
                {!loading && timingData.resolutionTime != null && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleReviewed}
                        fullWidth
                        startIcon={<span>✓</span>}
                        sx={{
                            mt: 1,
                            py: 1,
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            borderRadius: '6px',
                            '&:hover': {
                                backgroundColor: '#16a34a'
                            }
                        }}
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
                        bgcolor: '#f5f5f5',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        p: 2,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        bgcolor: '#ffffff',
                    }}>
                        <Box sx={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            flex: 1
                        }}>
                            <Box sx={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%'
                            }}>
                                <Box sx={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    flex: 1
                                }}>
                                    <Box
                                        onClick={handleToggleComplete}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            cursor: 'pointer',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            backgroundColor: card?.dueComplete ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                                            color: card?.dueComplete ? '#2E7D32' : '#666666',
                                            border: '1px solid',
                                            borderColor: card?.dueComplete ? '#4CAF50' : 'transparent',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                backgroundColor: card?.dueComplete ? 'rgba(76, 175, 80, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                                                transform: 'translateY(-1px)'
                                            }
                                        }}
                                    >
                                        <Box sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            backgroundColor: card?.dueComplete ? '#4CAF50' : 'transparent',
                                            border: '2px solid',
                                            borderColor: card?.dueComplete ? '#4CAF50' : '#666666',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '12px',
                                            transition: 'all 0.2s ease-in-out'
                                        }}>
                                            {card?.dueComplete && '✓'}
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {card?.dueComplete ? 'Completed' : 'Mark Complete'}
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ 
                                        color: '#1e293b',
                                        fontWeight: 600,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        flex: 1
                                    }}>
                                        {safeCard.name}
                                    </Typography>
                                </Box>
                                <IconButton 
                                    size="small" 
                                    onClick={onClose}
                                    sx={{
                                        color: 'text.secondary',
                                        ml: 2,
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                                            color: 'primary.main'
                                        }
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            <Stack 
                                direction="row" 
                                spacing={0.5} 
                                alignItems="center"
                                useFlexGap 
                                sx={{ 
                                    flex: 1,
                                    flexWrap: 'wrap',
                                    gap: 0.5
                                }}
                            >
                                {card.labels.map(label => (
                                    <Chip
                                        key={label.id}
                                        label={label.name}
                                        size="small"
                                        onDelete={() => handleRemoveLabel(label.id)}
                                        sx={{ 
                                            bgcolor: getLabelColor(label.name),
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
                                                bgcolor: getLabelColor(label.name),
                                                filter: 'brightness(90%)',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                            }
                                        }}
                                    />
                                ))}
                                {availableLabels.length > 0 && (
                                    <Button
                                        onClick={(event) => {
                                            setLabelMenuAnchorEl(event.currentTarget);
                                            setLabelMenuOpen(true);
                                        }}
                                        startIcon={<AddIcon />}
                                        size="small"
                                        sx={{ 
                                            color: '#1976d2',
                                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            height: '24px',
                                            minWidth: 'auto',
                                            p: '4px 8px',
                                            borderRadius: '4px',
                                            '&:hover': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.12)'
                                            }
                                        }}
                                    >
                                        Add Label
                                    </Button>
                                )}
                            </Stack>
                            {availableLabels.length > 0 && (
                                <Menu
                                    anchorEl={labelMenuAnchorEl}
                                    open={labelMenuOpen}
                                    onClose={() => {
                                        setLabelMenuOpen(false);
                                        setLabelSearch('');
                                    }}
                                    PaperProps={{
                                        sx: {
                                            mt: 1,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                            borderRadius: '8px',
                                            minWidth: '250px',
                                            maxHeight: '400px'
                                        }
                                    }}
                                >
                                    {/* Search Box */}
                                    <Box sx={{ p: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="Search labels..."
                                            value={labelSearch}
                                            onChange={(e) => setLabelSearch(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <SearchIcon 
                                                        fontSize="small" 
                                                        sx={{ 
                                                            color: 'action.active',
                                                            mr: 1
                                                        }} 
                                                    />
                                                ),
                                                sx: {
                                                    fontSize: '0.875rem',
                                                    backgroundColor: '#f8fafc',
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'rgba(0, 0, 0, 0.08)'
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'rgba(0, 0, 0, 0.15)'
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#1976d2'
                                                    }
                                                }
                                            }}
                                        />
                                    </Box>
                                    <Divider />
                                    <Box sx={{ 
                                        maxHeight: 300,
                                        overflow: 'auto',
                                        ...(filteredLabels.length === 0 && {
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            py: 2
                                        })
                                    }}>
                                        {filteredLabels.length > 0 ? (
                                            filteredLabels.map(label => {
                                                const labelColor = getLabelColor(label.name);
                                                return (
                                                    <MenuItem 
                                                        key={label.id} 
                                                        onClick={() => {
                                                            handleAddLabel(label.id);
                                                        }}
                                                        sx={{ 
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            py: 1,
                                                            px: 2,
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                                            }
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
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {label.name}
                                                        </Typography>
                                                    </MenuItem>
                                                );
                                            })
                                        ) : (
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    fontStyle: 'italic'
                                                }}
                                            >
                                                No labels found
                                            </Typography>
                                        )}
                                    </Box>
                                </Menu>
                            )}
                        </Box>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '30%',
                            gap: 1,
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: '7px',
                            p: 1
                        }}>
                            <Typography variant="body2" sx={{ 
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                Create Date: {createDate ? (
                                    <Box component="span" sx={{ fontWeight: 700 }}>
                                        {format(createDate, 'MMM d, yyyy HH:mm')}
                                    </Box>
                                ) : 'N/A'}
                                {createDate && (
                                    <Typography 
                                        component="span" 
                                        variant="caption" 
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        ({formatDistanceToNow(createDate, { addSuffix: true })})
                                    </Typography>
                                )}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Content */}
                    <Box sx={{ 
                        display: 'flex', 
                        flex: 1,
                        overflow: 'hidden',
                        bgcolor: '#f5f5f5'
                    }}>
                        {/* Left Column */}
                        <Box sx={{ 
                            flex: 1,
                            overflowY: 'auto',
                            p: 3,
                            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
                            bgcolor: '#f5f5f5'
                        }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                renderTabContent()
                            )}
                        </Box>

                        {/* Right Column - Sidebar */}
                        <Box sx={{ 
                            width: 330,
                            overflowY: 'auto',
                            p: 2.5,
                            bgcolor: '#f5f5f5',
                            borderRadius: '4px'
                        }}>
                            <Stack spacing={2.5} divider={<Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />}>
                                {/* Quick Links */}
                                {(shopUrl || crispUrl || safeCard.shortUrl) && (
                                    <Box sx={{
                                        bgcolor: '#ffffff',
                                        p: 2,
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <Typography variant="subtitle1" gutterBottom sx={{ 
                                            color: '#1e293b',
                                            fontWeight: 600,
                                            fontSize: '0.95rem',
                                            mb: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            letterSpacing: '0.01em',
                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                        }}>
                                            Informations
                                        </Typography>
                                        <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}> 
                                            {shopUrl && (
                                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                                    <Link
                                                        href={shopUrl}
                                                        target="_blank"
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            color: '#64748b',
                                                            textDecoration: 'none',
                                                            gap: 1,
                                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                                            borderRadius: '6px',
                                                            p: 1.5,
                                                            position: 'relative',
                                                            width: '100%',
                                                            bgcolor: 'rgba(0, 0, 0, 0.02)',
                                                            transition: 'all 0.2s ease-in-out',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                                transform: 'translateY(-1px)',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                                color: '#1e293b'
                                                            }
                                                        }}
                                                    >
                                                        <Box sx={{ 
                                                            width: 32,
                                                            height: 32,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                                                            color: '#64748b'
                                                        }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                                            </svg>
                                                        </Box>
                                                        <Typography variant="caption" sx={{ 
                                                            fontSize: '0.75rem', 
                                                            textAlign: 'center', 
                                                            fontWeight: 500,
                                                            letterSpacing: '0.02em',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            textTransform: 'capitalize'
                                                        }}>
                                                            View Shop
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleCopyLink(shopUrl, 'Shop URL');
                                                            }}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                p: 0.5,
                                                                color: '#94a3b8',
                                                                '&:hover': {
                                                                    color: '#1e293b',
                                                                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                                                                }
                                                            }}
                                                        >
                                                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Link>
                                                </Box>
                                            )}
                                            {crispUrl && (
                                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                                    <Link
                                                        href={crispUrl}
                                                        target="_blank"
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            color: '#64748b',
                                                            textDecoration: 'none',
                                                            gap: 1,
                                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                                            borderRadius: '6px',
                                                            p: 1.5,
                                                            position: 'relative',
                                                            width: '100%',
                                                            bgcolor: 'rgba(0, 0, 0, 0.02)',
                                                            transition: 'all 0.2s ease-in-out',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                                transform: 'translateY(-1px)',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                                color: '#1e293b'
                                                            }
                                                        }}
                                                    >
                                                        <Box sx={{ 
                                                            width: 32,
                                                            height: 32,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                                                            color: '#64748b'
                                                        }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                                                            </svg>
                                                        </Box>
                                                        <Typography variant="caption" sx={{ 
                                                            fontSize: '0.75rem', 
                                                            textAlign: 'center',
                                                            fontWeight: 500,
                                                            letterSpacing: '0.02em',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            textTransform: 'capitalize'
                                                        }}>
                                                            View Chat
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleCopyLink(crispUrl, 'Chat URL');
                                                            }}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                p: 0.5,
                                                                color: '#94a3b8',
                                                                '&:hover': {
                                                                    color: '#1e293b',
                                                                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                                                                }
                                                            }}
                                                        >
                                                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Link>
                                                </Box>
                                            )}
                                        </Stack>
                                        {safeCard.shortUrl && (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mt: 1.5, width: '100%' }}>
                                                <Link
                                                    href={safeCard.shortUrl}
                                                    target="_blank"
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        color: '#64748b',
                                                        textDecoration: 'none',
                                                        gap: 1,
                                                        border: '1px solid rgba(0, 0, 0, 0.08)',
                                                        borderRadius: '6px',
                                                        p: 1.5,
                                                        position: 'relative',
                                                        width: '100%',
                                                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                                                        transition: 'all 0.2s ease-in-out',
                                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                            transform: 'translateY(-1px)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                            color: '#1e293b'
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ 
                                                        width: 32,
                                                        height: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '6px',
                                                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                                                        color: '#64748b'
                                                    }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-15 1.5h15v15h-15v-15zM6 6h12v2H6V6zm0 4h12v2H6v-2zm0 4h12v2H6v-2z"/>
                                                        </svg>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ 
                                                        fontSize: '0.75rem', 
                                                        textAlign: 'center',
                                                        fontWeight: 500,
                                                        letterSpacing: '0.02em',
                                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        View Trello
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleCopyLink(safeCard.shortUrl, 'Trello URL');
                                                        }}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 4,
                                                            right: 4,
                                                            p: 0.5,
                                                            color: '#94a3b8',
                                                            '&:hover': {
                                                                color: '#1e293b',
                                                                bgcolor: 'rgba(0, 0, 0, 0.04)'
                                                            }
                                                        }}
                                                    >
                                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                </Link>
                                            </Box>
                                        )}
                                    </Box>
                                )}

                                {/* Status */}
                                <Box sx={{
                                    bgcolor: '#ffffff',
                                    p: 2,
                                    borderRadius: '4px'
                                }}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ 
                                            color: '#1e293b',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            mb: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                    }}>
                                        List
                                    </Typography>
                                    <Box>
                                        <Button
                                            onClick={(e) => setListMenuAnchorEl(e.currentTarget)}
                                            sx={{
                                                width: '100%',
                                                height: '40px',
                                                justifyContent: 'space-between',
                                                textTransform: 'none',
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid rgba(0, 0, 0, 0.12)',
                                                borderRadius: '8px',
                                                color: '#1e293b',
                                                '&:hover': {
                                                    backgroundColor: '#f1f5f9',
                                                    borderColor: 'primary.main'
                                                },
                                                px: 2
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                                <Box 
                                                    sx={{ 
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        bgcolor: 'primary.main',
                                                        flexShrink: 0
                                                    }} 
                                                />
                                                <Typography 
                                                    sx={{ 
                                                        fontSize: '0.875rem', 
                                                        fontWeight: 500,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {lists.find(list => list.id === currentListId)?.name || 'Select List'}
                                                </Typography>
                                            </Box>
                                            <KeyboardArrowDownIcon sx={{ color: '#64748b' }} />
                                        </Button>

                                        <Menu
                                            anchorEl={listMenuAnchorEl}
                                            open={listMenuOpen}
                                            onClose={() => {
                                                setListMenuAnchorEl(null);
                                                setListSearch('');
                                            }}
                                            PaperProps={{
                                                sx: {
                                                    mt: 1,
                                                    width: 320,
                                                    maxHeight: 400,
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                    borderRadius: '8px'
                                                }
                                            }}
                                        >
                                            <Box sx={{ p: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    placeholder="Search lists..."
                                                    value={listSearch}
                                                    onChange={(e) => setListSearch(e.target.value)}
                                                    InputProps={{
                                                        startAdornment: (
                                                            <SearchIcon 
                                                                fontSize="small" 
                                                                sx={{ 
                                                                    color: 'action.active',
                                                                    mr: 1
                                                                }} 
                                                            />
                                                        ),
                                                        sx: {
                                                            fontSize: '0.875rem',
                                                            backgroundColor: '#f8fafc',
                                                            '& .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: 'rgba(0, 0, 0, 0.08)'
                                                            },
                                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: 'rgba(0, 0, 0, 0.15)'
                                                            },
                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: '#1976d2'
                                                            }
                                                        }
                                                    }}
                                                />
                                            </Box>
                                            <Divider />
                                            <Box sx={{ 
                                                maxHeight: 320,
                                                overflow: 'auto',
                                                ...(filteredLists.length === 0 && {
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    py: 2
                                                })
                                            }}>
                                                {filteredLists.length > 0 ? (
                                                    filteredLists.map(list => (
                                                        <MenuItem 
                                                            key={list.id}
                                                            onClick={() => {
                                                                handleMoveList(list.id);
                                                                setListMenuAnchorEl(null);
                                                                setListSearch('');
                                                            }}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                minHeight: '40px',
                                                                py: 1,
                                                                px: 2,
                                                                '&:hover': {
                                                                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                                                }
                                                            }}
                                                        >
                                                            <Box 
                                                                sx={{ 
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    bgcolor: currentListId === list.id ? 'primary.main' : 'rgba(0, 0, 0, 0.12)',
                                                                    flexShrink: 0
                                                                }} 
                                                            />
                                                            <Typography 
                                                                sx={{ 
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: currentListId === list.id ? 500 : 400,
                                                                    color: currentListId === list.id ? 'primary.main' : 'text.primary',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: '250px'
                                                                }}
                                                            >
                                                                {list.name}
                                                            </Typography>
                                                        </MenuItem>
                                                    ))
                                                ) : (
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.secondary',
                                                            fontStyle: 'italic'
                                                        }}
                                                    >
                                                        No lists found
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Menu>
                                    </Box>
                                </Box>

                                {/* Assignees */}
                                {renderSidebarField(
                                    'Assignees',
                                    <Stack spacing={1}>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {agents.map(agent => (
                                                <Chip
                                                    key={agent.id}
                                                    label={agent.username || agent.fullName}
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
                                            <>
                                                <Button
                                                    onClick={(event) => {
                                                        setAssigneeMenuAnchorEl(event.currentTarget);
                                                        setAssigneeMenuOpen(true);
                                                    }}
                                                    startIcon={<AddIcon />}
                                                    sx={{ 
                                                        color: '#1976d2',
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                        textTransform: 'none',
                                                        fontWeight: 500,
                                                        fontSize: '0.875rem',
                                                        py: 0.75,
                                                        px: 1.5,
                                                        borderRadius: '6px',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(25, 118, 210, 0.12)'
                                                        },
                                                        width: 'fit-content'
                                                    }}
                                                >
                                                    Add Assignee
                                                </Button>
                                                <Menu
                                                    anchorEl={assigneeMenuAnchorEl}
                                                    open={assigneeMenuOpen}
                                                    onClose={() => {
                                                        setAssigneeMenuOpen(false);
                                                        setAssigneeSearch(''); // Reset search when closing
                                                    }}
                                                    anchorOrigin={{
                                                        vertical: 'bottom',
                                                        horizontal: 'left',
                                                    }}
                                                    transformOrigin={{
                                                        vertical: 'top',
                                                        horizontal: 'left',
                                                    }}
                                                    PaperProps={{
                                                        sx: {
                                                            mt: 0.5,
                                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                                            borderRadius: '8px',
                                                            minWidth: '250px',
                                                            maxHeight: '400px'
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ p: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            placeholder="Search members..."
                                                            value={assigneeSearch}
                                                            onChange={(e) => setAssigneeSearch(e.target.value)}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <SearchIcon 
                                                                        fontSize="small" 
                                                                        sx={{ 
                                                                            color: 'action.active',
                                                                            mr: 1
                                                                        }} 
                                                                    />
                                                                ),
                                                                sx: {
                                                                    fontSize: '0.875rem',
                                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: 'rgba(0, 0, 0, 0.08)'
                                                                    },
                                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: 'rgba(0, 0, 0, 0.15)'
                                                                    },
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#1976d2'
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box sx={{ 
                                                        maxHeight: 300,
                                                        overflow: 'auto',
                                                        ...(filteredAgents.length === 0 && {
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            py: 2
                                                        })
                                                    }}>
                                                        {filteredAgents.length > 0 ? (
                                                            filteredAgents.map(agent => {
                                                                const avatarUrl = agent.avatarUrl || agent.avatarHash ? 
                                                                    `https://trello-members.s3.amazonaws.com/${agent.id}/${agent.avatarHash}/170.png` : 
                                                                    null;
                                                                
                                                                return (
                                                                    <MenuItem 
                                                                        key={agent.id} 
                                                                        onClick={() => {
                                                                            handleAgentSelect({ target: { value: agent.id }});
                                                                            setAssigneeMenuOpen(false);
                                                                            setAssigneeSearch('');
                                                                        }}
                                                                        sx={{ 
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 1,
                                                                            py: 1,
                                                                            px: 2,
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                                                            }
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
                                                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <Typography variant="body2" sx={{ 
                                                                                fontSize: '0.875rem', 
                                                                                fontWeight: 500,
                                                                                color: 'text.primary',
                                                                                lineHeight: 1.2
                                                                            }}>
                                                                                {agent.username || agent.fullName}
                                                                            </Typography>
                                                                            {agent.username && agent.fullName && agent.username !== agent.fullName && (
                                                                                <Typography variant="caption" sx={{ 
                                                                                    color: 'text.secondary',
                                                                                    fontSize: '0.75rem',
                                                                                    lineHeight: 1.2
                                                                                }}>
                                                                                    {agent.fullName}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    </MenuItem>
                                                                );
                                                            })
                                                        ) : (
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    color: 'text.secondary',
                                                                    fontStyle: 'italic'
                                                                }}
                                                            >
                                                                No members found
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Menu>
                                            </>
                                        )}
                                    </Stack>
                                )}

                                {/* Resolution Times */}
                                {renderResolutionTimes()}
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