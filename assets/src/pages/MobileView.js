import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Card,
    Typography,
    Spin,
    Tag,
    Button,
    Avatar,
    Badge,
    Progress,
    Radio,
    Dropdown,
    Space,
    Flex,
    Drawer
} from 'antd';
import {
    ReloadOutlined,
    AppstoreOutlined,
    DatabaseOutlined,
    LinkOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    UpOutlined,
    DownOutlined,
    HourglassOutlined,
    PlayCircleOutlined,
    FieldTimeOutlined,
    ThunderboltOutlined,
    BugOutlined,
    MenuOutlined,
    RightOutlined
} from '@ant-design/icons';
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
const BUGS_LIST_ID = '63c7b1a68e5576001577d65c';

// Status colors
const STATUS_COLORS = {
    pending: { bg: '#fff3e0', color: '#e65100', icon: HourglassOutlined },
    doing: { bg: '#e3f2fd', color: '#1565c0', icon: PlayCircleOutlined },
    done: { bg: '#e8f5e9', color: '#2e7d32', icon: CheckCircleOutlined }
};

// Map Trello label colors to hex colors
const getLabelColor = (label) => {
    if (!label) return null;
    
    // If label has a direct color property (hex code)
    if (label.color && label.color.startsWith('#')) {
        return label.color;
    }
    
    // Map Trello color names to hex
    const colorMap = {
        'green': '#61bd4f',
        'yellow': '#f2d600',
        'orange': '#ff9f1a',
        'red': '#eb5a46',
        'purple': '#c377e0',
        'blue': '#0079bf',
        'sky': '#00c2e0',
        'lime': '#51e898',
        'pink': '#ff78cb',
        'black': '#344563',
        'null': '#b3bac5' // no color
    };
    
    const colorName = label.color?.toLowerCase() || 'null';
    return colorMap[colorName] || colorMap['null'];
};

