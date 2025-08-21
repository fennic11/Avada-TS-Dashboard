import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Modal, Typography, Spin, Tag, Space, Button,
    Input, Avatar, Divider, message, Card, List,
    Dropdown, Upload, Tooltip
} from 'antd';
import {
    CloseOutlined, PlusOutlined, SearchOutlined,
    PictureOutlined, SendOutlined, CopyOutlined,
    DownOutlined, BoldOutlined, ItalicOutlined,
    UnderlineOutlined, OrderedListOutlined,
    UnorderedListOutlined, LinkOutlined
} from '@ant-design/icons';
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
import { postErrorCards } from '../api/errorCards';

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
    const [isEditorMode, setIsEditorMode] = useState(false);
    const [qaNotes, setQaNotes] = useState('');
    const [qaLoading, setQaLoading] = useState(false);
    const [penaltyPoints, setPenaltyPoints] = useState('');

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
                            message.error('Error loading card details');
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
            message.error('Member not found');
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
            setIsEditorMode(false);

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

    // Keyboard shortcuts for editor
    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    applyFormat('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    applyFormat('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    applyFormat('underline');
                    break;
                case 'enter':
                    if (e.shiftKey) {
                        // Allow new line
                        return;
                    }
                    e.preventDefault();
                    handleAddComment();
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

    const handleQASubmit = async () => {
        if (!qaNotes.trim() || !card?.id) {
            setSnackbar({
                open: true,
                message: 'Please enter QA notes before submitting',
                severity: 'warning'
            });
            return;
        }

        setQaLoading(true);
        try {
            const dataToSave = {
                cardId: card.id,
                cardName: card.name || "",
                cardUrl: card.shortUrl || `https://trello.com/c/${card.idShort}`,
                note: qaNotes.trim(),
                penaltyPoints: penaltyPoints ? parseInt(penaltyPoints) : 0,
                labels: card.labels?.map(l => l.name) || [],
                members: card.idMembers || [],
                createdAt: new Date()
            };

            await postErrorCards(dataToSave);
            
            setQaNotes('');
            setPenaltyPoints('');
            setSnackbar({
                open: true,
                message: 'QA review submitted successfully',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error submitting QA review:', error);
            setSnackbar({
                open: true,
                message: 'Failed to submit QA review: ' + error.message,
                severity: 'error'
            });
        } finally {
            setQaLoading(false);
        }
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
                    <a 
                        key={index} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                            color: '#1890ff',
                            textDecoration: 'underline'
                        }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    // Simple rich text editor functions
    const applyFormat = (format) => {
        const textarea = document.getElementById('comment-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = commentContent.substring(start, end);
        const beforeText = commentContent.substring(0, start);
        const afterText = commentContent.substring(end);

        let formattedText = '';
        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                break;
            case 'list':
                formattedText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
                break;
            case 'numbered':
                formattedText = selectedText.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n');
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    formattedText = `[${selectedText}](${url})`;
                } else {
                    return;
                }
                break;
            default:
                formattedText = selectedText;
        }

        const newContent = beforeText + formattedText + afterText;
        setCommentContent(newContent);

        // Set cursor position after formatting
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + formattedText.length);
        }, 0);
    };

    const renderFormattedText = (text) => {
        if (!text) return '';
        
        // Convert markdown-like formatting to HTML
        let formattedText = text
            // Bold: **text** -> <strong>text</strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic: *text* -> <em>text</em>
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Underline: __text__ -> <u>text</u>
            .replace(/__(.*?)__/g, '<u>$1</u>')
            // Links: [text](url) -> <a href="url">text</a>
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #1890ff; text-decoration: underline;">$1</a>')
            // Lists: - item -> • item
            .replace(/^- (.+)$/gm, '• $1')
            // Numbered lists: 1. item -> 1. item (keep as is)
            .replace(/^\d+\. (.+)$/gm, '$&')
            // URLs: http://... -> clickable links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1890ff; text-decoration: underline;">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');

        return formattedText;
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: // Details & Comments
                return (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        {/* Description */}
                        <Card style={{
                            backgroundColor: '#ffffff',
                            padding: 12,
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: '1px solid rgba(0, 0, 0, 0.06)'
                        }}>
                            <Typography.Title level={5} style={{ 
                                color: '#1e293b',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                margin: 0
                            }}>
                                Description
                            </Typography.Title>
                            <div style={{
                                padding: 12,
                                borderRadius: '6px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid rgba(0, 0, 0, 0.04)'
                            }}>
                                <Typography.Text
                                    style={{
                                        color: '#374151',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {renderDescriptionWithLinks(card.desc || '')}
                                </Typography.Text>
                            </div>
                        </Card>

                        {/* Attachments Section */}
                        {safeCard.attachments && safeCard.attachments.length > 0 && (
                            <div>
                                <Typography.Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PictureOutlined />
                                    Attachments
                                </Typography.Title>
                                <Card style={{ 
                                    padding: 12,
                                    borderRadius: 8,
                                    borderColor: 'rgba(0, 0, 0, 0.08)',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <Space direction="vertical" size="middle">
                                        {safeCard.attachments.map((attachment, index) => {
                                            // Check if the attachment is an image
                                            const isImage = attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                                                          attachment.mimeType?.startsWith('image/');
                                            
                                            if (!isImage) return null;

                                            return (
                                                <div 
                                                    key={attachment.id || index}
                                                    style={{
                                                        position: 'relative',
                                                        cursor: 'pointer'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const overlay = e.currentTarget.querySelector('.image-overlay');
                                                        if (overlay) overlay.style.opacity = '1';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const overlay = e.currentTarget.querySelector('.image-overlay');
                                                        if (overlay) overlay.style.opacity = '0';
                                                    }}
                                                >
                                                    <img
                                                        src={attachment.url}
                                                        alt={attachment.name || 'Attachment'}
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            maxHeight: 400,
                                                            objectFit: 'contain',
                                                            borderRadius: 4,
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => window.open(attachment.url, '_blank')}
                                                    />
                                                    <div
                                                        className="image-overlay"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s',
                                                            borderRadius: 4
                                                        }}
                                                    >
                                                        <Button
                                                            type="primary"
                                                            onClick={() => window.open(attachment.url, '_blank')}
                                                            icon={<PictureOutlined />}
                                                        >
                                                            View Full Size
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </Space>
                                </Card>
                            </div>
                        )}

                        {/* Comments Section */}
                        <div style={{ marginTop: 15 }}>
                            <Card 
                                style={{ 
                                    padding: 16,
                                    borderRadius: 12,
                                    borderColor: 'rgba(0, 0, 0, 0.08)',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                    border: '1px solid rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                <Typography.Title level={5} style={{ 
                                    color: '#1e293b',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    marginBottom: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    letterSpacing: '0.01em',
                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    margin: 0,
                                    borderBottom: '2px solid rgba(0, 0, 0, 0.06)',
                                    paddingBottom: 12
                                }}>
                                    💬 Comments
                                </Typography.Title>
                                <div
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
                                    style={{
                                        position: 'relative'
                                    }}
                                >
                                    {/* Editor Toolbar */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '8px 12px',
                                        backgroundColor: '#f1f5f9',
                                        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                                        borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
                                        borderRight: '1px solid rgba(0, 0, 0, 0.06)',
                                        borderTopLeftRadius: '8px',
                                        borderTopRightRadius: '8px',
                                        borderBottom: 'none'
                                    }}>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<BoldOutlined />}
                                            onClick={() => applyFormat('bold')}
                                            title="Bold (Ctrl+B)"
                                            style={{
                                                padding: '4px 8px',
                                                color: '#64748b',
                                                minWidth: 'auto',
                                                height: '28px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                e.currentTarget.style.color = '#374151';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        />
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<ItalicOutlined />}
                                            onClick={() => applyFormat('italic')}
                                            title="Italic (Ctrl+I)"
                                            style={{
                                                padding: '4px 8px',
                                                color: '#64748b',
                                                minWidth: 'auto',
                                                height: '28px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                e.currentTarget.style.color = '#374151';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        />
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<UnderlineOutlined />}
                                            onClick={() => applyFormat('underline')}
                                            title="Underline (Ctrl+U)"
                                            style={{
                                                padding: '4px 8px',
                                                color: '#64748b',
                                                minWidth: 'auto',
                                                height: '28px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                e.currentTarget.style.color = '#374151';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        />
                                        <Divider type="vertical" style={{ margin: '0 4px', height: '20px' }} />
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<UnorderedListOutlined />}
                                            onClick={() => applyFormat('list')}
                                            title="Bullet List"
                                            style={{
                                                padding: '4px 8px',
                                                color: '#64748b',
                                                minWidth: 'auto',
                                                height: '28px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                e.currentTarget.style.color = '#374151';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        />
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<OrderedListOutlined />}
                                            onClick={() => applyFormat('numbered')}
                                            title="Numbered List"
                                            style={{
                                                padding: '4px 8px',
                                                color: '#64748b',
                                                minWidth: 'auto',
                                                height: '28px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                e.currentTarget.style.color = '#374151';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        />
                                        <Divider type="vertical" style={{ margin: '0 4px', height: '20px' }} />
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<LinkOutlined />}
                                            onClick={() => applyFormat('link')}
                                            title="Add Link"
                                            style={{
                                                padding: '4px 8px',
                                                color: '#64748b',
                                                minWidth: 'auto',
                                                height: '28px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                e.currentTarget.style.color = '#374151';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        />
                                        <div style={{ flex: 1 }} />
                                        <Tooltip 
                                            title={
                                                <div style={{ fontSize: '12px' }}>
                                                    <div><strong>Keyboard Shortcuts:</strong></div>
                                                    <div>Ctrl+B: Bold</div>
                                                    <div>Ctrl+I: Italic</div>
                                                    <div>Ctrl+U: Underline</div>
                                                    <div>Ctrl+Enter: Send comment</div>
                                                    <div>Shift+Enter: New line</div>
                                                </div>
                                            }
                                            placement="bottom"
                                        >
                                            <Button
                                                type="text"
                                                size="small"
                                                onClick={() => setIsEditorMode(!isEditorMode)}
                                                style={{
                                                    padding: '4px 8px',
                                                    color: isEditorMode ? '#3b82f6' : '#64748b',
                                                    minWidth: 'auto',
                                                    height: '28px',
                                                    fontSize: '12px',
                                                    fontWeight: 500
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                {isEditorMode ? 'Preview' : 'Rich Text'}
                                            </Button>
                                        </Tooltip>
                                    </div>

                                    {isEditorMode ? (
                                        <div
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                borderColor: 'rgba(0, 0, 0, 0.08)',
                                                borderRadius: '0 0 8px 8px',
                                                padding: '12px 16px',
                                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                                borderTop: 'none',
                                                minHeight: '120px',
                                                maxHeight: '300px',
                                                overflow: 'auto'
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: renderFormattedText(commentContent) || '<span style="color: #94a3b8;">Write a comment... You can also paste or drag & drop images</span>'
                                            }}
                                        />
                                    ) : (
                                        <Input.TextArea
                                            id="comment-textarea"
                                            rows={4}
                                            value={commentContent}
                                            onChange={(e) => setCommentContent(e.target.value)}
                                            onPaste={handlePaste}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Write a comment... You can also paste or drag & drop images"
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                borderColor: 'rgba(0, 0, 0, 0.08)',
                                                borderRadius: '0 0 8px 8px',
                                                padding: '12px 16px',
                                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                transition: 'all 0.2s ease-in-out',
                                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                                borderTop: 'none'
                                            }}
                                        />
                                    )}
                                    
                                    {/* Image Preview */}
                                    {imageUpload && (
                                        <Card
                                            style={{
                                                marginTop: 12,
                                                padding: 12,
                                                borderRadius: 8,
                                                borderColor: 'rgba(0, 0, 0, 0.08)',
                                                position: 'relative',
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                            }}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <img
                                                    src={URL.createObjectURL(imageUpload)}
                                                    alt="Upload preview"
                                                    style={{
                                                        width: '100%',
                                                        maxHeight: '200px',
                                                        objectFit: 'contain',
                                                        borderRadius: 6,
                                                        border: '1px solid rgba(0, 0, 0, 0.04)'
                                                    }}
                                                />
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<CloseOutlined />}
                                                    onClick={() => setImageUpload(null)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: -6,
                                                        right: -6,
                                                        backgroundColor: 'white',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                                        minWidth: 'auto',
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '50%',
                                                        border: '1px solid rgba(0, 0, 0, 0.08)',
                                                        transition: 'all 0.2s ease-in-out'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'scale(1.1)';
                                                        e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.2)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                                                    }}
                                                />
                                            </div>
                                            <Typography.Text 
                                                style={{ 
                                                    display: 'block',
                                                    marginTop: 6,
                                                    textAlign: 'center',
                                                    color: 'rgba(0, 0, 0, 0.45)',
                                                    fontSize: '12px',
                                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {imageUpload.name}
                                            </Typography.Text>
                                        </Card>
                                    )}

                                    {/* Comment Actions */}
                                    <div 
                                        className="comment-actions"
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginTop: 12,
                                            gap: 12,
                                            opacity: commentContent || imageUpload ? 1 : 0,
                                            transform: commentContent || imageUpload ? 'translateY(0)' : 'translateY(10px)',
                                            transition: 'all 0.3s ease-in-out',
                                            visibility: commentContent || imageUpload ? 'visible' : 'hidden'
                                        }}
                                    >
                                        <Space>
                                            <Upload
                                                accept="image/*"
                                                showUploadList={false}
                                                beforeUpload={(file) => {
                                                    setImageUpload(file);
                                                    return false;
                                                }}
                                            >
                                                <Button
                                                    icon={<PictureOutlined />}
                                                    style={{ 
                                                        fontWeight: 600,
                                                        color: '#64748b',
                                                        borderColor: 'rgba(0, 0, 0, 0.08)',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                        borderRadius: '8px',
                                                        padding: '6px 12px',
                                                        fontSize: '13px',
                                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                        transition: 'all 0.2s ease-in-out'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                        e.currentTarget.style.color = '#374151';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                                        e.currentTarget.style.color = '#64748b';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    Add Image
                                                </Button>
                                            </Upload>
                                            <Typography.Text 
                                                style={{
                                                    display: 'none',
                                                    '@media (min-width: 600px)': {
                                                        display: 'block'
                                                    },
                                                    fontStyle: 'italic',
                                                    color: '#94a3b8',
                                                    fontSize: '12px',
                                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                                }}
                                            >
                                                or drag & drop
                                            </Typography.Text>
                                        </Space>
                                        <Button
                                            type="primary"
                                            onClick={handleAddComment}
                                            disabled={commentLoading || (!commentContent.trim() && !imageUpload)}
                                            icon={commentLoading ? <Spin size="small" /> : <SendOutlined />}
                                            style={{
                                                fontWeight: 700,
                                                minWidth: '120px',
                                                backgroundColor: '#3b82f6',
                                                borderColor: '#3b82f6',
                                                borderRadius: '8px',
                                                padding: '8px 16px',
                                                fontSize: '14px',
                                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#2563eb';
                                                e.currentTarget.style.borderColor = '#2563eb';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#3b82f6';
                                                e.currentTarget.style.borderColor = '#3b82f6';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                                            }}
                                        >
                                            {commentLoading ? 'Sending...' : 'Comment'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Activity History */}
                        <div style={{ marginTop: 20 }}>
                            <Card 
                                style={{ 
                                    padding: 10,
                                    borderRadius: 8,
                                    borderColor: 'rgba(0, 0, 0, 0.08)',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <Typography.Title level={5} style={{ 
                                    color: '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    marginBottom: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    Activity History
                                </Typography.Title>
                                <CardActivityHistory actions={actions} />
                            </Card>
                        </div>
                    </Space>
                );

            case 1: // Documentation
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                            <Typography.Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <SearchOutlined />
                                Search Documentation
                            </Typography.Title>
                            <Card style={{ 
                                padding: 12,
                                borderRadius: 8,
                                borderColor: 'rgba(0, 0, 0, 0.08)',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                            }}>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <Space style={{ 
                                        display: 'flex', 
                                        gap: 8,
                                        alignItems: 'center',
                                        width: '100%'
                                    }}>
                                        <Input
                                            placeholder="Tìm kiếm tài liệu..."
                                            value={notionQuery}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setNotionQuery(newValue);
                                            }}
                                            prefix={<SearchOutlined />}
                                            suffix={notionLoading && <Spin size="small" />}
                                            style={{
                                                flex: 1,
                                                borderColor: 'rgba(0, 0, 0, 0.23)'
                                            }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={() => handleNotionSearch()}
                                            disabled={notionLoading || !notionQuery}
                                            style={{
                                                minWidth: '100px',
                                                fontWeight: 500
                                            }}
                                        >
                                            Tìm kiếm
                                        </Button>
                                    </Space>
                                    {notionResults.length > 0 && (
                                        <List
                                            style={{ 
                                                backgroundColor: 'white',
                                                borderRadius: 4,
                                                border: '1px solid #f0f0f0',
                                                maxHeight: '400px',
                                                overflow: 'auto'
                                            }}
                                        >
                                            {notionResults.map((article) => (
                                                <List.Item
                                                    key={article.id}
                                                    style={{
                                                        display: 'block',
                                                        padding: '12px',
                                                        borderBottom: '1px solid #f0f0f0',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => window.open(article.url, '_blank')}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                        <Typography.Text strong style={{ fontWeight: 600 }}>
                                                            {article.properties.title || article.title}
                                                        </Typography.Text>
                                                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                                            {new Date(article.lastEdited).toLocaleDateString()}
                                                        </Typography.Text>
                                                    </div>
                                                    <Typography.Text type="secondary" style={{ 
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        fontSize: '14px'
                                                    }}>
                                                        {article.preview}
                                                    </Typography.Text>
                                                </List.Item>
                                            ))}
                                        </List>
                                    )}
                                    {notionQuery && !notionLoading && notionResults.length === 0 && (
                                                                <div style={{ 
                            textAlign: 'center', 
                            padding: '24px 12px',
                            backgroundColor: '#fafafa',
                            borderRadius: 4
                        }}>
                                            <SearchOutlined style={{ fontSize: 40, color: 'rgba(0, 0, 0, 0.45)', marginBottom: 8 }} />
                                            <Typography.Text type="secondary">
                                                Không tìm thấy kết quả cho "{notionQuery}"
                                            </Typography.Text>
                                            <Typography.Text type="secondary" style={{ marginTop: 8, display: 'block', fontSize: '12px' }}>
                                                Hãy thử từ khóa khác hoặc kiểm tra lại chính tả
                                            </Typography.Text>
                                        </div>
                                    )}
                                </Space>
                            </Card>
                        </div>
                    </Space>
                );

            default:
                return null;
        }
    };

    if (!card) {
        return null;
    }

    const renderSidebarField = (label, content) => (
        <Space direction="horizontal" size="small" align="start" style={{ padding: '8px 0' }}>
                                            <div style={{ flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: '8px', width: '100%', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <Typography.Title level={5} style={{ 
                    color: '#1e293b',
                    fontWeight: 600,
                    fontSize: '1rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    margin: 0
                }}>
                    {label}
                </Typography.Title>
                {content}
            </div>
        </Space>
    );

    const renderResolutionTimes = () => (
        <Card style={{
            backgroundColor: '#ffffff',
            padding: 16,
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s ease-in-out'
        }}>
            <Typography.Title 
                level={5} 
                style={{ 
                    color: '#1e293b',
                    fontWeight: 700,
                    fontSize: '1rem',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    letterSpacing: '0.01em',
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    margin: 0,
                    borderBottom: '2px solid rgba(0, 0, 0, 0.06)',
                    paddingBottom: 12
                }}
            >
                ⏱️ Resolution Times
            </Typography.Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* Total Resolution Time */}
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 16,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                >
                                            <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            width: '100%'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#3b82f6',
                                    flexShrink: 0
                                }} />
                                <Typography.Text style={{ 
                                    color: '#374151', 
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                }}>
                                    Total Resolution Time
                                </Typography.Text>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: timingData.resolutionTime > 120 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                color: timingData.resolutionTime > 120 ? '#dc2626' : '#059669',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                border: '1px solid',
                                borderColor: timingData.resolutionTime > 120 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                minWidth: 'fit-content'
                            }}>
                                {timingData.resolutionTime != null ? (
                                    `${Math.floor(timingData.resolutionTime / 60)}h ${timingData.resolutionTime % 60}m`
                                ) : 'N/A'}
                            </div>
                        </div>
                </div>

                {/* TS Resolution Time */}
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 16,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                >
                                            <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            width: '100%'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#8b5cf6',
                                    flexShrink: 0
                                }} />
                                <Typography.Text style={{ 
                                    color: '#374151', 
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                }}>
                                    TS Resolution Time
                                </Typography.Text>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: timingData.TSResolutionTime > 60 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                color: timingData.TSResolutionTime > 60 ? '#dc2626' : '#059669',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                border: '1px solid',
                                borderColor: timingData.TSResolutionTime > 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                minWidth: 'fit-content'
                            }}>
                                {timingData.TSResolutionTime != null ? (
                                    `${Math.floor(timingData.TSResolutionTime / 60)}h ${timingData.TSResolutionTime % 60}m`
                                ) : 'N/A'}
                            </div>
                        </div>
                </div>

                {/* First Action Time */}
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 16,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                >
                                            <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            width: '100%'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: '#f59e0b',
                                    flexShrink: 0
                                }} />
                                <Typography.Text style={{ 
                                    color: '#374151', 
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                }}>
                                    First Action Time
                                </Typography.Text>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: timingData.firstActionTime > 30 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                color: timingData.firstActionTime > 30 ? '#dc2626' : '#059669',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                border: '1px solid',
                                borderColor: timingData.firstActionTime > 30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                minWidth: 'fit-content'
                            }}>
                                {timingData.firstActionTime != null ? (
                                    `${Math.floor(timingData.firstActionTime / 60)}h ${timingData.firstActionTime % 60}m`
                                ) : 'N/A'}
                            </div>
                        </div>
                </div>

                {/* Review Button */}
                {!loading && timingData.resolutionTime != null && (
                    <Button
                        type="primary"
                        onClick={handleReviewed}
                        style={{
                            marginTop: 12,
                            padding: '12px 20px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14px',
                            borderRadius: '10px',
                            border: 'none',
                            width: '100%',
                            height: '44px',
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                            transition: 'all 0.3s ease-in-out',
                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            letterSpacing: '0.02em'
                        }}
                        icon={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>✓</span>}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#047857';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#059669';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
                        }}
                    >
                        Mark as Reviewed
                    </Button>
                )}
            </Space>
        </Card>
    );

    return (
        <>
            <Modal
                open={open}
                onCancel={onClose}
                width="90vw"
                closable={false}
                style={{
                    maxWidth: 1400,
                    maxHeight: 400,
                    top: 100
                }}
                bodyStyle={{
                    padding: 0,
                    height: '90vh',
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8
                }}
                footer={null}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 1400,
                        maxHeight: '90vh',
                        borderRadius: 8,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#f5f5f5',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: 16,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        backgroundColor: '#ffffff',
                    }}>
                        <div style={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            flex: 1
                        }}>
                            <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%'
                            }}>
                                <div style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    flex: 1
                                }}>
                                    <div
                                        onClick={handleToggleComplete}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            backgroundColor: card?.dueComplete ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                                            color: card?.dueComplete ? '#2E7D32' : '#666666',
                                            border: '1px solid',
                                            borderColor: card?.dueComplete ? '#4CAF50' : 'rgba(0, 0, 0, 0.08)',
                                            transition: 'all 0.2s ease-in-out',
                                            boxShadow: card?.dueComplete ? '0 2px 4px rgba(76, 175, 80, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = card?.dueComplete ? 'rgba(76, 175, 80, 0.15)' : 'rgba(0, 0, 0, 0.08)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = card?.dueComplete ? '0 4px 8px rgba(76, 175, 80, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = card?.dueComplete ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.04)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = card?.dueComplete ? '0 2px 4px rgba(76, 175, 80, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)';
                                        }}
                                    >
                                        <div style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            backgroundColor: card?.dueComplete ? '#4CAF50' : 'transparent',
                                            border: '2px solid',
                                            borderColor: card?.dueComplete ? '#4CAF50' : '#666666',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s ease-in-out'
                                        }}>
                                            {card?.dueComplete && '✓'}
                                        </div>
                                        <Typography.Text style={{ 
                                            fontWeight: 600,
                                            fontSize: '13px'
                                        }}>
                                            {card?.dueComplete ? 'Completed' : 'Mark Complete'}
                                        </Typography.Text>
                                    </div>
                                    <Typography.Title level={4} style={{ 
                                        color: '#1e293b',
                                        fontWeight: 600,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        flex: 1,
                                        margin: 0
                                    }}>
                                        {safeCard.name}
                                    </Typography.Title>
                                </div>
                                <Button 
                                    type="text"
                                    icon={<CloseOutlined />}
                                    onClick={onClose}
                                    style={{
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        marginLeft: 16
                                    }}
                                />
                            </div>
                            <Space 
                                style={{ 
                                    flex: 1,
                                    flexWrap: 'wrap',
                                    gap: 6
                                }}
                            >
                                {card.labels.map(label => (
                                    <Tag
                                        key={label.id}
                                        closable
                                        onClose={() => handleRemoveLabel(label.id)}
                                        style={{ 
                                            backgroundColor: getLabelColor(label.name),
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            height: '26px',
                                            padding: '0 10px',
                                            borderRadius: '6px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                            border: 'none',
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                                        }}
                                    >
                                        {label.name}
                                    </Tag>
                                ))}
                                {availableLabels.length > 0 && (
                                    <Button
                                        onClick={(event) => {
                                            setLabelMenuAnchorEl(event.currentTarget);
                                            setLabelMenuOpen(true);
                                        }}
                                        icon={<PlusOutlined />}
                                        size="small"
                                        style={{ 
                                            color: '#1976d2',
                                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            height: '26px',
                                            minWidth: 'auto',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(25, 118, 210, 0.15)',
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.12)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(25, 118, 210, 0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        Add Label
                                    </Button>
                                )}
                            </Space>
                            {availableLabels.length > 0 && (
                                <Dropdown
                                    open={labelMenuOpen}
                                    onOpenChange={(open) => {
                                        setLabelMenuOpen(open);
                                        if (!open) setLabelSearch('');
                                    }}
                                    trigger={['click']}
                                    overlay={
                                        <div style={{
                                            marginTop: 4,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                            borderRadius: '8px',
                                            minWidth: '250px',
                                            maxHeight: '400px',
                                            backgroundColor: 'white',
                                            border: '1px solid #f0f0f0'
                                        }}>
                                            {/* Search Box */}
                                            <div style={{ padding: 8, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                                <Input
                                                    size="small"
                                                    placeholder="Search labels..."
                                                    value={labelSearch}
                                                    onChange={(e) => setLabelSearch(e.target.value)}
                                                    prefix={<SearchOutlined />}
                                                    style={{
                                                        fontSize: '14px',
                                                        backgroundColor: '#f8fafc',
                                                        borderColor: 'rgba(0, 0, 0, 0.08)'
                                                    }}
                                                />
                                            </div>
                                            <Divider />
                                            <div style={{ 
                                                maxHeight: 300,
                                                overflow: 'auto'
                                            }}>
                                                {filteredLabels.length > 0 ? (
                                                    filteredLabels.map(label => {
                                                        const labelColor = getLabelColor(label.name);
                                                        return (
                                                            <div 
                                                                key={label.id} 
                                                                onClick={() => {
                                                                    handleAddLabel(label.id);
                                                                }}
                                                                style={{ 
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 8,
                                                                    padding: '8px 16px',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                }}
                                                            >
                                                                <div
                                                                    style={{ 
                                                                        width: 32,
                                                                        height: 4,
                                                                        borderRadius: 2,
                                                                        backgroundColor: labelColor,
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                                    }}
                                                                />
                                                                <Typography.Text style={{
                                                                    fontSize: '14px',
                                                                    fontWeight: 500
                                                                }}>
                                                                    {label.name}
                                                                </Typography.Text>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <Typography.Text 
                                                        style={{ 
                                                            color: 'rgba(0, 0, 0, 0.45)',
                                                            fontStyle: 'italic',
                                                            padding: '16px',
                                                            textAlign: 'center',
                                                            display: 'block'
                                                        }}
                                                    >
                                                        No labels found
                                                    </Typography.Text>
                                                )}
                                            </div>
                                        </div>
                                    }
                                >
                                    <div />
                                </Dropdown>
                            )}
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: '#64748b',
                                flexShrink: 0
                            }} />
                            <Typography.Text style={{ 
                                color: 'rgba(0, 0, 0, 0.65)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                Created: {createDate ? (
                                    <span style={{ 
                                        fontWeight: 700,
                                        color: '#1e293b'
                                    }}>
                                        {format(createDate, 'MMM d, yyyy HH:mm')}
                                    </span>
                                ) : 'N/A'}
                                {createDate && (
                                    <Typography.Text 
                                        style={{ 
                                            color: 'rgba(0, 0, 0, 0.45)',
                                            fontSize: '11px',
                                            fontStyle: 'italic'
                                        }}
                                    >
                                        ({formatDistanceToNow(createDate, { addSuffix: true })})
                                    </Typography.Text>
                                )}
                            </Typography.Text>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ 
                        display: 'flex', 
                        flex: 1,
                        overflow: 'hidden',
                        backgroundColor: '#f5f5f5'
                    }}>
                        {/* Left Column */}
                        <div style={{ 
                            flex: 1,
                            overflowY: 'auto',
                            padding: 24,
                            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
                            backgroundColor: '#f5f5f5'
                        }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <Spin size="large" />
                                </div>
                            ) : (
                                renderTabContent()
                            )}
                        </div>

                        {/* Right Column - Sidebar */}
                        <div style={{ 
                            width: 360,
                            overflowY: 'auto',
                            padding: 20,
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px'
                        }}>
                            <Space direction="vertical" size="large" style={{ width: '100%' }} divider={<Divider style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />}>
                                {/* Quick Links */}
                                {(shopUrl || crispUrl || safeCard.shortUrl) && (
                                                                    <Card style={{
                                    backgroundColor: '#ffffff',
                                    padding: 16,
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                    border: '1px solid rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.2s ease-in-out'
                                }}>
                                        <Typography.Title level={5} style={{ 
                                            color: '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            marginBottom: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            letterSpacing: '0.01em',
                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                            margin: 0,
                                            borderBottom: '2px solid rgba(0, 0, 0, 0.06)',
                                            paddingBottom: 12
                                        }}>
                                            📋 Informations
                                        </Typography.Title>
                                        <Space direction="horizontal" size="large" style={{ width: '100%' }}> 
                                            {shopUrl && (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                                    <a
                                                        href={shopUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            color: '#64748b',
                                                            textDecoration: 'none',
                                                            gap: 10,
                                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                                            borderRadius: '12px',
                                                            padding: 16,
                                                            position: 'relative',
                                                            width: '100%',
                                                            backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                            transition: 'all 0.3s ease-in-out',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                                            e.currentTarget.style.color = '#1e293b';
                                                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                                            e.currentTarget.style.color = '#64748b';
                                                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: 48,
                                                            height: 48,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                            color: '#64748b',
                                                            transition: 'all 0.3s ease-in-out',
                                                            border: '1px solid rgba(0, 0, 0, 0.06)'
                                                        }}>
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                                            </svg>
                                                        </div>
                                                        <Typography.Text style={{ 
                                                            fontSize: '14px', 
                                                            textAlign: 'center', 
                                                            fontWeight: 700,
                                                            letterSpacing: '0.02em',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            textTransform: 'capitalize',
                                                            lineHeight: 1.2,
                                                            color: 'inherit'
                                                        }}>
                                                            View Shop
                                                        </Typography.Text>
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            icon={<CopyOutlined />}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleCopyLink(shopUrl, 'Shop URL');
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                padding: 6,
                                                                color: '#94a3b8',
                                                                minWidth: 'auto',
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: '8px',
                                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                                                boxShadow: '0 3px 6px rgba(0, 0, 0, 0.12)',
                                                                transition: 'all 0.3s ease-in-out',
                                                                backdropFilter: 'blur(4px)'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                                                                e.currentTarget.style.color = '#64748b';
                                                                e.currentTarget.style.transform = 'scale(1.1)';
                                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                                                                e.currentTarget.style.color = '#94a3b8';
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                                e.currentTarget.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.12)';
                                                            }}
                                                        />
                                                    </a>
                                                </div>
                                            )}
                                            {crispUrl && (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                                    <a
                                                        href={crispUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            color: '#64748b',
                                                            textDecoration: 'none',
                                                            gap: 10,
                                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                                            borderRadius: '12px',
                                                            padding: 16,
                                                            position: 'relative',
                                                            width: '100%',
                                                            backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                            transition: 'all 0.3s ease-in-out',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                                            e.currentTarget.style.color = '#1e293b';
                                                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                                            e.currentTarget.style.color = '#64748b';
                                                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: 48,
                                                            height: 48,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '12px',
                                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                            color: '#64748b',
                                                            transition: 'all 0.3s ease-in-out',
                                                            border: '1px solid rgba(0, 0, 0, 0.06)'
                                                        }}>
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                                                            </svg>
                                                        </div>
                                                        <Typography.Text style={{ 
                                                            fontSize: '14px', 
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                            letterSpacing: '0.02em',
                                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                            textTransform: 'capitalize',
                                                            lineHeight: 1.2,
                                                            color: 'inherit'
                                                        }}>
                                                            View Chat
                                                        </Typography.Text>
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            icon={<CopyOutlined />}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleCopyLink(crispUrl, 'Chat URL');
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                padding: 2,
                                                                color: '#94a3b8',
                                                                minWidth: 'auto',
                                                                width: 24,
                                                                height: 24
                                                            }}
                                                        />
                                                    </a>
                                                </div>
                                            )}
                                        </Space>
                                        {safeCard.shortUrl && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 16, width: '100%' }}>
                                                <a
                                                    href={safeCard.shortUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        color: '#64748b',
                                                        textDecoration: 'none',
                                                        gap: 10,
                                                        border: '1px solid rgba(0, 0, 0, 0.08)',
                                                        borderRadius: '12px',
                                                        padding: 16,
                                                        position: 'relative',
                                                        width: '100%',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                        transition: 'all 0.3s ease-in-out',
                                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                                        e.currentTarget.style.color = '#1e293b';
                                                        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                                        e.currentTarget.style.color = '#64748b';
                                                        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                                    }}
                                                >
                                                    <div style={{ 
                                                        width: 48,
                                                        height: 48,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '12px',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                        color: '#64748b',
                                                        transition: 'all 0.3s ease-in-out',
                                                        border: '1px solid rgba(0, 0, 0, 0.06)'
                                                    }}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-15 1.5h15v15h-15v-15zM6 6h12v2H6V6zm0 4h12v2H6v-2zm0 4h12v2H6v-2z"/>
                                                        </svg>
                                                    </div>
                                                    <Typography.Text style={{ 
                                                        fontSize: '14px', 
                                                        textAlign: 'center',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.02em',
                                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                        textTransform: 'capitalize',
                                                        lineHeight: 1.2,
                                                        color: 'inherit'
                                                    }}>
                                                        View Trello
                                                    </Typography.Text>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<CopyOutlined />}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleCopyLink(safeCard.shortUrl, 'Trello URL');
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 4,
                                                            right: 4,
                                                            padding: 2,
                                                            color: '#94a3b8',
                                                            minWidth: 'auto',
                                                            width: 24,
                                                            height: 24
                                                        }}
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {/* Status */}
                                <Card style={{
                                    backgroundColor: '#ffffff',
                                    padding: 12,
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                                    border: '1px solid rgba(0, 0, 0, 0.06)'
                                }}>
                                    <Typography.Title level={5} style={{ 
                                            color: '#1e293b',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            marginBottom: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            margin: 0
                                    }}>
                                        List
                                    </Typography.Title>
                                    <div>
                                        <Button
                                            onClick={(e) => setListMenuAnchorEl(e.currentTarget)}
                                            style={{
                                                width: '100%',
                                                height: '40px',
                                                justifyContent: 'space-between',
                                                backgroundColor: '#f8fafc',
                                                border: '1px solid rgba(0, 0, 0, 0.12)',
                                                borderRadius: '8px',
                                                color: '#1e293b',
                                                padding: '0 16px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                <div 
                                                    style={{ 
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: '#1976d2',
                                                        flexShrink: 0
                                                    }} 
                                                />
                                                <Typography.Text 
                                                    style={{ 
                                                        fontSize: '14px', 
                                                        fontWeight: 500,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {lists.find(list => list.id === currentListId)?.name || 'Select List'}
                                                </Typography.Text>
                                            </div>
                                            <DownOutlined style={{ color: '#64748b' }} />
                                        </Button>

                                        <Dropdown
                                            open={listMenuOpen}
                                            onOpenChange={(open) => {
                                                if (!open) {
                                                    setListMenuAnchorEl(null);
                                                    setListSearch('');
                                                }
                                            }}
                                            trigger={['click']}
                                            overlay={
                                                <div style={{
                                                    marginTop: 4,
                                                    width: 320,
                                                    maxHeight: 400,
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                    borderRadius: '8px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #f0f0f0'
                                                }}>
                                                    <div style={{ padding: 8, position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                                        <Input
                                                            size="small"
                                                            placeholder="Search lists..."
                                                            value={listSearch}
                                                            onChange={(e) => setListSearch(e.target.value)}
                                                            prefix={<SearchOutlined />}
                                                            style={{
                                                                fontSize: '14px',
                                                                backgroundColor: '#f8fafc',
                                                                borderColor: 'rgba(0, 0, 0, 0.08)'
                                                            }}
                                                        />
                                                    </div>
                                            <Divider />
                                            <div style={{ 
                                                maxHeight: 320,
                                                overflow: 'auto',
                                                ...(filteredLists.length === 0 && {
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    padding: '16px 0'
                                                })
                                            }}>
                                                {filteredLists.length > 0 ? (
                                                    filteredLists.map(list => (
                                                        <div 
                                                            key={list.id}
                                                            onClick={() => {
                                                                handleMoveList(list.id);
                                                                setListMenuAnchorEl(null);
                                                                setListSearch('');
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                minHeight: '40px',
                                                                padding: '8px 16px',
                                                                cursor: 'pointer'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                            }}
                                                        >
                                                            <div 
                                                                style={{ 
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: currentListId === list.id ? '#1976d2' : 'rgba(0, 0, 0, 0.12)',
                                                                    flexShrink: 0
                                                                }} 
                                                            />
                                                            <Typography.Text 
                                                                style={{ 
                                                                    fontSize: '14px',
                                                                    fontWeight: currentListId === list.id ? 500 : 400,
                                                                    color: currentListId === list.id ? '#1976d2' : 'rgba(0, 0, 0, 0.85)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: '250px'
                                                                }}
                                                            >
                                                                {list.name}
                                                            </Typography.Text>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <Typography.Text 
                                                        style={{ 
                                                            color: 'rgba(0, 0, 0, 0.45)',
                                                            fontStyle: 'italic',
                                                            padding: '16px',
                                                            textAlign: 'center',
                                                            display: 'block'
                                                        }}
                                                    >
                                                        No lists found
                                                    </Typography.Text>
                                                )}
                                            </div>
                                        </div>
                                    }
                                >
                                    <div />
                                </Dropdown>
                                    </div>
                                </Card>

                                {/* Assignees */}
                                {renderSidebarField(
                                    'Assignees',
                                    <Space direction="vertical" size="small">
                                        <Space direction="horizontal" size="small" wrap>
                                            {agents.map(agent => (
                                                <Tag
                                                    key={agent.id}
                                                    closable
                                                    onClose={() => handleRemoveMember(agent.id)}
                                                    style={{
                                                        height: '28px',
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                        color: '#1976d2',
                                                        fontWeight: 500,
                                                        fontSize: '14px',
                                                        border: '1px solid rgba(25, 118, 210, 0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Avatar
                                                        src={agent.avatarUrl}
                                                        size={16}
                                                        style={{ 
                                                            backgroundColor: '#1976d2',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {agent.initials}
                                                    </Avatar>
                                                    {agent.username || agent.fullName}
                                                </Tag>
                                            ))}
                                        </Space>
                                        {availableAgents.length > 0 && (
                                            <>
                                                <Button
                                                    onClick={(event) => {
                                                        setAssigneeMenuAnchorEl(event.currentTarget);
                                                        setAssigneeMenuOpen(true);
                                                    }}
                                                    icon={<PlusOutlined />}
                                                    style={{ 
                                                        color: '#1976d2',
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                        fontWeight: 500,
                                                        fontSize: '14px',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        width: 'fit-content'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.12)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
                                                    }}
                                                >
                                                    Add Assignee
                                                </Button>
                                                <Dropdown
                                                    open={assigneeMenuOpen}
                                                    onOpenChange={(open) => {
                                                        if (!open) {
                                                            setAssigneeMenuOpen(false);
                                                            setAssigneeSearch('');
                                                        }
                                                    }}
                                                    trigger={['click']}
                                                    overlay={
                                                        <div style={{
                                                            marginTop: 4,
                                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                                            borderRadius: '8px',
                                                            minWidth: '250px',
                                                            maxHeight: '400px',
                                                            backgroundColor: 'white',
                                                            border: '1px solid #f0f0f0'
                                                        }}>
                                                    <div style={{ padding: 8, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                                        <Input
                                                            size="small"
                                                            placeholder="Search members..."
                                                            value={assigneeSearch}
                                                            onChange={(e) => setAssigneeSearch(e.target.value)}
                                                            prefix={<SearchOutlined />}
                                                            style={{
                                                                fontSize: '14px',
                                                                borderColor: 'rgba(0, 0, 0, 0.08)'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ 
                                                        maxHeight: 300,
                                                        overflow: 'auto',
                                                        ...(filteredAgents.length === 0 && {
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            padding: '16px 0'
                                                        })
                                                    }}>
                                                        {filteredAgents.length > 0 ? (
                                                            filteredAgents.map(agent => {
                                                                const avatarUrl = agent.avatarUrl || agent.avatarHash ? 
                                                                    `https://trello-members.s3.amazonaws.com/${agent.id}/${agent.avatarHash}/170.png` : 
                                                                    null;
                                                                
                                                                return (
                                                                    <div 
                                                                        key={agent.id} 
                                                                        onClick={() => {
                                                                            handleAgentSelect({ target: { value: agent.id }});
                                                                            setAssigneeMenuOpen(false);
                                                                            setAssigneeSearch('');
                                                                        }}
                                                                        style={{ 
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 8,
                                                                            padding: '8px 16px',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        <Avatar
                                                                            src={avatarUrl}
                                                                            size={24}
                                                                            style={{ 
                                                                                backgroundColor: '#1976d2',
                                                                                fontSize: '12px',
                                                                                fontWeight: 500
                                                                            }}
                                                                        >
                                                                            {agent.initials}
                                                                        </Avatar>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <Typography.Text style={{ 
                                                                                fontSize: '14px', 
                                                                                fontWeight: 500,
                                                                                color: 'rgba(0, 0, 0, 0.85)',
                                                                                lineHeight: 1.2
                                                                            }}>
                                                                                {agent.username || agent.fullName}
                                                                            </Typography.Text>
                                                                            {agent.username && agent.fullName && agent.username !== agent.fullName && (
                                                                                <Typography.Text style={{ 
                                                                                    color: 'rgba(0, 0, 0, 0.45)',
                                                                                    fontSize: '12px',
                                                                                    lineHeight: 1.2
                                                                                }}>
                                                                                    {agent.fullName}
                                                                                </Typography.Text>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <Typography.Text 
                                                                style={{ 
                                                                    color: 'rgba(0, 0, 0, 0.45)',
                                                                    fontStyle: 'italic',
                                                                    padding: '16px',
                                                                    textAlign: 'center',
                                                                    display: 'block'
                                                                }}
                                                            >
                                                                No members found
                                                            </Typography.Text>
                                                        )}
                                                    </div>
                                                </div>
                                            }
                                        >
                                            <div />
                                        </Dropdown>
                                            </>
                                        )}
                                    </Space>
                                )}

                                {/* Resolution Times */}
                                {renderResolutionTimes()}

                                {/* QA Box */}
                                <Card style={{
                                    backgroundColor: '#ffffff',
                                    padding: 16,
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                    border: '1px solid rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.2s ease-in-out'
                                }}>
                                    <Typography.Title 
                                        level={5} 
                                        style={{ 
                                            color: '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            marginBottom: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            letterSpacing: '0.01em',
                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                            margin: 0,
                                            borderBottom: '2px solid rgba(0, 0, 0, 0.06)',
                                            paddingBottom: 12
                                        }}
                                    >
                                        🔍 QA Review
                                    </Typography.Title>
                                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                        <Input.TextArea
                                            value={qaNotes}
                                            onChange={(e) => setQaNotes(e.target.value)}
                                            placeholder="Enter QA notes, feedback, or review comments..."
                                            rows={4}
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                borderColor: 'rgba(0, 0, 0, 0.08)',
                                                borderRadius: '8px',
                                                padding: '12px 16px',
                                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                transition: 'all 0.2s ease-in-out',
                                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                                resize: 'vertical'
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Typography.Text style={{ 
                                                fontSize: '14px', 
                                                fontWeight: 600, 
                                                color: '#374151',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Penalty Points:
                                            </Typography.Text>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={penaltyPoints}
                                                onChange={(e) => setPenaltyPoints(e.target.value)}
                                                placeholder="0"
                                                style={{
                                                    backgroundColor: '#f8fafc',
                                                    fontSize: '0.9rem',
                                                    borderColor: 'rgba(0, 0, 0, 0.08)',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                    transition: 'all 0.2s ease-in-out',
                                                    border: '1px solid rgba(0, 0, 0, 0.06)',
                                                    width: '80px'
                                                }}
                                            />
                                        </div>
                                        <Button
                                            type="primary"
                                            onClick={handleQASubmit}
                                            disabled={qaLoading || !qaNotes.trim()}
                                            loading={qaLoading}
                                            style={{
                                                width: '100%',
                                                padding: '12px 20px',
                                                backgroundColor: qaLoading || !qaNotes.trim() ? '#94a3b8' : '#3b82f6',
                                                color: '#ffffff',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                height: '44px',
                                                boxShadow: qaLoading || !qaNotes.trim() ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)',
                                                transition: 'all 0.3s ease-in-out',
                                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                                letterSpacing: '0.02em'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!qaLoading && qaNotes.trim()) {
                                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!qaLoading && qaNotes.trim()) {
                                                    e.currentTarget.style.backgroundColor = '#3b82f6';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                                }
                                            }}
                                        >
                                            {qaLoading ? 'Submitting...' : 'Submit QA Review'}
                                        </Button>
                                    </Space>
                                </Card>
                            </Space>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Confirm Dialog */}
            <Modal
                open={confirmOpen}
                onCancel={() => setConfirmOpen(false)}
                title="Confirm Action"
                onOk={handleConfirm}
                okText="Confirm"
                cancelText="Cancel"
                style={{
                    borderRadius: 8,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                }}
            >
                <Typography.Text>
                    {confirmAction?.message}
                </Typography.Text>
            </Modal>
        </>
    );
};

export default CardDetailModal;