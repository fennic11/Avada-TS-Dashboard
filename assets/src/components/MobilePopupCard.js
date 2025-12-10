import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Chip,
    IconButton,
    CircularProgress,
    Divider,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PersonIcon from '@mui/icons-material/Person';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LabelIcon from '@mui/icons-material/Label';
import AssignmentIcon from '@mui/icons-material/Assignment';
import membersData from '../data/members.json';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://us-central1-avada-apps-hub.cloudfunctions.net/api';

// Create member lookup map
const memberMap = membersData.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
}, {});

// Get action icon based on type
const getActionIcon = (type) => {
    switch (type) {
        case 'commentCard':
            return <CommentIcon sx={{ fontSize: 16 }} />;
        case 'updateCard':
            return <EditIcon sx={{ fontSize: 16 }} />;
        case 'createCard':
            return <AddIcon sx={{ fontSize: 16 }} />;
        case 'addMemberToCard':
        case 'removeMemberFromCard':
            return <PersonIcon sx={{ fontSize: 16 }} />;
        case 'moveCardToBoard':
        case 'moveCardFromBoard':
            return <SwapHorizIcon sx={{ fontSize: 16 }} />;
        case 'addLabelToCard':
        case 'removeLabelFromCard':
            return <LabelIcon sx={{ fontSize: 16 }} />;
        default:
            return <AssignmentIcon sx={{ fontSize: 16 }} />;
    }
};

// Get action description
const getActionDescription = (action) => {
    const { type, data } = action;
    const memberName = action.memberCreator?.fullName || 'Someone';

    switch (type) {
        case 'commentCard':
            return {
                title: `${memberName} commented`,
                detail: data.text || ''
            };
        case 'createCard':
            return {
                title: `${memberName} created this card`,
                detail: data.list?.name ? `in ${data.list.name}` : ''
            };
        case 'updateCard':
            if (data.listAfter && data.listBefore) {
                return {
                    title: `${memberName} moved card`,
                    detail: `${data.listBefore.name} ’ ${data.listAfter.name}`
                };
            }
            if (data.card?.dueComplete !== undefined) {
                return {
                    title: `${memberName} ${data.card.dueComplete ? 'completed' : 'uncompleted'} due date`,
                    detail: ''
                };
            }
            if (data.old?.desc !== undefined) {
                return {
                    title: `${memberName} updated description`,
                    detail: ''
                };
            }
            return {
                title: `${memberName} updated card`,
                detail: ''
            };
        case 'addMemberToCard':
            return {
                title: `${memberName} added member`,
                detail: data.member?.name || ''
            };
        case 'removeMemberFromCard':
            return {
                title: `${memberName} removed member`,
                detail: data.member?.name || ''
            };
        case 'addLabelToCard':
            return {
                title: `${memberName} added label`,
                detail: data.label?.name || data.label?.color || ''
            };
        case 'removeLabelFromCard':
            return {
                title: `${memberName} removed label`,
                detail: data.label?.name || data.label?.color || ''
            };
        default:
            return {
                title: `${memberName} performed action`,
                detail: type
            };
    }
};

// Format time ago
const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const MobilePopupCard = ({ open, onClose, card, cardId }) => {
    const [cardData, setCardData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && cardId) {
            fetchCardWithActions();
        }
    }, [open, cardId]);

    const fetchCardWithActions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/cards/trello/${cardId}/actions`);
            if (!response.ok) {
                throw new Error('Failed to fetch card data');
            }
            const data = await response.json();
            setCardData(data);
        } catch (err) {
            console.error('Error fetching card:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Use passed card data or fetched data
    const displayCard = cardData || card;

    // Get member names for display
    const getMemberNames = (memberIds) => {
        if (!memberIds || memberIds.length === 0) return [];
        return memberIds.map(id => memberMap[id]?.fullName || memberMap[id]?.username || 'Unknown');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    maxHeight: '90vh',
                    m: 1
                }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                pb: 1,
                pr: 1
            }}>
                <Box sx={{ flex: 1, pr: 1 }}>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 600,
                            lineHeight: 1.3,
                            fontSize: '0.95rem'
                        }}
                    >
                        {displayCard?.name || displayCard?.cardName || 'Card Details'}
                    </Typography>
                    {displayCard?.dueComplete !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            {displayCard.dueComplete ? (
                                <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                            ) : (
                                <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />
                            )}
                            <Typography variant="caption" color="text.secondary">
                                {displayCard.dueComplete ? 'Completed' : 'In progress'}
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={() => window.open(displayCard?.shortUrl || displayCard?.cardUrl, '_blank')}
                    >
                        <OpenInNewIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 0 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : error ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                ) : (
                    <>
                        {/* Labels */}
                        {displayCard?.labels && displayCard.labels.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    Labels
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {displayCard.labels.map((label, idx) => (
                                        <Chip
                                            key={idx}
                                            label={label.name || label}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: '0.7rem',
                                                bgcolor: label.color || '#e0e0e0',
                                                color: label.color ? '#fff' : 'inherit'
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Members */}
                        {displayCard?.idMembers && displayCard.idMembers.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    Members
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {getMemberNames(displayCard.idMembers).map((name, idx) => (
                                        <Chip
                                            key={idx}
                                            avatar={<Avatar sx={{ width: 20, height: 20 }}>{name.charAt(0)}</Avatar>}
                                            label={name}
                                            size="small"
                                            sx={{ height: 24, fontSize: '0.7rem' }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Description */}
                        {displayCard?.desc && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    Description
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 0.5,
                                        p: 1,
                                        bgcolor: '#f5f5f5',
                                        borderRadius: 1,
                                        fontSize: '0.8rem',
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {displayCard.desc.length > 300
                                        ? displayCard.desc.substring(0, 300) + '...'
                                        : displayCard.desc}
                                </Typography>
                            </Box>
                        )}

                        <Divider sx={{ my: 1.5 }} />

                        {/* Actions */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Activity ({cardData?.actions?.length || 0})
                            </Typography>

                            {cardData?.actions && cardData.actions.length > 0 ? (
                                <List dense sx={{ pt: 0.5 }}>
                                    {cardData.actions.slice(0, 20).map((action, idx) => {
                                        const actionInfo = getActionDescription(action);
                                        return (
                                            <ListItem
                                                key={idx}
                                                sx={{
                                                    px: 0,
                                                    py: 0.5,
                                                    alignItems: 'flex-start'
                                                }}
                                            >
                                                <ListItemAvatar sx={{ minWidth: 36 }}>
                                                    <Avatar
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            bgcolor: action.type === 'commentCard' ? '#1976d2' : '#9e9e9e'
                                                        }}
                                                    >
                                                        {getActionIcon(action.type)}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                                                {actionInfo.title}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                                {formatTimeAgo(action.date)}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={actionInfo.detail && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                color: 'text.secondary',
                                                                fontSize: '0.75rem',
                                                                whiteSpace: 'pre-wrap',
                                                                maxHeight: 60,
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {actionInfo.detail}
                                                        </Typography>
                                                    )}
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    No activity found
                                </Typography>
                            )}
                        </Box>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default MobilePopupCard;