const MobileView = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [trelloCards, setTrelloCards] = useState([]);
    const [bugsCards, setBugsCards] = useState([]);
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
    const [bugsTeamExpanded, setBugsTeamExpanded] = useState({});

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

    // Fetch Bugs cards (Waiting to fix from dev)
    const fetchBugsCards = useCallback(async () => {
        setIsLoading(true);
        try {
            const bugs = await getCardsByListFromBackend(BUGS_LIST_ID);

            const formatted = (bugs || []).map(card => ({
                ...card,
                listName: card.listName || 'Waiting to fix',
                status: card.dueComplete ? 'done' : 'pending'
            }));

            setBugsCards(formatted);
            setLastRefresh(dayjs().format('HH:mm:ss'));
        } catch (error) {
            console.error('Error fetching Bugs cards:', error);
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

    // Process bugs cards by product team and TS group
    const bugsAnalysis = useMemo(() => {
        const byProductTeam = {};
        const byTsGroup = {};

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

        bugsCards.forEach(card => {
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
            byProductTeam: Object.values(byProductTeam).filter(t => t.count > 0),
            byTsGroup: Object.values(byTsGroup).filter(g => g.count > 0),
            total: bugsCards.length
        };
    }, [bugsCards]);

    // Initial fetch
    useEffect(() => {
        if (activeTab === 0) {
            fetchTrelloCards();
        } else if (activeTab === 1) {
            fetchDbCards();
        } else if (activeTab === 2) {
            fetchResolutionCards();
        } else if (activeTab === 3) {
            fetchBugsCards();
        }
    }, [activeTab, fetchTrelloCards, fetchDbCards, fetchResolutionCards, fetchBugsCards]);

    // Handle refresh
    const handleRefresh = () => {
        if (activeTab === 0) {
            fetchTrelloCards();
        } else if (activeTab === 1) {
            fetchDbCards();
        } else if (activeTab === 2) {
            fetchResolutionCards();
        } else if (activeTab === 3) {
            fetchBugsCards();
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
                style={{
                    marginBottom: 8,
                    borderRadius: 6,
                    boxShadow: 'none',
                    border: '1px solid #e0e0e0',
                    position: 'relative',
                    cursor: 'pointer'
                }}
                onClick={() => {
                    setSelectedCard(card);
                    setPopupOpen(true);
                }}
                bodyStyle={{ padding: 12 }}
            >
                <Flex align="flex-start" gap={8}>
                    <StatusIcon style={{
                        fontSize: 18,
                        color: STATUS_COLORS[card.status].color,
                        marginTop: 2
                    }} />
                    <div style={{ flex: 1 }}>
                        <Typography.Text
                            style={{
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
                        </Typography.Text>

                        {/* Labels */}
                        {card.labels && card.labels.length > 0 && (
                            <Space size={4} wrap style={{ marginTop: 4 }}>
                                {card.labels.slice(0, 2).map((label, idx) => {
                                    const labelColor = getLabelColor(label);
                                    const labelName = typeof label === 'string' ? label : (label.name || label);
                                    return (
                                        <Tag
                                            key={idx}
                                            style={{
                                                height: 16,
                                                fontSize: '0.6rem',
                                                lineHeight: '16px',
                                                padding: '0 4px',
                                                margin: 0,
                                                backgroundColor: labelColor || '#e0e0e0',
                                                color: labelColor ? '#fff' : '#666',
                                                border: 'none',
                                                borderRadius: 3
                                            }}
                                        >
                                            {labelName}
                                        </Tag>
                                    );
                                })}
                            </Space>
                        )}
                    </div>
                    <LinkOutlined style={{ fontSize: 14, color: '#bbb' }} />
                </Flex>
            </Card>
        );
    };

    // Render status section
    const renderStatusSection = (cards, status, label) => {
        if (cards.length === 0) return null;

        const StatusIcon = STATUS_COLORS[status].icon;
        return (
            <div style={{ marginBottom: 12 }}>
                <Flex align="center" gap={4} style={{ marginBottom: 4, padding: '0 4px' }}>
                    <StatusIcon style={{ fontSize: 14, color: STATUS_COLORS[status].color }} />
                    <Typography.Text
                        style={{
                            fontWeight: 600,
                            color: STATUS_COLORS[status].color,
                            fontSize: '0.7rem'
                        }}
                    >
                        {label} ({cards.length})
                    </Typography.Text>
                </Flex>
                {cards.map(renderTrelloCard)}
            </div>
        );
    };

    // Render member group
    const renderMemberGroup = (group) => {
        const { member, pending, doing, done } = group;
        const total = pending.length + doing.length + done.length;
        const isExpanded = expandedMembers[member.id];

        return (
            <Card
                key={member.id}
                style={{
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}
            >
                {/* Member Header */}
                <div
                    onClick={() => toggleMember(member.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: '#fafafa',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid #eee' : 'none'
                    }}
                >
                    <Badge count={total} size="small">
                        <Avatar
                            size={32}
                            style={{
                                fontSize: '0.8rem',
                                backgroundColor: '#1976d2',
                                marginRight: 12
                            }}
                        >
                            {member.fullName?.charAt(0) || member.username?.charAt(0)}
                        </Avatar>
                    </Badge>
                    <div style={{ flex: 1 }}>
                        <Typography.Text strong style={{ fontSize: '0.9rem', display: 'block' }}>
                            {member.fullName || member.username}
                        </Typography.Text>
                        <Space size={8} style={{ marginTop: 4 }}>
                            {pending.length > 0 && (
                                <Tag
                                    style={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: STATUS_COLORS.pending.bg,
                                        color: STATUS_COLORS.pending.color,
                                        border: 'none',
                                        margin: 0,
                                        padding: '0 6px',
                                        lineHeight: '18px'
                                    }}
                                >
                                    {pending.length} pending
                                </Tag>
                            )}
                            {doing.length > 0 && (
                                <Tag
                                    style={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: STATUS_COLORS.doing.bg,
                                        color: STATUS_COLORS.doing.color,
                                        border: 'none',
                                        margin: 0,
                                        padding: '0 6px',
                                        lineHeight: '18px'
                                    }}
                                >
                                    {doing.length} doing
                                </Tag>
                            )}
                            {done.length > 0 && (
                                <Tag
                                    style={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: STATUS_COLORS.done.bg,
                                        color: STATUS_COLORS.done.color,
                                        border: 'none',
                                        margin: 0,
                                        padding: '0 6px',
                                        lineHeight: '18px'
                                    }}
                                >
                                    {done.length} done
                                </Tag>
                            )}
                        </Space>
                    </div>
                    {isExpanded ? <UpOutlined /> : <DownOutlined />}
                </div>

                {/* Cards */}
                {isExpanded && (
                    <div style={{ padding: 12 }}>
                        {renderStatusSection(pending, 'pending', 'Pending')}
                        {renderStatusSection(doing, 'doing', 'Doing')}
                        {renderStatusSection(done, 'done', 'Done')}
                    </div>
                )}
            </Card>
        );
    };

    // Render bar chart
    const renderBarChart = (data, title) => {
        const maxCount = Math.max(...data.map(d => d.count), 1);

        return (
            <Card style={{ padding: 12, marginBottom: 12, borderRadius: 8 }}>
                <Typography.Text strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: 12 }}>
                    {title}
                </Typography.Text>
                {data.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                        <Flex justify="space-between" style={{ marginBottom: 4 }}>
                            <Typography.Text style={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                {item.name || item.shift?.name}
                                {item.shift && ` (${String(item.shift.start).padStart(2, '0')}:00-${String(item.shift.end).padStart(2, '0')}:00)`}
                            </Typography.Text>
                            <Typography.Text strong style={{ fontSize: '0.75rem' }}>
                                {item.count}
                            </Typography.Text>
                        </Flex>
                        <Progress
                            percent={(item.count / maxCount) * 100}
                            showInfo={false}
                            strokeColor={item.shift?.color || ['#1976d2', '#00bcd4', '#4caf50', '#ff9800', '#f44336', '#9c27b0'][idx % 6]}
                            style={{
                                height: 8,
                                borderRadius: 4
                            }}
                        />
                    </div>
                ))}
            </Card>
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

    // Render bugs team group
    const renderBugsTeamGroup = (teamData) => {
        const { name, cards, count } = teamData;

        if (count === 0) return null;

        const isExpanded = bugsTeamExpanded[name] ?? false;

        return (
            <Card
                key={name}
                style={{
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}
            >
                <div
                    onClick={() =>
                        setBugsTeamExpanded(prev => ({
                            ...prev,
                            [name]: !(prev[name] ?? false)
                        }))
                    }
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: '#fff5f0',
                        borderLeft: '4px solid #ff6b35',
                        cursor: 'pointer'
                    }}
                >
                    <BugOutlined style={{ color: '#ff6b35', marginRight: 8, fontSize: 18 }} />
                    <div style={{ flex: 1 }}>
                        <Typography.Text strong style={{ fontSize: '0.9rem' }}>
                            {name}
                        </Typography.Text>
                    </div>
                    <Tag
                        color="#ff6b35"
                        style={{
                            fontWeight: 600,
                            marginRight: 8,
                            border: 'none'
                        }}
                    >
                        {count}
                    </Tag>
                    {isExpanded ? (
                        <UpOutlined style={{ fontSize: 14, color: '#b36a4b' }} />
                    ) : (
                        <DownOutlined style={{ fontSize: 14, color: '#b36a4b' }} />
                    )}
                </div>

                {isExpanded && (
                    <div style={{ padding: 12 }}>
                        {cards.map(card => renderTrelloCard(card))}
                    </div>
                )}
            </Card>
        );
    };

    // Render shift cards
    const renderShiftGroup = (shiftData) => {
        const { shift, cards, count } = shiftData;
        const isExpanded = expandedShifts[shift.id];

        if (count === 0) return null;

        return (
            <Card
                key={shift.id}
                style={{
                    marginBottom: 8,
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}
            >
                <div
                    onClick={() => toggleShift(shift.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: shift.color + '15',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${shift.color}`
                    }}
                >
                    <FieldTimeOutlined style={{ color: shift.color, marginRight: 8, fontSize: 20 }} />
                    <div style={{ flex: 1 }}>
                        <Typography.Text strong style={{ fontSize: '0.85rem' }}>
                            {shift.name} ({String(shift.start).padStart(2, '0')}:00 - {String(shift.end).padStart(2, '0')}:00)
                        </Typography.Text>
                    </div>
                    <Tag
                        color={shift.color}
                        style={{
                            fontWeight: 600,
                            marginRight: 8,
                            border: 'none'
                        }}
                    >
                        {count}
                    </Tag>
                    {isExpanded ? <UpOutlined /> : <DownOutlined />}
                </div>

                {isExpanded && (
                    <div style={{ padding: 12 }}>
                        {cards.map(card => (
                                <Card
                                    key={card._id || card.cardId}
                                    style={{
                                        marginBottom: 8,
                                        borderRadius: 6,
                                        boxShadow: 'none',
                                        border: '1px solid #e0e0e0',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        if (card.cardId) {
                                            setSelectedCard({ ...card, id: card.cardId });
                                            setPopupOpen(true);
                                        }
                                    }}
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Flex align="flex-start" gap={8}>
                                        {card.dueComplete ? (
                                            <CheckCircleOutlined style={{ fontSize: 16, color: '#4caf50' }} />
                                        ) : (
                                            <ClockCircleOutlined style={{ fontSize: 16, color: '#9e9e9e' }} />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <Typography.Text
                                                style={{
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
                                            </Typography.Text>
                                            <Typography.Text type="secondary" style={{ fontSize: '0.65rem', display: 'block', marginTop: 4 }}>
                                                {(() => {
                                                    const d = new Date(card.createdAt);
                                                    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                                                })()}
                                            </Typography.Text>
                                        </div>
                                        <LinkOutlined style={{ fontSize: 14, color: '#bbb' }} />
                                    </Flex>
                                </Card>
                            ))}
                    </div>
                )}
            </Card>
        );
    };

    const handleSelectTab = (index) => {
        setActiveTab(index);
    };

    const sideMenuItems = [
        { key: '0', label: 'TS OVERVIEW', tab: 0, icon: <AppstoreOutlined /> },
        { key: '1', label: 'CARDS BY SHIFT', tab: 1, icon: <DatabaseOutlined /> },
        { key: '2', label: 'RESOLUTION TIME', tab: 2, icon: <FieldTimeOutlined /> },
        { key: '3', label: 'BUGS - WAITING TO FIX', tab: 3, icon: <BugOutlined /> }
    ];

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #fdf7f3 0%, #f5f5f5 40%, #f0f2f5 100%)',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: 480,
                margin: '0 auto',
                boxShadow: '0 0 24px rgba(15, 23, 42, 0.14)',
                position: 'relative'
            }}
        >
            {/* Header */}
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    borderRadius: 0,
                    backgroundColor: '#1976d2',
                    color: 'white',
                    padding: '12px 16px'
                }}
            >
                <Flex justify="space-between" align="center" gap={12}>
                    <div>
                        <Typography.Title level={5} style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>
                            {activeTab === 0
                                ? 'TS Overview'
                                : activeTab === 1
                                    ? 'Cards by Shift'
                                    : activeTab === 2
                                        ? 'Resolution Time'
                                        : 'Bugs'}
                        </Typography.Title>
                        <Typography.Text style={{ opacity: 0.9, fontSize: '0.75rem', color: 'white' }}>
                            {activeTab === 0
                                ? `P:${totalCards.pending} D:${totalCards.doing} Done:${totalCards.done}`
                                : activeTab === 1
                                    ? `${dbCards.length} cards - ${dateRange === 'day' ? selectedDate.format('DD/MM') : dateRange === 'week' ? `Tuần ${selectedDate.week()}` : selectedDate.format('MM/YYYY')}`
                                    : activeTab === 2
                                        ? `${resolutionAnalysis.cards.length} cards - ${dateRange === 'day' ? selectedDate.format('DD/MM') : dateRange === 'week' ? `Tuần ${selectedDate.week()}` : selectedDate.format('MM/YYYY')}`
                                        : `${bugsCards.length} bugs - Waiting to fix`}
                        </Typography.Text>
                    </div>
                    <Space size={8}>
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setMenuOpen(true)}
                            style={{ color: 'white', paddingInline: 8 }}
                        />
                        {lastRefresh && (
                            <Typography.Text style={{ opacity: 0.8, color: 'white', fontSize: '0.75rem' }}>
                                {lastRefresh}
                            </Typography.Text>
                        )}
                        <Button
                            type="text"
                            icon={<ReloadOutlined />}
                            loading={isLoading}
                            onClick={handleRefresh}
                            style={{ color: 'white' }}
                        />
                    </Space>
                </Flex>

                {/* Summary chips for Trello tab */}
                {activeTab === 0 && (
                    <Space size={8} style={{ marginTop: 8 }}>
                        <Tag
                            icon={<HourglassOutlined style={{ fontSize: 14 }} />}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                height: 24,
                                lineHeight: '24px'
                            }}
                        >
                            {totalCards.pending}
                        </Tag>
                        <Tag
                            icon={<PlayCircleOutlined style={{ fontSize: 14 }} />}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                height: 24,
                                lineHeight: '24px'
                            }}
                        >
                            {totalCards.doing}
                        </Tag>
                        <Tag
                            icon={<CheckCircleOutlined style={{ fontSize: 14 }} />}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                height: 24,
                                lineHeight: '24px'
                            }}
                        >
                            {totalCards.done}
                        </Tag>
                    </Space>
                )}

                {/* Date range toggle and date picker for DB tab and Resolution tab */}
                {(activeTab === 1 || activeTab === 2) && (
                    <div style={{ marginTop: 12 }}>
                        {/* Date Range Toggle */}
                        <Radio.Group
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            size="small"
                            style={{
                                marginBottom: 8,
                                width: '100%',
                                display: 'flex'
                            }}
                        >
                            <Radio.Button value="day" style={{ flex: 1, textAlign: 'center' }}>Ngày</Radio.Button>
                            <Radio.Button value="week" style={{ flex: 1, textAlign: 'center' }}>Tuần</Radio.Button>
                            <Radio.Button value="month" style={{ flex: 1, textAlign: 'center' }}>Tháng</Radio.Button>
                        </Radio.Group>

                        {/* Date Picker */}
                        <DatePicker
                            value={selectedDate}
                            onChange={handleDateChange}
                            picker={dateRange === 'month' ? 'month' : dateRange === 'week' ? 'week' : 'date'}
                            format={dateRange === 'month' ? 'MM/YYYY' : dateRange === 'week' ? 'wo [tuần] YYYY' : 'DD/MM/YYYY'}
                            style={{ width: '100%' }}
                            size="small"
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: 16,
                paddingBottom: 80
            }}>
                {isLoading && (activeTab === 0 ? trelloCards : activeTab === 1 ? dbCards : activeTab === 2 ? resolutionCards : bugsCards).length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <>
                        {activeTab === 0 ? (
                            groupedCards.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                                    <AppstoreOutlined style={{ fontSize: 48, color: '#bdbdbd', marginBottom: 16 }} />
                                    <Typography.Text type="secondary">
                                        No cards in New Issues or Doing
                                    </Typography.Text>
                                </div>
                            ) : (
                                groupedCards.map(renderMemberGroup)
                            )
                        ) : activeTab === 1 ? (
                            dbCards.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                                    <DatabaseOutlined style={{ fontSize: 48, color: '#bdbdbd', marginBottom: 16 }} />
                                    <Typography.Text type="secondary">
                                        No cards for this date
                                    </Typography.Text>
                                </div>
                            ) : (
                                <>
                                    {/* Charts */}
                                    {renderBarChart(dbCardsAnalysis.byShift, 'Cards by Shift (6 shifts)')}
                                    {renderBarChart(dbCardsAnalysis.byProductTeam, 'Cards by Product Team')}
                                    {renderBarChart(dbCardsAnalysis.byTsGroup, 'Cards by TS Group')}

                                    {/* Cards by Shift */}
                                    <Typography.Text strong style={{ fontSize: '0.85rem', display: 'block', marginTop: 16, marginBottom: 8, padding: '0 4px' }}>
                                        Card Details by Shift
                                    </Typography.Text>
                                    {dbCardsAnalysis.byShift.map(renderShiftGroup)}
                                </>
                            )
                        ) : activeTab === 2 ? (
                            resolutionAnalysis.cards.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                                    <FieldTimeOutlined style={{ fontSize: 48, color: '#bdbdbd', marginBottom: 16 }} />
                                    <Typography.Text type="secondary">
                                        No resolution data for this date
                                    </Typography.Text>
                                </div>
                            ) : (
                                <>
                                    {/* Summary Stats */}
                                    <Card style={{ padding: 12, marginBottom: 12, borderRadius: 8 }}>
                                        <Typography.Text strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: 12 }}>
                                            Average Resolution Time
                                        </Typography.Text>
                                        <Space size={8} wrap>
                                            <Tag
                                                icon={<FieldTimeOutlined style={{ fontSize: 16 }} />}
                                                color={getResolutionColor(resolutionAnalysis.avgTotal)}
                                                style={{ color: 'white', border: 'none' }}
                                            >
                                                Total: {formatMinutes(resolutionAnalysis.avgTotal)}
                                            </Tag>
                                            <Tag
                                                icon={<ThunderboltOutlined style={{ fontSize: 16 }} />}
                                                color={getResolutionColor(resolutionAnalysis.avgTs)}
                                                style={{ color: 'white', border: 'none' }}
                                            >
                                                TS: {formatMinutes(resolutionAnalysis.avgTs)}
                                            </Tag>
                                            <Tag
                                                icon={<ClockCircleOutlined style={{ fontSize: 16 }} />}
                                                color="#1976d2"
                                                style={{ color: 'white', border: 'none' }}
                                            >
                                                First: {formatMinutes(resolutionAnalysis.avgFirst)}
                                            </Tag>
                                        </Space>
                                    </Card>

                                    {/* By Member */}
                                    <Card style={{ padding: 12, marginBottom: 12, borderRadius: 8 }}>
                                        <Typography.Text strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: 12 }}>
                                            Resolution Time by Member
                                        </Typography.Text>
                                        {resolutionAnalysis.byMember.map((member, idx) => (
                                            <div key={idx} style={{ marginBottom: 12 }}>
                                                <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                                                    <Space>
                                                        <Avatar size={24} style={{ fontSize: '0.7rem', backgroundColor: '#1976d2' }}>
                                                            {member.name?.charAt(0)}
                                                        </Avatar>
                                                        <Typography.Text style={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                                            {member.name}
                                                        </Typography.Text>
                                                    </Space>
                                                    <Space size={4}>
                                                        <Tag
                                                            color={getResolutionColor(member.avgResolution)}
                                                            style={{
                                                                height: 20,
                                                                fontSize: '0.65rem',
                                                                lineHeight: '20px',
                                                                color: 'white',
                                                                border: 'none',
                                                                margin: 0
                                                            }}
                                                        >
                                                            {formatMinutes(member.avgResolution)}
                                                        </Tag>
                                                        <Tag style={{ height: 20, fontSize: '0.65rem', lineHeight: '20px', margin: 0 }}>
                                                            {member.count} cards
                                                        </Tag>
                                                    </Space>
                                                </Flex>
                                                <Progress
                                                    percent={Math.min((member.avgResolution / 240) * 100, 100)}
                                                    strokeColor={getResolutionColor(member.avgResolution)}
                                                    showInfo={false}
                                                    style={{
                                                        height: 6,
                                                        borderRadius: 3
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </Card>

                                    {/* Card List */}
                                    <Typography.Text strong style={{ fontSize: '0.85rem', display: 'block', marginTop: 16, marginBottom: 8, padding: '0 4px' }}>
                                        Card Details ({resolutionAnalysis.cards.length})
                                    </Typography.Text>
                                    {resolutionAnalysis.cards.map((card, idx) => (
                                        <Card
                                            key={idx}
                                            style={{
                                                marginBottom: 8,
                                                borderRadius: 6,
                                                boxShadow: 'none',
                                                border: '1px solid #e0e0e0',
                                                borderLeft: `4px solid ${getResolutionColor(card.resolutionTime)}`,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                if (card.cardId) {
                                                    setSelectedCard({ ...card, id: card.cardId });
                                                    setPopupOpen(true);
                                                }
                                            }}
                                            bodyStyle={{ padding: 12 }}
                                        >
                                            <Flex align="flex-start" gap={8}>
                                                <FieldTimeOutlined style={{ fontSize: 18, color: getResolutionColor(card.resolutionTime) }} />
                                                <div style={{ flex: 1 }}>
                                                    <Typography.Text
                                                        style={{
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
                                                    </Typography.Text>
                                                    <Space size={4} wrap style={{ marginTop: 4 }}>
                                                        <Tag
                                                            color={getResolutionColor(card.resolutionTime)}
                                                            style={{ height: 18, fontSize: '0.6rem', lineHeight: '18px', color: 'white', border: 'none', margin: 0 }}
                                                        >
                                                            Total: {formatMinutes(card.resolutionTime)}
                                                        </Tag>
                                                        <Tag style={{ height: 18, fontSize: '0.6rem', lineHeight: '18px', margin: 0 }}>
                                                            TS: {formatMinutes(card.TSResolutionTime)}
                                                        </Tag>
                                                        <Tag style={{ height: 18, fontSize: '0.6rem', lineHeight: '18px', margin: 0 }}>
                                                            {card.memberName || 'Unknown'}
                                                        </Tag>
                                                    </Space>
                                                </div>
                                                <LinkOutlined style={{ fontSize: 14, color: '#bbb' }} />
                                            </Flex>
                                        </Card>
                                    ))}
                                </>
                            )
                        ) : (
                            bugsCards.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                                    <BugOutlined style={{ fontSize: 48, color: '#bdbdbd', marginBottom: 16 }} />
                                    <Typography.Text type="secondary">
                                        No bugs in Waiting to fix
                                    </Typography.Text>
                                </div>
                            ) : (
                                <>
                                    {/* Bugs by Product Team */}
                                    <Typography.Text strong style={{ fontSize: '0.9rem', display: 'block', marginTop: 8, marginBottom: 12, padding: '0 4px' }}>
                                        Bugs by Product Team ({bugsAnalysis.total})
                                    </Typography.Text>
                                    {bugsAnalysis.byProductTeam.length === 0 ? (
                                        <Card style={{ padding: 16, marginBottom: 12, textAlign: 'center' }}>
                                            <Typography.Text type="secondary">No bugs grouped by product team</Typography.Text>
                                        </Card>
                                    ) : (
                                        bugsAnalysis.byProductTeam.map(renderBugsTeamGroup)
                                    )}

                                    {/* Bugs by TS Group */}
                                    <Typography.Text strong style={{ fontSize: '0.9rem', display: 'block', marginTop: 24, marginBottom: 12, padding: '0 4px' }}>
                                        Bugs by TS Group ({bugsAnalysis.total})
                                    </Typography.Text>
                                    {bugsAnalysis.byTsGroup.length === 0 ? (
                                        <Card style={{ padding: 16, marginBottom: 12, textAlign: 'center' }}>
                                            <Typography.Text type="secondary">No bugs grouped by TS group</Typography.Text>
                                        </Card>
                                    ) : (
                                        bugsAnalysis.byTsGroup.map(renderBugsTeamGroup)
                                    )}
                                </>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Overlay Sidebar Menu (Drawer inside view) */}
            <Drawer
                placement="left"
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                width={260}
                closeIcon={false}
                getContainer={false}
                style={{ position: 'absolute' }}
                bodyStyle={{
                    padding: 0,
                    backgroundColor: '#fdeee4'
                }}
                headerStyle={{
                    padding: '16px 20px 8px',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    backgroundColor: '#fdeee4'
                }}
                title={
                    <Typography.Text style={{ fontWeight: 600, letterSpacing: 1, fontSize: '0.9rem' }}>
                        MENU
                    </Typography.Text>
                }
            >
                <div style={{ paddingTop: 8 }}>
                    {sideMenuItems.map(item => {
                        const isActive = activeTab === item.tab;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                    handleSelectTab(item.tab);
                                    setMenuOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    backgroundColor: isActive ? '#ffe0d1' : 'transparent',
                                    padding: '14px 22px',
                                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ color: '#d16b4f' }}>
                                        {item.icon}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 13,
                                            letterSpacing: 1.6,
                                            textTransform: 'uppercase',
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#c0543b' : '#3d3d3d'
                                        }}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                                <RightOutlined style={{ fontSize: 12, color: '#b3b3b3' }} />
                            </button>
                        );
                    })}
                </div>
            </Drawer>

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
        </div>
    );
};

export default MobileView;
