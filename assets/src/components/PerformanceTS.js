import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, TextField, Paper, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import dayjs from 'dayjs';
import members from '../data/members.json';
import { getCardsByBoardForPerformanceTS } from '../api/trelloApi';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PerformanceTS = () => {
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
    const [selectedTS, setSelectedTS] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedShift, setSelectedShift] = useState('');

    // Filter TS and TS-lead members
    const tsMembers = members.filter(member => 
        member.role?.toLowerCase() === 'ts' || 
        member.role?.toLowerCase() === 'ts-lead'
    );

    useEffect(() => {
        const fetchCards = async () => {
            setLoading(true);
            setError(null);
            try {
                // Build since and before for the full selectedDate
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

    // Filter cards by selected TS member
    const filteredByTS = selectedTS
        ? cards.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(selectedTS))
        : cards;

    // Filter by shift if selected
    const filteredCards = selectedShift
        ? filteredByTS.filter(card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(a => a.type === 'createCard');
                if (createAction && createAction.date) {
                    return getShift(createAction.date) === selectedShift;
                }
            }
            return false;
        })
        : filteredByTS;

    // Pie chart data: number of cards per TS (from filteredCards)
    const pieData = tsMembers
        .map(ts => {
            const count = filteredCards.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(ts.id)).length;
            return { name: ts.fullName, value: count };
        })
        .filter(d => d.value > 0);

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

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 4 }, maxWidth: '100%', margin: '0 auto', background: 'linear-gradient(135deg, #f8fafc 0%, #e3e8ee 100%)', minHeight: '100vh' }}>
            <Paper elevation={4} sx={{ mb: 4, p: { xs: 2, md: 4 }, borderRadius: 3, background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)', boxShadow: '0 6px 32px 0 rgba(30, 41, 59, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, letterSpacing: 2, textAlign: 'center', textShadow: '0 2px 8px #1565c0' }}>
                    Performance TS
                </Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 3, background: 'rgba(255,255,255,0.85)', border: '1.5px solid #e3e8ee', boxShadow: '0 2px 8px 0 #e0e7ef' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1976d2', letterSpacing: 1 }}>Filter</Typography>
                <Grid container spacing={2} alignItems="center">
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
                {/* Active filter chips inside filter box */}
                {(selectedTS || selectedShift) && (
                    <Box sx={{
                        mt: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        // No background, no shadow, no extra padding, align left
                    }}>
                        {selectedTS && (
                            <Chip
                                label={`TS: ${tsMembers.find(m => m.id === selectedTS)?.fullName || selectedTS}`}
                                onDelete={() => setSelectedTS('')}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: 14 }}
                            />
                        )}
                        {selectedShift && (
                            <Chip
                                label={`Ca: ${selectedShift}`}
                                onDelete={() => setSelectedShift('')}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: 14 }}
                            />
                        )}
                    </Box>
                )}
            </Paper>

            {/* Pie Chart: Cards per TS */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: 'white', boxShadow: '0 1px 4px 0 #e0e7ef', maxWidth: 700, margin: '0 auto', mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>Số lượng cards mỗi TS</Typography>
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

            {/* Bar Chart: Cards per Shift */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: 'white', boxShadow: '0 1px 4px 0 #e0e7ef', maxWidth: 900, margin: '0 auto', mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>Số lượng cards theo ca (4 tiếng)</Typography>
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

            {/* Card count box */}
            <Box sx={{ p: 2, background: 'white', borderRadius: 2, boxShadow: '0 1px 4px 0 #e0e7ef', maxWidth: 500, margin: '0 auto', mb: 4 }}>
                {loading ? (
                    <Typography>Loading cards...</Typography>
                ) : error ? (
                    <Typography color="error">{error}</Typography>
                ) : (
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Số lượng cards: {filteredCards.length}
                    </Typography>
                )}
            </Box>

            {/* Cards Table */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: 'white', boxShadow: '0 1px 4px 0 #e0e7ef', maxWidth: 1100, margin: '0 auto' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>Danh sách cards</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f5f5f5' }}>
                                <th style={{ padding: 10, textAlign: 'left' }}>Tên card</th>
                                <th style={{ padding: 10, textAlign: 'left' }}>URL</th>
                                <th style={{ padding: 10, textAlign: 'left' }}>Create Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCards.map(card => {
                                // Find createCard action
                                let createDate = '';
                                if (Array.isArray(card.actions)) {
                                    const createAction = card.actions.find(a => a.type === 'createCard');
                                    if (createAction && createAction.date) {
                                        createDate = dayjs(createAction.date).format('YYYY-MM-DD HH:mm:ss');
                                    }
                                }
                                return (
                                    <tr key={card.id} style={{ borderBottom: '1px solid #e0e7ef' }}>
                                        <td style={{ padding: 10 }}>{card.name}</td>
                                        <td style={{ padding: 10 }}>
                                            <a href={card.url || card.shortUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>
                                                {card.url || card.shortUrl}
                                            </a>
                                        </td>
                                        <td style={{ padding: 10 }}>{createDate}</td>
                                    </tr>
                                );
                            })}
                            {sortedCards.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: 16, color: '#64748b' }}>Không có card nào</td>
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