import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, TextField, Paper, FormControl, InputLabel, Select, MenuItem, Chip, Button, Stack, Autocomplete } from '@mui/material';
import dayjs from 'dayjs';
import members from '../../data/members.json';
import lists from '../../data/listsId.json';
import appData from '../../data/app.json';
import { getCardsByBoardForPerformanceTS } from '../../api/trelloApi';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { calculateResolutionTime } from '../../utils/resolutionTime';
import { sortActionsByTimeline } from '../../utils/actionsCardsSort';
import CardDetailModal from '../CardDetailModal';

const shiftLabels = [
    'Ca 1',
    'Ca 2',
    'Ca 3',
    'Ca 4',
    'Ca 5.1',
    'Ca 5.2',
    'Ca 6'
];

function getShift(dateString) {
    if (!dateString) return null;
    const hour = dayjs(dateString).hour();
    if (hour >= 0 && hour < 4) return 'Ca 1';
    if (hour >= 4 && hour < 8) return 'Ca 2';
    if (hour >= 8 && hour < 12) return 'Ca 3';
    if (hour >= 12 && hour < 16) return 'Ca 4';
    if (hour >= 16 && hour < 18) return 'Ca 5.1';
    if (hour >= 18 && hour < 20) return 'Ca 5.2';
    if (hour >= 20 && hour < 24) return 'Ca 6';
    return null;
}

