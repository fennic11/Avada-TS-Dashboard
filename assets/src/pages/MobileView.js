import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Avatar,
    Collapse,
    Badge,
    LinearProgress,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import StorageIcon from '@mui/icons-material/Storage';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PendingIcon from '@mui/icons-material/Pending';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';
import SpeedIcon from '@mui/icons-material/Speed';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import membersData from '../data/members.json';
import appData from '../data/app.json';
import MobilePopupCard from '../components/MobilePopupCard';

dayjs.extend(weekOfYear);

// API base URL for backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://us-central1-avada-apps-hub.cloudfunctions.net/api';

// Get TS members from members.json
const TS_MEMBERS = membersData.filter(m => m.role === 'TS' || m.role === 'ts-lead');

// Get unique product teams and TS groups from app.json
const PRODUCT_TEAMS = [...new Set(appData.map(app => app.product_team))];
const TS_GROUPS = [...new Set(appData.map(app => app.group_ts))];

// 6 shifts definition (Vietnam time)
const SHIFTS = [
    { id: 1, name: 'Ca 1', start: 0, end: 4, color: '#7c4dff' },      // 00:00 - 04:00
    { id: 2, name: 'Ca 2', start: 4, end: 8, color: '#448aff' },      // 04:00 - 08:00
    { id: 3, name: 'Ca 3', start: 8, end: 12, color: '#00bfa5' },     // 08:00 - 12:00
    { id: 4, name: 'Ca 4', start: 12, end: 16, color: '#ffab00' },    // 12:00 - 16:00
    { id: 5, name: 'Ca 5', start: 16, end: 20, color: '#ff6d00' },    // 16:00 - 20:00
    { id: 6, name: 'Ca 6', start: 20, end: 24, color: '#d50000' }     // 20:00 - 24:00
];

// Get shift from hour
const getShiftFromHour = (hour) => {
    return SHIFTS.find(s => hour >= s.start && hour < s.end) || SHIFTS[0];
};

// Fetch Trello cards from backend
const getCardsByListFromBackend = async (listId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/cards/list/${listId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch cards: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching cards from backend:', error);
        return [];
    }
};

