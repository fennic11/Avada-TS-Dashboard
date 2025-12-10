import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Chip,
    IconButton,
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    Card,
    CardContent,
    Divider,
    Avatar,
    AvatarGroup
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import StorageIcon from '@mui/icons-material/Storage';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { getCardsByList } from '../api/trelloApi';
import { getCardsCreate } from '../api/cardCreateApi';

// List IDs
const NEW_ISSUES_LIST_ID = '66262386cb856f894f7cdca2';
const DOING_LIST_ID = '64c0e7d742b8d2b000f342e3';

const MobileView = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [trelloCards, setTrelloCards] = useState([]);
    const [dbCards, setDbCards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [selectedDate, setSelectedDate] = useState(dayjs());

    // Fetch Trello cards
    const fetchTrelloCards = useCallback(async () => {
        setIsLoading(true);
        try {
            const [newIssues, doing] = await Promise.all([
                getCardsByList(NEW_ISSUES_LIST_ID),
                getCardsByList(DOING_LIST_ID)
            ]);

            const allCards = [
                ...(newIssues || []).map(card => ({ ...card, listName: 'New Issues' })),
                ...(doing || []).map(card => ({ ...card, listName: 'Doing' }))
            ];

            setTrelloCards(allCards);
            setLastRefresh(dayjs().format('HH:mm:ss'));
        } catch (error) {
            console.error('Error fetching Trello cards:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch Database cards
    const fetchDbCards = useCallback(async () => {
        setIsLoading(true);
        try {
            const dateStr = selectedDate.format('YYYY-MM-DD');
            const result = await getCardsCreate(dateStr, dateStr);
            setDbCards(result.data || []);
            setLastRefresh(dayjs().format('HH:mm:ss'));
        } catch (error) {
            console.error('Error fetching DB cards:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    // Initial fetch
    useEffect(() => {
        if (activeTab === 0) {
            fetchTrelloCards();
        } else {
            fetchDbCards();
        }
    }, [activeTab, fetchTrelloCards, fetchDbCards]);

    // Handle refresh
    const handleRefresh = () => {
        if (activeTab === 0) {
            fetchTrelloCards();
        } else {
            fetchDbCards();
        }
    };

    // Handle date change
    const handleDateChange = (date) => {
        setSelectedDate(date);
    };

    // Refetch when date changes (for DB tab)
    useEffect(() => {
        if (activeTab === 1) {
            fetchDbCards();
        }
    }, [selectedDate, activeTab, fetchDbCards]);

    // Render card item
    const renderTrelloCard = (card) => (
        <Card
            key={card.id}
            sx={{
                mb: 1.5,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e0e0e0'
            }}
            onClick={() => window.open(card.shortUrl || card.url, '_blank')}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* List badge */}
                <Chip
                    label={card.listName}
                    size="small"
                    sx={{
                        mb: 1,
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: card.listName === 'New Issues' ? '#ffebee' : '#e3f2fd',
                        color: card.listName === 'New Issues' ? '#c62828' : '#1565c0'
                    }}
                />

                {/* Card name */}
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {card.name}
                </Typography>

                {/* Labels */}
                {card.labels && card.labels.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {card.labels.slice(0, 3).map((label, idx) => (
                            <Chip
                                key={idx}
                                label={label.name || label}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    bgcolor: label.color ? `${label.color}20` : '#e0e0e0',
                                    color: label.color || '#666'
                                }}
                            />
                        ))}
                        {card.labels.length > 3 && (
                            <Chip
                                label={`+${card.labels.length - 3}`}
                                size="small"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                        )}
                    </Box>
                )}

                {/* Members */}
                {card.members && card.members.length > 0 && (
                    <AvatarGroup max={4} sx={{ justifyContent: 'flex-start' }}>
                        {card.members.map((member, idx) => (
                            <Avatar
                                key={idx}
                                src={member.avatarUrl}
                                sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                            >
                                {member.initials || member.fullName?.charAt(0)}
                            </Avatar>
                        ))}
                    </AvatarGroup>
                )}

                {/* Open link icon */}
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <OpenInNewIcon sx={{ fontSize: 16, color: '#999' }} />
                </Box>
            </CardContent>
        </Card>
    );

    const renderDbCard = (card) => (
        <Card
            key={card._id || card.cardId}
            sx={{
                mb: 1.5,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e0e0e0'
            }}
            onClick={() => card.cardUrl && window.open(card.cardUrl, '_blank')}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Due complete status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {card.dueComplete ? (
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                    ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: '#9e9e9e' }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                        {card.dueComplete ? 'Completed' : 'In Progress'}
                    </Typography>
                </Box>

                {/* Card name */}
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {card.cardName}
                </Typography>

                {/* Labels */}
                {card.labels && card.labels.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {card.labels.slice(0, 3).map((label, idx) => (
                            <Chip
                                key={idx}
                                label={typeof label === 'string' ? label : label.name}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    bgcolor: '#e3f2fd',
                                    color: '#1565c0'
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Created at */}
                {card.createdAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Created: {(() => {
                            const d = new Date(card.createdAt);
                            const day = String(d.getUTCDate()).padStart(2, '0');
                            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                            const hours = String(d.getUTCHours()).padStart(2, '0');
                            const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                            return `${day}/${month} ${hours}:${minutes}`;
                        })()}
                    </Typography>
                )}

                {/* Open link icon */}
                {card.cardUrl && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <OpenInNewIcon sx={{ fontSize: 16, color: '#999' }} />
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 480,
            margin: '0 auto'
        }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    borderRadius: 0,
                    bgcolor: '#1976d2',
                    color: 'white',
                    px: 2,
                    py: 1.5
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                            {activeTab === 0 ? 'Trello Cards' : 'Database Cards'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {activeTab === 0
                                ? `${trelloCards.length} cards`
                                : `${dbCards.length} cards - ${selectedDate.format('DD/MM/YYYY')}`
                            }
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {lastRefresh && (
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {lastRefresh}
                            </Typography>
                        )}
                        <IconButton
                            onClick={handleRefresh}
                            disabled={isLoading}
                            sx={{ color: 'white' }}
                        >
                            {isLoading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <RefreshIcon />
                            )}
                        </IconButton>
                    </Box>
                </Box>

                {/* Date picker for DB tab */}
                {activeTab === 1 && (
                    <Box sx={{ mt: 1.5 }}>
                        <DatePicker
                            value={selectedDate}
                            onChange={handleDateChange}
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            size="small"
                        />
                    </Box>
                )}
            </Paper>

            {/* Content */}
            <Box sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                pb: 10
            }}>
                {isLoading && (activeTab === 0 ? trelloCards : dbCards).length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {activeTab === 0 ? (
                            trelloCards.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <ViewKanbanIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No cards in New Issues or Doing
                                    </Typography>
                                </Box>
                            ) : (
                                trelloCards.map(renderTrelloCard)
                            )
                        ) : (
                            dbCards.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <StorageIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No cards for this date
                                    </Typography>
                                </Box>
                            ) : (
                                dbCards.map(renderDbCard)
                            )
                        )}
                    </>
                )}
            </Box>

            {/* Bottom Navigation */}
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxWidth: 480,
                    margin: '0 auto'
                }}
                elevation={3}
            >
                <BottomNavigation
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    showLabels
                >
                    <BottomNavigationAction
                        label="Trello"
                        icon={<ViewKanbanIcon />}
                    />
                    <BottomNavigationAction
                        label="Database"
                        icon={<StorageIcon />}
                    />
                </BottomNavigation>
            </Paper>
        </Box>
    );
};

export default MobileView;