const CardsDetail = () => {
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
    const [selectedTS, setSelectedTS] = useState('');
    const [selectedList, setSelectedList] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedShift, setSelectedShift] = useState('');
    const [selectedRemovalTS, setSelectedRemovalTS] = useState('');
    const [resolutionTimes, setResolutionTimes] = useState({});
    const [actionHourFilter, setActionHourFilter] = useState({ start: '00:00', end: '23:59' });
    const [actionTypeFilter, setActionTypeFilter] = useState([]);
    const [markCompleteFilter, setMarkCompleteFilter] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [selectedCardDetail, setSelectedCardDetail] = useState(null);
    const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
    const [selectedShiftFilter, setSelectedShiftFilter] = useState('');
    const [selectedApp, setSelectedApp] = useState('');

    // Filter TS and TS-lead members
    const tsMembers = members.filter(member => 
        member.role?.toLowerCase() === 'ts' || 
        member.role?.toLowerCase() === 'ts-lead'
    );

    // Get list name by ID
    const getListName = (listId) => {
        const list = lists.find(l => l.id === listId);
        return list ? list.name : 'Unknown List';
    };

    // Get count of cards by list ID
    const getCardCountByList = (listId) => {
        return filteredByApp.filter(card => card.idList === listId).length;
    };

    // Status list IDs
    const STATUS_LISTS = {
        DEV_PENDING: '63c7b1a68e5576001577d65c', // Waiting to fix (from dev)
        TS_PENDING: '66262386cb856f894f7cdca2', // New Issues
        WAITING_PERMISSION: '63c7d18b4fe38a004885aadf', // Update workflow required or Waiting for access
        WAITING_CONFIRMATION: '63f489b961f3a274163459a2', // Waiting for Customer's Confirmation
        TS_DONE: '66d7d254bdad4fb0a354495a', // Done
        DEV_DONE: '663ae7d6feac5f2f8d7a1c86' // Fix done from dev
    };

    // Map ca trực sang giờ bắt đầu và kết thúc
    const shiftTimeRanges = {
        'Ca 1': { start: '00:00', end: '03:59' },
        'Ca 2': { start: '04:00', end: '07:59' },
        'Ca 3': { start: '08:00', end: '11:59' },
        'Ca 4': { start: '12:00', end: '15:59' },
        'Ca 5.1': { start: '16:00', end: '17:59' },
        'Ca 5.2': { start: '18:00', end: '19:59' },
        'Ca 6': { start: '20:00', end: '23:59' },
    };

    // Lọc action theo ca trực (nếu có chọn), nếu không thì lấy toàn bộ ngày
    const getHourRange = () => {
        if (selectedShiftFilter && shiftTimeRanges[selectedShiftFilter]) {
            return shiftTimeRanges[selectedShiftFilter];
        }
        return { start: '00:00', end: '23:59' };
    };

    // Status box component
    const StatusBox = ({ title, count, color, listId }) => (
        <Paper elevation={0} sx={{ 
            p: 2, 
            borderRadius: 2, 
            background: 'white', 
            boxShadow: '0 1px 4px 0 #e0e7ef',
            border: `1px solid ${color}`,
            minWidth: 200,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
            },
            ...(selectedList === listId && {
                background: `${color}10`,
                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
            })
        }}
        onClick={() => {
            setSelectedList(listId === selectedList ? '' : listId);
        }}>
            <Typography variant="h6" sx={{ color: color, fontWeight: 700, mb: 1 }}>{title}</Typography>
            <Typography variant="h4" sx={{ color: color, fontWeight: 800 }}>{count}</Typography>
        </Paper>
    );

    // Calculate self-removal count for each TS member
    const getSelfRemovalData = (cards) => {
        const removalCounts = {};
        
        cards.forEach(card => {
            if (Array.isArray(card.actions)) {
                card.actions.forEach(action => {
                    if (action.type === 'removeMemberFromCard') {
                        const memberId = action.member.id;
                        const memberName = tsMembers.find(m => m.id === memberId)?.fullName;
                        
                        if (memberName) {
                            removalCounts[memberName] = (removalCounts[memberName] || 0) + 1;
                        }
                    }
                });
            }
        });

        return Object.entries(removalCounts).map(([name, count]) => ({
            name,
            value: count
        })).sort((a, b) => b.value - a.value);
    };

    // Get cards where TS removed themselves
    const getSelfRemovedCards = (tsName, cards) => {
        return cards.filter(card => {
            if (Array.isArray(card.actions)) {
                return card.actions.some(action => 
                    action.type === 'removeMemberFromCard' && 
                    action.member.fullName === tsName
                );
            }
            return false;
        });
    };

    // Filter cards by selected TS member
    const filteredByTS = selectedTS
        ? cards.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(selectedTS))
        : cards;

    // Filter by list if selected
    const filteredByList = selectedList
        ? filteredByTS.filter(card => card.idList === selectedList)
        : filteredByTS;

    // Filter by shift if selected
    const filteredByShift = selectedShift
        ? filteredByList.filter(card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(a => a.type === 'createCard');
                if (createAction && createAction.date) {
                    return getShift(createAction.date) === selectedShift;
                }
            }
            return false;
        })
        : filteredByList;

    // Filter by self-removal if selected
    const filteredCards = selectedRemovalTS
        ? getSelfRemovedCards(selectedRemovalTS, filteredByShift)
        : filteredByShift;

    // Filter by app if selected
    const filteredByApp = selectedApp
        ? filteredCards.filter(card => {
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            return appLabels.some(label => label.name === selectedApp);
        })
        : filteredCards;

    // Pie chart data: number of cards per TS (from filteredCards)
    const pieData = tsMembers
        .map(ts => {
            const count = filteredByApp.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(ts.id)).length;
            return { name: ts.fullName, value: count };
        })
        .filter(d => d.value > 0);

    // Bar chart data: number of cards per 4-hour shift (from filteredCards)
    const shiftMap = Object.fromEntries(shiftLabels.map(label => [label, 0]));
    filteredByApp.forEach(card => {
        if (Array.isArray(card.actions)) {
            const createAction = card.actions.find(a => a.type === 'createCard');
            if (createAction && createAction.date) {
                const shift = getShift(createAction.date);
                if (shift && shiftMap.hasOwnProperty(shift)) shiftMap[shift]++;
            }
        }
    });
    const barData = shiftLabels.map(label => ({ shift: label, count: shiftMap[label] }));

    // Hàm lấy dữ liệu Issues theo App cho TS1
    const getIssuesByAppTS1Data = () => {
        const ts1Apps = appData.filter(app => app.group_ts === 'TS1');
        const appMap = {};
        
        // Khởi tạo tất cả app TS1 với count = 0
        ts1Apps.forEach(app => {
            appMap[app.app_name] = 0;
        });
        
        // Đếm cards cho từng app
        filteredByApp.forEach(card => {
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            appLabels.forEach(label => {
                const app = appData.find(a => a.label_trello === label.name);
                if (app && app.group_ts === 'TS1') {
                    appMap[app.app_name] = (appMap[app.app_name] || 0) + 1;
                }
            });
        });
        
        return Object.entries(appMap)
            .map(([app, count]) => ({ app, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Hàm lấy dữ liệu Issues theo App cho TS2
    const getIssuesByAppTS2Data = () => {
        const ts2Apps = appData.filter(app => app.group_ts === 'TS2');
        const appMap = {};
        
        // Khởi tạo tất cả app TS2 với count = 0
        ts2Apps.forEach(app => {
            appMap[app.app_name] = 0;
        });
        
        // Đếm cards cho từng app
        filteredByApp.forEach(card => {
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            appLabels.forEach(label => {
                const app = appData.find(a => a.label_trello === label.name);
                if (app && app.group_ts === 'TS2') {
                    appMap[app.app_name] = (appMap[app.app_name] || 0) + 1;
                }
            });
        });
        
        return Object.entries(appMap)
            .map(([app, count]) => ({ app, count }))
            .sort((a, b) => b.count - a.count);
    };

    const pieColors = [
        '#1976d2', '#42a5f5', '#66bb6a', '#ffa726', '#d32f2f', '#7e57c2', '#26a69a', '#fbc02d', '#8d6e63', '#ec407a',
        '#ab47bc', '#26c6da', '#9ccc65', '#ff7043', '#5c6bc0', '#cfd8dc', '#789262', '#bdbdbd', '#ffb300', '#8e24aa'
    ];

    // Sort cards by create date (oldest first)
    const sortedCards = [...filteredByApp].sort((a, b) => {
        const getCreateDate = card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(act => act.type === 'createCard');
                if (createAction && createAction.date) return dayjs(createAction.date).valueOf();
            }
            return null;
        };
        const aDate = getCreateDate(a);
        const bDate = getCreateDate(b);
        if (aDate === null && bDate === null) return 0;
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return aDate - bDate;
    });

    // Add function to calculate resolution time for a card
    const calculateCardResolutionTime = async (card) => {
        if (!card.dueComplete || !Array.isArray(card.actions)) return null;
        
        const timing = calculateResolutionTime(card.actions);
        if (timing) {
            setResolutionTimes(prev => ({
                ...prev,
                [card.id]: timing
            }));
        }
        return timing;
    };

    // Modify useEffect to calculate resolution times for completed cards
    useEffect(() => {
        const fetchCards = async () => {
            setLoading(true);
            setError(null);
            try {
                const since = dayjs(selectedDate).startOf('day').toISOString();
                const before = dayjs(selectedDate).endOf('day').toISOString();
                const data = await getCardsByBoardForPerformanceTS(since, before);
                console.log(data);
                setCards(data || []);

                // Calculate resolution times for completed cards
                const completedCards = data.filter(card => card.dueComplete);
                for (const card of completedCards) {
                    await calculateCardResolutionTime(card);
                }
            } catch (err) {
                setError(err.message || 'Error fetching cards');
            } finally {
                setLoading(false);
            }
        };
        fetchCards();
    }, [selectedDate, selectedTS]);

    // Lấy tất cả action types có trong filteredCards để làm options
    const allActionTypes = Array.from(new Set(filteredCards.flatMap(card => Array.isArray(card.actions) ? card.actions.map(a => a.type) : [])));

    // Gom tất cả actions của tất cả filteredCards vào một mảng duy nhất
    const allCardActions = filteredCards.flatMap(card => {
        if (!Array.isArray(card.actions)) return [];
        return card.actions.map(action => {
            // Vá member cho removeMemberFromCard nếu thiếu
            let patchedAction = { ...action, cardName: card.name };
            if (action.type === 'removeMemberFromCard' && !action.member) {
                let foundMember = null;
                if (action.data?.idMember) {
                    foundMember = tsMembers.find(m => m.id === action.data.idMember);
                }
                if (!foundMember && Array.isArray(card.idMembers)) {
                    foundMember = tsMembers.find(m => card.idMembers.includes(m.id));
                }
                patchedAction.member = foundMember ? { id: foundMember.id, fullName: foundMember.fullName } : undefined;
            }
            return patchedAction;
        });
    });

    return (
        <>
            <Box sx={{ 
                p: { xs: 2, sm: 3, md: 4 }, 
                width: '100%',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
            }}>
                {/* Filters Section */}
                <Paper elevation={0} sx={{ 
                    p: { xs: 2, md: 4 }, 
                    borderRadius: 3, 
                    background: 'rgba(255,255,255,0.85)', 
                    border: '1.5px solid #e3e8ee', 
                    boxShadow: '0 2px 8px 0 #e0e7ef'
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        mb: 3, 
                        color: '#1976d2', 
                        letterSpacing: 1,
                        borderBottom: '2px solid #e3e8ee',
                        pb: 2
                    }}>Filters</Typography>
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Date"
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    background: 'white',
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: 16,
                                        fontWeight: 500,
                                        background: 'white',
                                        borderRadius: 2,
                                        '& fieldset': { borderColor: '#e3e8ee' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                        '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#1976d2',
                                        fontWeight: 600,
                                        fontSize: 15,
                                        '&.Mui-focused': { color: '#1565c0' }
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small" sx={{
                                background: 'white',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                    fontSize: 16,
                                    fontWeight: 500,
                                    background: 'white',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#e3e8ee' },
                                    '&:hover fieldset': { borderColor: '#1976d2' },
                                    '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#1976d2',
                                    fontWeight: 600,
                                    fontSize: 15,
                                    '&.Mui-focused': { color: '#1565c0' }
                                }
                            }}>
                                <InputLabel>TS</InputLabel>
                                <Select
                                    value={selectedTS}
                                    onChange={e => setSelectedTS(e.target.value)}
                                    label="TS"
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                borderRadius: 2,
                                                boxShadow: '0 4px 24px 0 #b6c2d933',
                                                mt: 1
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem value="">
                                        <em>All</em>
                                    </MenuItem>
                                    {tsMembers.map(member => (
                                        <MenuItem key={member.id} value={member.id} sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            py: 1.2,
                                            px: 1.5,
                                            borderRadius: 2,
                                            fontWeight: 500,
                                            backgroundColor: selectedTS === member.id ? '#e3f2fd' : 'inherit',
                                            '&:hover': {
                                                backgroundColor: '#e3e8ee'
                                            }
                                        }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1976d2', lineHeight: 1 }}>{member.fullName}</Typography>
                                                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{member.role}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small" sx={{
                                background: 'white',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                    fontSize: 16,
                                    fontWeight: 500,
                                    background: 'white',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#e3e8ee' },
                                    '&:hover fieldset': { borderColor: '#1976d2' },
                                    '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#1976d2',
                                    fontWeight: 600,
                                    fontSize: 15,
                                    '&.Mui-focused': { color: '#1565c0' }
                                }
                            }}>
                                <InputLabel>App</InputLabel>
                                <Select
                                    value={selectedApp}
                                    onChange={e => setSelectedApp(e.target.value)}
                                    label="App"
                                    MenuProps={{
                                        PaperProps: {
                                            sx: {
                                                borderRadius: 2,
                                                boxShadow: '0 4px 24px 0 #b6c2d933',
                                                mt: 1
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem value="">
                                        <em>All</em>
                                    </MenuItem>
                                    {appData.map(app => (
                                        <MenuItem key={app.label_trello} value={app.label_trello} sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            py: 1.2,
                                            px: 1.5,
                                            borderRadius: 2,
                                            fontWeight: 500,
                                            backgroundColor: selectedApp === app.label_trello ? '#e3f2fd' : 'inherit',
                                            '&:hover': {
                                                backgroundColor: '#e3e8ee'
                                            }
                                        }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1976d2', lineHeight: 1 }}>{app.app_name}</Typography>
                                                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{app.group_ts}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                    {/* Active filter chips */}
                    {(selectedTS || selectedShift || selectedList || selectedApp) && (
                        <Box sx={{
                            mt: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap'
                        }}>
                            {selectedTS && (
                                <Chip
                                    label={`TS: ${tsMembers.find(m => m.id === selectedTS)?.fullName || selectedTS}`}
                                    onDelete={() => setSelectedTS('')}
                                    color="primary"
                                    size="small"
                                    sx={{ 
                                        fontWeight: 600, 
                                        fontSize: 14,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'white',
                                            '&:hover': {
                                                color: '#e3e8ee'
                                            }
                                        }
                                    }}
                                />
                            )}
                            {selectedShift && (
                                <Chip
                                    label={`Ca: ${selectedShift}`}
                                    onDelete={() => setSelectedShift('')}
                                    color="primary"
                                    size="small"
                                    sx={{ 
                                        fontWeight: 600, 
                                        fontSize: 14,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'white',
                                            '&:hover': {
                                                color: '#e3e8ee'
                                            }
                                        }
                                    }}
                                />
                            )}
                            {selectedList && (
                                <Chip
                                    label={`Status: ${getListName(selectedList)}`}
                                    onDelete={() => setSelectedList('')}
                                    color="primary"
                                    size="small"
                                    sx={{ 
                                        fontWeight: 600, 
                                        fontSize: 14,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'white',
                                            '&:hover': {
                                                color: '#e3e8ee'
                                            }
                                        }
                                    }}
                                />
                            )}
                            {selectedApp && (
                                <Chip
                                    label={`App: ${appData.find(a => a.label_trello === selectedApp)?.app_name || selectedApp}`}
                                    onDelete={() => setSelectedApp('')}
                                    color="primary"
                                    size="small"
                                    sx={{ 
                                        fontWeight: 600, 
                                        fontSize: 14,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'white',
                                            '&:hover': {
                                                color: '#e3e8ee'
                                            }
                                        }
                                    }}
                                />
                            )}
                        </Box>
                    )}
                </Paper>

                {loading ? (
                    <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <svg width="80" height="80" viewBox="0 0 40 40" stroke="#1976d2">
                                <g fill="none" fillRule="evenodd">
                                    <g transform="translate(2 2)" strokeWidth="3">
                                        <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                        <path d="M36 18c0-9.94-8.06-18-18-18">
                                            <animateTransform
                                                attributeName="transform"
                                                type="rotate"
                                                from="0 18 18"
                                                to="360 18 18"
                                                dur="1s"
                                                repeatCount="indefinite" />
                                        </path>
                                    </g>
                                </g>
                            </svg>
                            <Typography sx={{ mt: 2, color: '#1976d2', fontWeight: 700, fontSize: 20 }}>Loading data...</Typography>
                        </Box>
                    </Box>
                ) : (
                    <>
                        {/* Status Boxes */}
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: 3, 
                            maxWidth: 1200,
                            margin: '0 auto',
                            width: '100%'
                        }}>
                            {/* Total Cards Box */}
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center',
                                mb: 1
                            }}>
                                <Paper elevation={0} sx={{ 
                                    p: 3, 
                                    borderRadius: 2, 
                                    background: 'white', 
                                    boxShadow: '0 1px 4px 0 #e0e7ef',
                                    border: '1px solid #1976d2',
                                    minWidth: 200,
                                    textAlign: 'center',
                                    width: 'fit-content',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}>
                                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 700, mb: 1 }}>Total Cards</Typography>
                                    <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 800 }}>{filteredByApp.length}</Typography>
                                </Paper>
                            </Box>

                            {/* First Row */}
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 3,
                                justifyContent: 'center',
                                '& > *': { flex: 1 }
                            }}>
                                <StatusBox 
                                    title="Dev Pending" 
                                    count={getCardCountByList(STATUS_LISTS.DEV_PENDING)} 
                                    color="#f44336"
                                    listId={STATUS_LISTS.DEV_PENDING}
                                />
                                <StatusBox 
                                    title="TS Pending" 
                                    count={getCardCountByList(STATUS_LISTS.TS_PENDING)} 
                                    color="#ff9800"
                                    listId={STATUS_LISTS.TS_PENDING}
                                />
                                <StatusBox 
                                    title="Waiting Permission" 
                                    count={getCardCountByList(STATUS_LISTS.WAITING_PERMISSION)} 
                                    color="#9c27b0"
                                    listId={STATUS_LISTS.WAITING_PERMISSION}
                                />
                            </Box>
                            {/* Second Row */}
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 3,
                                justifyContent: 'center',
                                '& > *': { flex: 1 }
                            }}>
                                <StatusBox 
                                    title="Waiting Confirmation" 
                                    count={getCardCountByList(STATUS_LISTS.WAITING_CONFIRMATION)} 
                                    color="#2196f3"
                                    listId={STATUS_LISTS.WAITING_CONFIRMATION}
                                />
                                <StatusBox 
                                    title="TS Done" 
                                    count={getCardCountByList(STATUS_LISTS.TS_DONE)} 
                                    color="#4caf50"
                                    listId={STATUS_LISTS.TS_DONE}
                                />
                                <StatusBox 
                                    title="Dev Done" 
                                    count={getCardCountByList(STATUS_LISTS.DEV_DONE)} 
                                    color="#009688"
                                    listId={STATUS_LISTS.DEV_DONE}
                                />
                            </Box>
                        </Box>

                        {/* Charts Section */}
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', lg: 'row' }, 
                            gap: 4, 
                            maxWidth: 1400,
                            margin: '0 auto',
                            width: '100%'
                        }}>
                            {/* Pie Chart */}
                            <Paper elevation={0} sx={{ 
                                p: 3, 
                                borderRadius: 2, 
                                background: 'white', 
                                boxShadow: '0 1px 4px 0 #e0e7ef', 
                                flex: 1,
                                minWidth: 0
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700, 
                                    mb: 3, 
                                    color: '#1976d2',
                                    borderBottom: '2px solid #e3e8ee',
                                    pb: 2
                                }}>Cards per TS</Typography>
                                <ResponsiveContainer width="100%" height={320}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={110}
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {pieData.map((entry, idx) => (
                                                <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>

                            {/* Bar Chart */}
                            <Paper elevation={0} sx={{ 
                                p: 3, 
                                borderRadius: 2, 
                                background: 'white', 
                                boxShadow: '0 1px 4px 0 #e0e7ef', 
                                flex: 1,
                                minWidth: 0
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700, 
                                    mb: 3, 
                                    color: '#1976d2',
                                    borderBottom: '2px solid #e3e8ee',
                                    pb: 2
                                }}>Cards per Shift</Typography>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart 
                                        data={barData} 
                                        margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                        onClick={state => {
                                            if (state && state.activeLabel) {
                                                setSelectedShift(state.activeLabel === selectedShift ? '' : state.activeLabel);
                                            }
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="shift" />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="count" fill="#1976d2" name="Cards" radius={[4, 4, 0, 0]} cursor="pointer">
                                            {barData.map((entry, idx) => (
                                                <Cell key={`cell-${idx}`} fill={entry.shift === selectedShift ? '#1565c0' : '#1976d2'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Box>

                        {/* Issues by App Charts */}
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', lg: 'row' }, 
                            gap: 4, 
                            maxWidth: 1400,
                            margin: '0 auto',
                            width: '100%',
                            mb: 4
                        }}>
                            {/* TS1 Apps Chart */}
                            <Paper elevation={0} sx={{ 
                                p: 3, 
                                borderRadius: 2, 
                                background: 'white', 
                                boxShadow: '0 1px 4px 0 #e0e7ef', 
                                flex: 1,
                                minWidth: 0
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700, 
                                    mb: 3, 
                                    color: '#1976d2',
                                    borderBottom: '2px solid #e3e8ee',
                                    pb: 2
                                }}>
                                    Issues by App - TS1 ({getIssuesByAppTS1Data().reduce((sum, item) => sum + item.count, 0)} total)
                                </Typography>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart 
                                        data={getIssuesByAppTS1Data()} 
                                        margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                        layout="horizontal"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="app" 
                                            interval={0} 
                                            angle={-20} 
                                            textAnchor="end" 
                                            height={80}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="count" fill="#1976d2" name="Issues" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>

                            {/* TS2 Apps Chart */}
                            <Paper elevation={0} sx={{ 
                                p: 3, 
                                borderRadius: 2, 
                                background: 'white', 
                                boxShadow: '0 1px 4px 0 #e0e7ef', 
                                flex: 1,
                                minWidth: 0
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700, 
                                    mb: 3, 
                                    color: '#1976d2',
                                    borderBottom: '2px solid #e3e8ee',
                                    pb: 2
                                }}>
                                    Issues by App - TS2 ({getIssuesByAppTS2Data().reduce((sum, item) => sum + item.count, 0)} total)
                                </Typography>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart 
                                        data={getIssuesByAppTS2Data()} 
                                        margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                        layout="horizontal"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="app" 
                                            interval={0} 
                                            angle={-20} 
                                            textAnchor="end" 
                                            height={80}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Bar dataKey="count" fill="#ff9800" name="Issues" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Box>

                        {/* Self Removal Chart */}
                        <Paper elevation={0} sx={{ 
                            p: 3, 
                            borderRadius: 2, 
                            background: 'white', 
                            boxShadow: '0 1px 4px 0 #e0e7ef', 
                            maxWidth: 1400, 
                            margin: '0 auto',
                            width: '100%'
                        }}>
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                mb: 3,
                                borderBottom: '2px solid #e3e8ee',
                                pb: 2
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700, 
                                    color: '#1976d2'
                                }}>Self Removal Count</Typography>
                                {selectedRemovalTS && (
                                    <Chip
                                        label={`Selected: ${selectedRemovalTS}`}
                                        onDelete={() => setSelectedRemovalTS('')}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart
                                    data={getSelfRemovalData(filteredByShift)}
                                    margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                    layout="vertical"
                                    onClick={state => {
                                        if (state && state.activeLabel) {
                                            setSelectedRemovalTS(state.activeLabel === selectedRemovalTS ? '' : state.activeLabel);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        width={150}
                                        tick={{ fontSize: 14 }}
                                    />
                                    <RechartsTooltip />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#ff9800" 
                                        name="Self Removals"
                                        radius={[0, 4, 4, 0]}
                                        cursor="pointer"
                                    >
                                        {getSelfRemovalData(filteredByShift).map((entry, idx) => (
                                            <Cell 
                                                key={`cell-${idx}`} 
                                                fill={entry.name === selectedRemovalTS ? '#1565c0' : 
                                                    entry.value > 5 ? '#f44336' : 
                                                    entry.value > 2 ? '#ff9800' : '#4caf50'} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>

                        {/* Card Grid Section - Hiển thị dưới bảng */}
                        <Box sx={{ mt: 5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>
                                Card Grid View (Preview)
                            </Typography>
                            <Grid container spacing={3}>
                                {sortedCards.map(card => {
                                    let createDate = '';
                                    let moveToDoingDate = '';
                                    let dueCompleteDate = '';
                                    let resolutionTime = null;
                                    let memberNames = [];
                                    if (Array.isArray(card.actions)) {
                                        const createAction = card.actions.find(a => a.type === 'createCard');
                                        if (createAction && createAction.date) {
                                            createDate = dayjs(createAction.date).format('HH:mm DD/MM');
                                        }
                                        const moveToDoingAction = card.actions.find(a =>
                                            a.type === 'updateCard' &&
                                            a.data?.listAfter?.name === 'Doing (Inshift)'
                                        );
                                        if (moveToDoingAction && moveToDoingAction.date) {
                                            moveToDoingDate = dayjs(moveToDoingAction.date).format('HH:mm DD/MM');
                                        }
                                        const dueCompleteAction = [...card.actions].reverse().find(a =>
                                            a.type === 'updateCard' && a.data?.card?.dueComplete === true && a.date
                                        );
                                        if (dueCompleteAction && dueCompleteAction.date) {
                                            dueCompleteDate = dayjs(dueCompleteAction.date).format('HH:mm DD/MM');
                                        }
                                    }
                                    if (card.dueComplete) {
                                        resolutionTime = resolutionTimes[card.id];
                                    }
                                    if (Array.isArray(card.idMembers)) {
                                        memberNames = card.idMembers.map(id => {
                                            const m = tsMembers.find(mem => mem.id === id);
                                            return m ? m.fullName : null;
                                        }).filter(Boolean);
                                    }
                                    // Chọn màu border theo trạng thái
                                    let borderColor = '#e3e8ee';
                                    if (card.dueComplete) borderColor = '#4caf50';
                                    else if (getListName(card.idList).toLowerCase().includes('pending')) borderColor = '#ff9800';
                                    else if (getListName(card.idList).toLowerCase().includes('done')) borderColor = '#1976d2';
                                    // Badge màu cho resolution
                                    let resBg = resolutionTime ? (resolutionTime.resolutionTime > 120 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)') : '#f3f4f6';
                                    let resColor = resolutionTime ? (resolutionTime.resolutionTime > 120 ? '#ef4444' : '#22c55e') : '#64748b';
                                    return (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                                            <Paper
                                                sx={{
                                                    p: 2.5,
                                                    borderRadius: 4,
                                                    boxShadow: '0 2px 12px 0 #e0e7ef',
                                                    border: `2.5px solid ${borderColor}`,
                                                    transition: 'all 0.18s',
                                                    height: '100%',
                                                    '&:hover': {
                                                        boxShadow: '0 8px 32px 0 #b6c2d9',
                                                        transform: 'translateY(-4px) scale(1.03)',
                                                        borderColor: '#1976d2',
                                                        cursor: 'pointer'
                                                    },
                                                    display: 'flex', flexDirection: 'column', gap: 1.2
                                                }}
                                                onClick={() => { setSelectedCardDetail(card); setIsCardDetailModalOpen(true); }}
                                            >
                                                <Typography variant="h6" noWrap title={card.name} sx={{ fontWeight: 800, color: '#1976d2', mb: 0.5, fontSize: 19, letterSpacing: 0.2 }}>
                                                    {card.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Box component="span" sx={{ fontSize: 13, color: '#64748b', fontWeight: 600, mr: 0.5 }}>TS:</Box>
                                                    {memberNames.length > 0 ? memberNames.map((name, idx) => (
                                                        <Box key={name} component="span" sx={{
                                                            display: 'inline-flex', alignItems: 'center', px: 1, py: 0.2, borderRadius: 2, fontSize: 13, fontWeight: 600,
                                                            background: '#e3e8ee', color: '#1976d2', mr: 0.5
                                                        }}>
                                                            <span style={{ fontSize: 15, marginRight: 3 }}>👤</span>{name}
                                                        </Box>
                                                    )) : <span style={{ color: '#bdbdbd', fontWeight: 500 }}>-</span>}
                                                </Box>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                                                    <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Status:</Box>
                                                    <Box sx={{ fontSize: 13, color: '#1976d2', fontWeight: 700 }}>{getListName(card.idList)}</Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Create:</Box>
                                                    <Box sx={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{createDate || '-'}</Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Moved to Doing:</Box>
                                                    <Box sx={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{moveToDoingDate || '-'}</Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Due Complete:</Box>
                                                    <Box sx={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{dueCompleteDate || '-'}</Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                    <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Resolution:</Box>
                                                    <Box sx={{
                                                        px: 1.5, py: 0.5, borderRadius: '16px', fontSize: 13, fontWeight: 700,
                                                        background: resBg, color: resColor, minWidth: 60, textAlign: 'center',
                                                        letterSpacing: 0.2
                                                    }}>
                                                        {resolutionTime ? `${Math.floor(resolutionTime.resolutionTime / 60)}h ${resolutionTime.resolutionTime % 60}m` : '-'}
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    );
                                })}
                                {sortedCards.length === 0 && (
                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 4, textAlign: 'center', color: '#64748b', fontSize: 16, fontWeight: 500 }}>
                                            No cards found
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </>
                )}
            </Box>
            {/* Card Detail Modal */}
            <CardDetailModal
                open={isCardDetailModalOpen}
                onClose={() => setIsCardDetailModalOpen(false)}
                cardId={selectedCardDetail?.id}
            />
        </>
    );
};

export default CardsDetail;