import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, TextField, Paper, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import dayjs from 'dayjs';
import members from '../data/members.json';
import lists from '../data/listsId.json';
import { getCardsByBoardForPerformanceTS } from '../api/trelloApi';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PerformanceTS = () => {
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
    const [selectedTS, setSelectedTS] = useState('');
    const [selectedList, setSelectedList] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedShift, setSelectedShift] = useState('');
    const [selectedRemovalTS, setSelectedRemovalTS] = useState('');

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
        return filteredCards.filter(card => card.idList === listId).length;
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

    // Pie chart data: number of cards per TS (from filteredCards)
    const pieData = tsMembers
        .map(ts => {
            const count = filteredCards.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(ts.id)).length;
            return { name: ts.fullName, value: count };
        })
        .filter(d => d.value > 0);

    // Bar chart data: number of cards per 4-hour shift
    const shiftLabels = [
        'Ca 1',
        'Ca 2',
        'Ca 3',
        'Ca 4',
        'Ca 5.1',
        'Ca 5.2',
        'Ca 6'
    ];
    const getShift = (dateString) => {
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
    };

    // Bar chart data: number of cards per 4-hour shift (from filteredCards)
    const shiftMap = Object.fromEntries(shiftLabels.map(label => [label, 0]));
    filteredCards.forEach(card => {
        if (Array.isArray(card.actions)) {
            const createAction = card.actions.find(a => a.type === 'createCard');
            if (createAction && createAction.date) {
                const shift = getShift(createAction.date);
                if (shift && shiftMap.hasOwnProperty(shift)) shiftMap[shift]++;
            }
        }
    });
    const barData = shiftLabels.map(label => ({ shift: label, count: shiftMap[label] }));

    const pieColors = [
        '#1976d2', '#42a5f5', '#66bb6a', '#ffa726', '#d32f2f', '#7e57c2', '#26a69a', '#fbc02d', '#8d6e63', '#ec407a',
        '#ab47bc', '#26c6da', '#9ccc65', '#ff7043', '#5c6bc0', '#cfd8dc', '#789262', '#bdbdbd', '#ffb300', '#8e24aa'
    ];

    // Sort cards by create date (oldest first)
    const sortedCards = [...filteredCards].sort((a, b) => {
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

    useEffect(() => {
        const fetchCards = async () => {
            setLoading(true);
            setError(null);
            try {
                const since = dayjs(selectedDate).startOf('day').toISOString();
                const before = dayjs(selectedDate).endOf('day').toISOString();
                const data = await getCardsByBoardForPerformanceTS(since, before);
                setCards(data || []);
            } catch (err) {
                setError(err.message || 'Error fetching cards');
            } finally {
                setLoading(false);
            }
        };
        fetchCards();
    }, [selectedDate, selectedTS]);

    return (
        <Box sx={{ 
            p: { xs: 2, sm: 3, md: 4 }, 
            maxWidth: '100%', 
            margin: '0 auto', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e3e8ee 100%)', 
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
        }}>
            {/* Header */}
            <Paper elevation={4} sx={{ 
                p: { xs: 2, md: 4 }, 
                borderRadius: 3, 
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)', 
                boxShadow: '0 6px 32px 0 rgba(30, 41, 59, 0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Typography variant="h4" sx={{ 
                    color: 'white', 
                    fontWeight: 800, 
                    letterSpacing: 2, 
                    textAlign: 'center', 
                    textShadow: '0 2px 8px #1565c0'
                }}>
                    Performance TS
                </Typography>
            </Paper>

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
                </Grid>
                {/* Active filter chips */}
                {(selectedTS || selectedShift || selectedList) && (
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
                    </Box>
                )}
            </Paper>

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
                        <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 800 }}>{filteredCards.length}</Typography>
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

            {/* Cards Table */}
            <Paper elevation={0} sx={{ 
                p: 3, 
                borderRadius: 2, 
                background: 'white', 
                boxShadow: '0 1px 4px 0 #e0e7ef', 
                maxWidth: 1400, 
                margin: '0 auto',
                width: '100%'
            }}>
                <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    mb: 3, 
                    color: '#1976d2',
                    borderBottom: '2px solid #e3e8ee',
                    pb: 2
                }}>
                    {selectedRemovalTS ? `Cards where ${selectedRemovalTS} removed themselves` : 'Cards List'}
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                    }}>
                        <thead>
                            <tr style={{ 
                                background: '#f8fafc',
                                borderBottom: '2px solid #e3e8ee'
                            }}>
                                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#1976d2' }}>Card Name</th>
                                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#1976d2' }}>URL</th>
                                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#1976d2' }}>Status</th>
                                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#1976d2' }}>Create Date</th>
                                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#1976d2' }}>Remove Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCards.map(card => {
                                let createDate = '';
                                let removeDate = '';
                                if (Array.isArray(card.actions)) {
                                    const createAction = card.actions.find(a => a.type === 'createCard');
                                    if (createAction && createAction.date) {
                                        createDate = dayjs(createAction.date).format('YYYY-MM-DD HH:mm:ss');
                                    }
                                    const removeAction = card.actions.find(a => 
                                        a.type === 'removeMemberFromCard' && 
                                        a.member.fullName === selectedRemovalTS
                                    );
                                    if (removeAction && removeAction.date) {
                                        removeDate = dayjs(removeAction.date).format('YYYY-MM-DD HH:mm:ss');
                                    }
                                }
                                return (
                                    <tr key={card.id} style={{ 
                                        borderBottom: '1px solid #e3e8ee',
                                        '&:hover': {
                                            background: '#f8fafc'
                                        }
                                    }}>
                                        <td style={{ padding: 12 }}>{card.name}</td>
                                        <td style={{ padding: 12 }}>
                                            <a href={card.url || card.shortUrl} 
                                               target="_blank" 
                                               rel="noopener noreferrer" 
                                               style={{ 
                                                   color: '#1976d2', 
                                                   textDecoration: 'none',
                                                   '&:hover': {
                                                       textDecoration: 'underline'
                                                   }
                                               }}>
                                                {card.url || card.shortUrl}
                                            </a>
                                        </td>
                                        <td style={{ padding: 12 }}>{getListName(card.idList)}</td>
                                        <td style={{ padding: 12 }}>{createDate}</td>
                                        <td style={{ padding: 12 }}>{removeDate}</td>
                                    </tr>
                                );
                            })}
                            {sortedCards.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ 
                                        textAlign: 'center', 
                                        padding: 24, 
                                        color: '#64748b',
                                        fontSize: '16px',
                                        fontWeight: 500
                                    }}>No cards found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Box>
            </Paper>
        </Box>
    );
};

export default PerformanceTS;