// Fetch resolution time cards from backend
const getResolutionTimesFromBackend = async (startDate, endDate) => {
    try {
        const params = new URLSearchParams({ start: startDate, end: endDate });
        const response = await fetch(`${API_BASE_URL}/cards?${params}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch resolution times: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching resolution times:', error);
        return [];
    }
};

// Fetch database cards from backend
const getCardsCreateFromBackend = async (startDate, endDate) => {
    try {
        let url = `${API_BASE_URL}/cards-create`;
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch cards: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching cards from backend:', error);
        return { data: [] };
    }
};

// List IDs
const NEW_ISSUES_LIST_ID = '66262386cb856f894f7cdca2';
const DOING_LIST_ID = '64c0e7d742b8d2b000f342e3';

// Status colors
const STATUS_COLORS = {
    pending: { bg: '#fff3e0', color: '#e65100', icon: PendingIcon },
    doing: { bg: '#e3f2fd', color: '#1565c0', icon: PlayCircleIcon },
    done: { bg: '#e8f5e9', color: '#2e7d32', icon: CheckCircleIcon }
};

const MobileView = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [trelloCards, setTrelloCards] = useState([]);
    const [dbCards, setDbCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [popupOpen, setPopupOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [expandedMembers, setExpandedMembers] = useState({});
    const [expandedShifts, setExpandedShifts] = useState({});
    const [resolutionCards, setResolutionCards] = useState([]);
    const [dateRange, setDateRange] = useState('day'); // 'day', 'week', 'month'

    // Calculate date range based on selection
    const getDateRange = useCallback(() => {
        const today = selectedDate;
        let startDate, endDate;

        switch (dateRange) {
            case 'week':
                startDate = today.startOf('week');
                endDate = today.endOf('week');
                break;
            case 'month':
                startDate = today.startOf('month');
                endDate = today.endOf('month');
                break;
            default: // day
                startDate = today;
                endDate = today;
        }

        return {
            start: startDate.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
        };
    }, [selectedDate, dateRange]);

    // Fetch Trello cards from backend
    const fetchTrelloCards = useCallback(async () => {
        setIsLoading(true);
        try {
            const [newIssues, doing] = await Promise.all([
                getCardsByListFromBackend(NEW_ISSUES_LIST_ID),
                getCardsByListFromBackend(DOING_LIST_ID)
            ]);

            const allCards = [
                ...(newIssues || []).map(card => ({ ...card, listName: 'New Issues', status: 'pending' })),
                ...(doing || []).map(card => ({
                    ...card,
                    listName: 'Doing',
                    status: card.dueComplete ? 'done' : 'doing'
                }))
            ];

            setTrelloCards(allCards);
            setLastRefresh(dayjs().format('HH:mm:ss'));

            // Auto-expand all members initially
            const initialExpanded = {};
            TS_MEMBERS.forEach(m => {
                initialExpanded[m.id] = true;
            });
            setExpandedMembers(initialExpanded);
        } catch (error) {
            console.error('Error fetching Trello cards:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch Database cards from backend
    const fetchDbCards = useCallback(async () => {
        setIsLoading(true);
        try {
            const { start, end } = getDateRange();
            const result = await getCardsCreateFromBackend(start, end);
            setDbCards(result.data || []);
            setLastRefresh(dayjs().format('HH:mm:ss'));

            // Auto-expand all shifts
            const initialExpanded = {};
            SHIFTS.forEach(s => {
                initialExpanded[s.id] = true;
            });
            setExpandedShifts(initialExpanded);
        } catch (error) {
            console.error('Error fetching DB cards:', error);
        } finally {
            setIsLoading(false);
        }
    }, [getDateRange]);

    // Fetch Resolution Time cards from backend
    const fetchResolutionCards = useCallback(async () => {
        setIsLoading(true);
        try {
            const { start, end } = getDateRange();
            const result = await getResolutionTimesFromBackend(start, end);
            setResolutionCards(result || []);
            setLastRefresh(dayjs().format('HH:mm:ss'));
        } catch (error) {
            console.error('Error fetching resolution cards:', error);
        } finally {
            setIsLoading(false);
        }
    }, [getDateRange]);

    // Group cards by TS member and status
    const groupedCards = useMemo(() => {
        const groups = {};

        TS_MEMBERS.forEach(member => {
            groups[member.id] = {
                member,
                pending: [],
                doing: [],
                done: []
            };
        });

        // Group for unassigned or non-TS cards
        groups['unassigned'] = {
            member: { id: 'unassigned', fullName: 'Unassigned', username: 'unassigned' },
            pending: [],
            doing: [],
            done: []
        };

        trelloCards.forEach(card => {
            const memberIds = card.idMembers || [];
            let assigned = false;

            memberIds.forEach(memberId => {
                if (groups[memberId]) {
                    groups[memberId][card.status].push(card);
                    assigned = true;
                }
            });

            if (!assigned) {
                groups['unassigned'][card.status].push(card);
            }
        });

        // Filter out members with no cards
        return Object.values(groups).filter(
            g => g.pending.length > 0 || g.doing.length > 0 || g.done.length > 0
        );
    }, [trelloCards]);

    // Calculate total cards for Trello
    const totalCards = useMemo(() => {
        return groupedCards.reduce((acc, g) => ({
            pending: acc.pending + g.pending.length,
            doing: acc.doing + g.doing.length,
            done: acc.done + g.done.length
        }), { pending: 0, doing: 0, done: 0 });
    }, [groupedCards]);

    // Process DB cards by shift, product team, and TS group
    const dbCardsAnalysis = useMemo(() => {
        const byShift = {};
        const byProductTeam = {};
        const byTsGroup = {};

        // Initialize shifts
        SHIFTS.forEach(shift => {
            byShift[shift.id] = { shift, cards: [], count: 0 };
        });

        // Initialize product teams
        PRODUCT_TEAMS.forEach(team => {
            byProductTeam[team] = { name: team, cards: [], count: 0 };
        });
        byProductTeam['Other'] = { name: 'Other', cards: [], count: 0 };

        // Initialize TS groups
        TS_GROUPS.forEach(group => {
            byTsGroup[group] = { name: group, cards: [], count: 0 };
        });
        byTsGroup['Other'] = { name: 'Other', cards: [], count: 0 };

        dbCards.forEach(card => {
            // Get hour from createdAt (UTC stored as VN time)
            const createdAt = new Date(card.createdAt);
            const hour = createdAt.getUTCHours();
            const shift = getShiftFromHour(hour);

            byShift[shift.id].cards.push(card);
            byShift[shift.id].count++;

            // Find product team and TS group from labels
            const labels = card.labels || [];
            let foundTeam = false;
            let foundGroup = false;

            labels.forEach(label => {
                const labelName = typeof label === 'string' ? label : label.name;
                const appInfo = appData.find(app =>
                    app.label_trello.toLowerCase() === labelName?.toLowerCase()
                );

                if (appInfo) {
                    if (!foundTeam) {
                        byProductTeam[appInfo.product_team].cards.push(card);
                        byProductTeam[appInfo.product_team].count++;
                        foundTeam = true;
                    }
                    if (!foundGroup) {
                        byTsGroup[appInfo.group_ts].cards.push(card);
                        byTsGroup[appInfo.group_ts].count++;
                        foundGroup = true;
                    }
                }
            });

            if (!foundTeam) {
                byProductTeam['Other'].cards.push(card);
                byProductTeam['Other'].count++;
            }
            if (!foundGroup) {
                byTsGroup['Other'].cards.push(card);
                byTsGroup['Other'].count++;
            }
        });

        return {
            byShift: Object.values(byShift),
            byProductTeam: Object.values(byProductTeam).filter(t => t.count > 0),
            byTsGroup: Object.values(byTsGroup).filter(g => g.count > 0),
            total: dbCards.length
        };
    }, [dbCards]);

    // Process resolution time cards
    const resolutionAnalysis = useMemo(() => {
        if (!resolutionCards || resolutionCards.length === 0) {
            return { cards: [], avgTotal: 0, avgTs: 0, avgFirst: 0, byMember: [] };
        }

        // Filter cards with valid resolution times
        const validCards = resolutionCards.filter(card =>
            card.resolutionTime !== null && card.resolutionTime !== undefined
        );

        // Calculate averages
        const totalResolution = validCards.reduce((sum, card) => sum + (card.resolutionTime || 0), 0);
        const totalTs = validCards.reduce((sum, card) => sum + (card.TSResolutionTime || 0), 0);
        const totalFirst = validCards.reduce((sum, card) => sum + (card.firstActionTime || 0), 0);

        const avgTotal = validCards.length > 0 ? Math.round(totalResolution / validCards.length) : 0;
        const avgTs = validCards.length > 0 ? Math.round(totalTs / validCards.length) : 0;
        const avgFirst = validCards.length > 0 ? Math.round(totalFirst / validCards.length) : 0;

        // Initialize byMember with TS members from members.json (using member ID as key)
        const byMember = {};
        TS_MEMBERS.forEach(member => {
            byMember[member.id] = {
                id: member.id,
                name: member.fullName,
                kpiName: member.kpiName,
                cards: [],
                totalResolution: 0,
                totalTs: 0,
                count: 0
            };
        });

        // Group cards by TS member (match by member ID in card.members array)
        validCards.forEach(card => {
            const cardMemberIds = card.members || [];

            // Find TS members in this card's members array
            cardMemberIds.forEach(memberId => {
                if (byMember[memberId]) {
                    byMember[memberId].cards.push(card);
                    byMember[memberId].totalResolution += card.resolutionTime || 0;
                    byMember[memberId].totalTs += card.TSResolutionTime || card.resolutionTimeTS || 0;
                    byMember[memberId].count++;
                }
            });
        });

        // Calculate averages per member and filter out members with no cards
        const memberStats = Object.values(byMember)
            .filter(m => m.count > 0)
            .map(m => ({
                ...m,
                avgResolution: Math.round(m.totalResolution / m.count),
                avgTs: Math.round(m.totalTs / m.count)
            }))
            .sort((a, b) => a.avgResolution - b.avgResolution);

        // Sort cards by resolution time (highest to lowest)
        const sortedCards = [...validCards].sort((a, b) =>
            (b.resolutionTime || 0) - (a.resolutionTime || 0)
        );

        return {
            cards: sortedCards,
            avgTotal,
            avgTs,
            avgFirst,
            byMember: memberStats
        };
    }, [resolutionCards]);

    // Initial fetch
    useEffect(() => {
        if (activeTab === 0) {
            fetchTrelloCards();
        } else if (activeTab === 1) {
            fetchDbCards();
        } else if (activeTab === 2) {
            fetchResolutionCards();
        }
    }, [activeTab, fetchTrelloCards, fetchDbCards, fetchResolutionCards]);

    // Handle refresh
    const handleRefresh = () => {
        if (activeTab === 0) {
            fetchTrelloCards();
        } else if (activeTab === 1) {
            fetchDbCards();
        } else if (activeTab === 2) {
            fetchResolutionCards();
        }
    };

    // Handle date change
    const handleDateChange = (date) => {
        setSelectedDate(date);
    };

    // Toggle member expansion
    const toggleMember = (memberId) => {
        setExpandedMembers(prev => ({
            ...prev,
            [memberId]: !prev[memberId]
        }));
    };

    // Toggle shift expansion
    const toggleShift = (shiftId) => {
        setExpandedShifts(prev => ({
            ...prev,
            [shiftId]: !prev[shiftId]
        }));
    };

    // Refetch when date or date range changes (for DB tab and Resolution tab)
    useEffect(() => {
        if (activeTab === 1) {
            fetchDbCards();
        } else if (activeTab === 2) {
            fetchResolutionCards();
        }
    }, [selectedDate, dateRange, activeTab, fetchDbCards, fetchResolutionCards]);

    // Render card item for Trello
    const renderTrelloCard = (card) => {
        const StatusIcon = STATUS_COLORS[card.status].icon;
        return (
            <Card
                key={card.id}
                sx={{
                    mb: 1,
                    borderRadius: 1.5,
                    boxShadow: 'none',
                    border: '1px solid #e0e0e0',
                    position: 'relative'
                }}
                onClick={() => {
                    setSelectedCard(card);
                    setPopupOpen(true);
                }}
            >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <StatusIcon sx={{
                            fontSize: 18,
                            color: STATUS_COLORS[card.status].color,
                            mt: 0.2
                        }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '0.85rem',
                                    lineHeight: 1.3,
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
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mt: 0.5 }}>
                                    {card.labels.slice(0, 2).map((label, idx) => (
                                        <Chip
                                            key={idx}
                                            label={label.name || label}
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: '0.6rem',
                                                bgcolor: label.color ? `${label.color}` : '#e0e0e0',
                                                color: '#fff',
                                                '& .MuiChip-label': { px: 0.5 }
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                        <OpenInNewIcon sx={{ fontSize: 14, color: '#bbb' }} />
                    </Box>
                </CardContent>
            </Card>
        );
    };

    // Render status section
    const renderStatusSection = (cards, status, label) => {
        if (cards.length === 0) return null;

        const StatusIcon = STATUS_COLORS[status].icon;
        return (
            <Box sx={{ mb: 1.5 }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.5,
                    px: 0.5
                }}>
                    <StatusIcon sx={{ fontSize: 14, color: STATUS_COLORS[status].color }} />
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 600,
                            color: STATUS_COLORS[status].color,
                            fontSize: '0.7rem'
                        }}
                    >
                        {label} ({cards.length})
                    </Typography>
                </Box>
                {cards.map(renderTrelloCard)}
            </Box>
        );
    };

    // Render member group
    const renderMemberGroup = (group) => {
        const { member, pending, doing, done } = group;
        const total = pending.length + doing.length + done.length;
        const isExpanded = expandedMembers[member.id];

        return (
            <Paper
                key={member.id}
                sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}
            >
                {/* Member Header */}
                <Box
                    onClick={() => toggleMember(member.id)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: '#fafafa',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid #eee' : 'none'
                    }}
                >
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            fontSize: '0.8rem',
                            bgcolor: '#1976d2',
                            mr: 1.5
                        }}
                    >
                        {member.fullName?.charAt(0) || member.username?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {member.fullName || member.username}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.3 }}>
                            {pending.length > 0 && (
                                <Chip
                                    size="small"
                                    label={`${pending.length} pending`}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        bgcolor: STATUS_COLORS.pending.bg,
                                        color: STATUS_COLORS.pending.color
                                    }}
                                />
                            )}
                            {doing.length > 0 && (
                                <Chip
                                    size="small"
                                    label={`${doing.length} doing`}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        bgcolor: STATUS_COLORS.doing.bg,
                                        color: STATUS_COLORS.doing.color
                                    }}
                                />
                            )}
                            {done.length > 0 && (
                                <Chip
                                    size="small"
                                    label={`${done.length} done`}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        bgcolor: STATUS_COLORS.done.bg,
                                        color: STATUS_COLORS.done.color
                                    }}
                                />
                            )}
                        </Box>
                    </Box>
                    <Badge badgeContent={total} color="primary" sx={{ mr: 1 }}>
                        <Box />
                    </Badge>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>

                {/* Cards */}
                <Collapse in={isExpanded}>
                    <Box sx={{ p: 1.5 }}>
                        {renderStatusSection(pending, 'pending', 'Pending')}
                        {renderStatusSection(doing, 'doing', 'Doing')}
                        {renderStatusSection(done, 'done', 'Done')}
                    </Box>
                </Collapse>
            </Paper>
        );
    };

    // Render bar chart
    const renderBarChart = (data, title) => {
        const maxCount = Math.max(...data.map(d => d.count), 1);

        return (
            <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem' }}>
                    {title}
                </Typography>
                {data.map((item, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                {item.name || item.shift?.name}
                                {item.shift && ` (${String(item.shift.start).padStart(2, '0')}:00-${String(item.shift.end).padStart(2, '0')}:00)`}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                {item.count}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={(item.count / maxCount) * 100}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: '#f0f0f0',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 4,
                                    bgcolor: item.shift?.color || ['#1976d2', '#00bcd4', '#4caf50', '#ff9800', '#f44336', '#9c27b0'][idx % 6]
                                }
                            }}
                        />
                    </Box>
                ))}
            </Paper>
        );
    };

    // Format minutes to readable time
    const formatMinutes = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours < 24) return `${hours}h ${mins}m`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    };

    // Get color based on resolution time
    const getResolutionColor = (minutes) => {
        if (minutes <= 30) return '#4caf50';
        if (minutes <= 60) return '#8bc34a';
        if (minutes <= 120) return '#ffeb3b';
        if (minutes <= 240) return '#ff9800';
        return '#f44336';
    };

    // Render shift cards
    const renderShiftGroup = (shiftData) => {
        const { shift, cards, count } = shiftData;
        const isExpanded = expandedShifts[shift.id];

        if (count === 0) return null;

        return (
            <Paper
                key={shift.id}
                sx={{
                    mb: 1,
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}
            >
                <Box
                    onClick={() => toggleShift(shift.id)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: shift.color + '15',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${shift.color}`
                    }}
                >
                    <AccessTimeIcon sx={{ color: shift.color, mr: 1, fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {shift.name} ({String(shift.start).padStart(2, '0')}:00 - {String(shift.end).padStart(2, '0')}:00)
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={count}
                        sx={{
                            bgcolor: shift.color,
                            color: 'white',
                            fontWeight: 600,
                            mr: 1
                        }}
                    />
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>

                <Collapse in={isExpanded}>
                    <Box sx={{ p: 1.5 }}>
                        {cards.map(card => (
                            <Card
                                key={card._id || card.cardId}
                                sx={{
                                    mb: 1,
                                    borderRadius: 1.5,
                                    boxShadow: 'none',
                                    border: '1px solid #e0e0e0'
                                }}
                                onClick={() => {
                                    if (card.cardId) {
                                        setSelectedCard({ ...card, id: card.cardId });
                                        setPopupOpen(true);
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        {card.dueComplete ? (
                                            <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                                        ) : (
                                            <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />
                                        )}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 500,
                                                    fontSize: '0.8rem',
                                                    lineHeight: 1.3,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {card.cardName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                {(() => {
                                                    const d = new Date(card.createdAt);
                                                    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                                                })()}
                                            </Typography>
                                        </Box>
                                        <OpenInNewIcon sx={{ fontSize: 14, color: '#bbb' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Collapse>
            </Paper>
        );
    };

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
                            {activeTab === 0 ? 'TS Overview' : activeTab === 1 ? 'Cards by Shift' : 'Resolution Time'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {activeTab === 0
                                ? `P:${totalCards.pending} D:${totalCards.doing} Done:${totalCards.done}`
                                : activeTab === 1
                                    ? `${dbCards.length} cards - ${dateRange === 'day' ? selectedDate.format('DD/MM') : dateRange === 'week' ? `Tuần ${selectedDate.week()}` : selectedDate.format('MM/YYYY')}`
                                    : `${resolutionAnalysis.cards.length} cards - ${dateRange === 'day' ? selectedDate.format('DD/MM') : dateRange === 'week' ? `Tuần ${selectedDate.week()}` : selectedDate.format('MM/YYYY')}`
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

                {/* Summary chips for Trello tab */}
                {activeTab === 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                            size="small"
                            icon={<PendingIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                            label={totalCards.pending}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                height: 24
                            }}
                        />
                        <Chip
                            size="small"
                            icon={<PlayCircleIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                            label={totalCards.doing}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                height: 24
                            }}
                        />
                        <Chip
                            size="small"
                            icon={<CheckCircleIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                            label={totalCards.done}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                height: 24
                            }}
                        />
                    </Box>
                )}

                {/* Date range toggle and date picker for DB tab and Resolution tab */}
                {(activeTab === 1 || activeTab === 2) && (
                    <Box sx={{ mt: 1.5 }}>
                        {/* Date Range Toggle */}
                        <ToggleButtonGroup
                            value={dateRange}
                            exclusive
                            onChange={(_, value) => value && setDateRange(value)}
                            size="small"
                            sx={{
                                mb: 1,
                                width: '100%',
                                '& .MuiToggleButton-root': {
                                    flex: 1,
                                    color: 'rgba(255,255,255,0.7)',
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    fontSize: '0.75rem',
                                    py: 0.5,
                                    '&.Mui-selected': {
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.3)'
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="day">Ngày</ToggleButton>
                            <ToggleButton value="week">Tuần</ToggleButton>
                            <ToggleButton value="month">Tháng</ToggleButton>
                        </ToggleButtonGroup>

                        {/* Date Picker */}
                        <DatePicker
                            value={selectedDate}
                            onChange={handleDateChange}
                            picker={dateRange === 'month' ? 'month' : dateRange === 'week' ? 'week' : 'date'}
                            format={dateRange === 'month' ? 'MM/YYYY' : dateRange === 'week' ? 'wo [tuần] YYYY' : 'DD/MM/YYYY'}
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
                p: 1.5,
                pb: 10
            }}>
                {isLoading && (activeTab === 0 ? trelloCards : activeTab === 1 ? dbCards : resolutionCards).length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {activeTab === 0 ? (
                            groupedCards.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <ViewKanbanIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No cards in New Issues or Doing
                                    </Typography>
                                </Box>
                            ) : (
                                groupedCards.map(renderMemberGroup)
                            )
                        ) : activeTab === 1 ? (
                            dbCards.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <StorageIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No cards for this date
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    {/* Charts */}
                                    {renderBarChart(dbCardsAnalysis.byShift, 'Cards by Shift (6 shifts)')}
                                    {renderBarChart(dbCardsAnalysis.byProductTeam, 'Cards by Product Team')}
                                    {renderBarChart(dbCardsAnalysis.byTsGroup, 'Cards by TS Group')}

                                    {/* Cards by Shift */}
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1, px: 0.5 }}>
                                        Card Details by Shift
                                    </Typography>
                                    {dbCardsAnalysis.byShift.map(renderShiftGroup)}
                                </>
                            )
                        ) : (
                            resolutionAnalysis.cards.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <TimerIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No resolution data for this date
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    {/* Summary Stats */}
                                    <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem' }}>
                                            Average Resolution Time
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip
                                                icon={<TimerIcon sx={{ fontSize: 16 }} />}
                                                label={`Total: ${formatMinutes(resolutionAnalysis.avgTotal)}`}
                                                sx={{ bgcolor: getResolutionColor(resolutionAnalysis.avgTotal), color: 'white' }}
                                            />
                                            <Chip
                                                icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                                                label={`TS: ${formatMinutes(resolutionAnalysis.avgTs)}`}
                                                sx={{ bgcolor: getResolutionColor(resolutionAnalysis.avgTs), color: 'white' }}
                                            />
                                            <Chip
                                                icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                                                label={`First: ${formatMinutes(resolutionAnalysis.avgFirst)}`}
                                                sx={{ bgcolor: '#1976d2', color: 'white' }}
                                            />
                                        </Box>
                                    </Paper>

                                    {/* By Member */}
                                    <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem' }}>
                                            Resolution Time by Member
                                        </Typography>
                                        {resolutionAnalysis.byMember.map((member, idx) => (
                                            <Box key={idx} sx={{ mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: '#1976d2' }}>
                                                            {member.name?.charAt(0)}
                                                        </Avatar>
                                                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                                            {member.name}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Chip
                                                            size="small"
                                                            label={formatMinutes(member.avgResolution)}
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.65rem',
                                                                bgcolor: getResolutionColor(member.avgResolution),
                                                                color: 'white'
                                                            }}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            label={`${member.count} cards`}
                                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                                        />
                                                    </Box>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min((member.avgResolution / 240) * 100, 100)}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: '#f0f0f0',
                                                        '& .MuiLinearProgress-bar': {
                                                            borderRadius: 3,
                                                            bgcolor: getResolutionColor(member.avgResolution)
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Paper>

                                    {/* Card List */}
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1, px: 0.5 }}>
                                        Card Details ({resolutionAnalysis.cards.length})
                                    </Typography>
                                    {resolutionAnalysis.cards.map((card, idx) => (
                                        <Card
                                            key={idx}
                                            sx={{
                                                mb: 1,
                                                borderRadius: 1.5,
                                                boxShadow: 'none',
                                                border: '1px solid #e0e0e0',
                                                borderLeft: `4px solid ${getResolutionColor(card.resolutionTime)}`
                                            }}
                                            onClick={() => {
                                                if (card.cardId) {
                                                    setSelectedCard({ ...card, id: card.cardId });
                                                    setPopupOpen(true);
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                    <TimerIcon sx={{ fontSize: 18, color: getResolutionColor(card.resolutionTime) }} />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                fontSize: '0.8rem',
                                                                lineHeight: 1.3,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {card.cardName}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                            <Chip
                                                                size="small"
                                                                label={`Total: ${formatMinutes(card.resolutionTime)}`}
                                                                sx={{ height: 18, fontSize: '0.6rem', bgcolor: getResolutionColor(card.resolutionTime), color: 'white' }}
                                                            />
                                                            <Chip
                                                                size="small"
                                                                label={`TS: ${formatMinutes(card.TSResolutionTime)}`}
                                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                                            />
                                                            <Chip
                                                                size="small"
                                                                label={card.memberName || 'Unknown'}
                                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                    <OpenInNewIcon sx={{ fontSize: 14, color: '#bbb' }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </>
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
                        label="TS"
                        icon={<ViewKanbanIcon />}
                    />
                    <BottomNavigationAction
                        label="Shift"
                        icon={<StorageIcon />}
                    />
                    <BottomNavigationAction
                        label="Time"
                        icon={<TimerIcon />}
                    />
                </BottomNavigation>
            </Paper>

            {/* Card Detail Popup */}
            <MobilePopupCard
                open={popupOpen}
                onClose={() => {
                    setPopupOpen(false);
                    setSelectedCard(null);
                }}
                card={selectedCard}
                cardId={selectedCard?.id}
            />
        </Box>
    );
};

export default MobileView;
