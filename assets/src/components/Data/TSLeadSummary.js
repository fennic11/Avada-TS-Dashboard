import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Link, Grid, Button, Box, Chip, TextField,
    FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
    useTheme, alpha
} from '@mui/material';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getCardsByList } from '../../api/trelloApi';
import members from '../../data/members.json';
import listsId from '../../data/listsId.json';
import CardDetailModal from '../CardDetailModal';
import { parseISO, differenceInDays, subDays, isBefore, isAfter } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#2E93fA'];

const TSLeadSummary = () => {
    const theme = useTheme();
    const [cards, setCards] = useState([]);
    const [filter, setFilter] = useState({ type: null, value: null });
    const [selectedCard, setSelectedCard] = useState(null);
    const [sortByDueAsc, setSortByDueAsc] = useState(true);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const defaultList = listsId.find(list => list.name === 'New Issues');
    const [selectedListIds, setSelectedListIds] = useState(defaultList ? [defaultList.id] : []);

    const getAppLabel = (labels) => {
        const appLabel = labels.find(label => label.name?.startsWith('App:'));
        return appLabel ? appLabel.name.replace('App:', '').trim() : 'Unknown';
    };

    const getAgentName = (idMembers) => {
        if (!idMembers || idMembers.length === 0) return '—';
        const member = members.find(m => idMembers.includes(m.id));
        return member ? member.name : '—';
    };

    const getOverdueColor = (daysOverdue) => {
        if (!daysOverdue) return 'inherit';
        const alpha = Math.min(0.2 + daysOverdue * 0.1, 1);
        return `rgba(255, 0, 0, ${alpha})`;
    };

    const getOverdueDays = (dueDate) => {
        if (!dueDate) return null;
        const diff = differenceInDays(new Date(), parseISO(dueDate));
        return diff > 0 ? diff : null;
    };

    const fetchCards = useCallback(async () => {
        try {
            const allCards = [];
            for (const list of listsId.filter(l => selectedListIds.includes(l.id))) {
                const cardsInList = await getCardsByList(list.id);
                const cardsWithListName = cardsInList.map(card => ({
                    ...card,
                    listName: list.name
                }));
                allCards.push(...cardsWithListName);
            }
            setCards(allCards);
            setFilter({ type: null, value: null });
        } catch (error) {
            console.error('Error fetching cards:', error);
        }
    }, [selectedListIds]);

    useEffect(() => {
        fetchCards();
    }, [fetchCards]);

    const filteredCards = useMemo(() => {
        return cards
            .filter(card => {
                let pass = true;

                if (filter.type === 'app') {
                    pass = getAppLabel(card.labels || []) === filter.value;
                } else if (filter.type === 'member') {
                    pass = card.idMembers.some(id => {
                        const member = members.find(m => m.id === id);
                        return member?.name === filter.value;
                    });
                } else if (filter.type === 'overdue') {
                    const days = getOverdueDays(card.due);
                    pass = !!days;
                }

                if (card.due && (startDate || endDate)) {
                    const createdAt = subDays(parseISO(card.due), 2);
                    if (startDate && isBefore(createdAt, parseISO(startDate))) {
                        pass = false;
                    }
                    if (endDate && isAfter(createdAt, parseISO(endDate))) {
                        pass = false;
                    }
                }

                return pass;
            })
            .sort((a, b) => {
                const dateA = a.due ? new Date(a.due) : null;
                const dateB = b.due ? new Date(b.due) : null;

                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;

                return sortByDueAsc ? dateA - dateB : dateB - dateA;
            });
    }, [cards, filter, startDate, endDate, sortByDueAsc]);

    const appStats = useMemo(() => {
        const appCount = {};
        filteredCards.forEach(card => {
            const app = getAppLabel(card.labels || []);
            appCount[app] = (appCount[app] || 0) + 1;
        });
        return Object.entries(appCount).map(([name, value]) => ({ name, value }));
    }, [filteredCards]);

    const memberStats = useMemo(() => {
        const memberCount = {};
        filteredCards.forEach(card => {
            card.idMembers.forEach(id => {
                const member = members.find(m => m.id === id);
                if (member) {
                    memberCount[member.name] = (memberCount[member.name] || 0) + 1;
                }
            });
        });
        return Object.entries(memberCount).map(([name, value]) => ({ name, value }));
    }, [filteredCards]);

    return (
        <Box sx={{ 
            width: '100%', 
            p: 4, 
            maxWidth: '1800px', 
            margin: '0 auto',
            minHeight: '100vh',
            background: alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(10px)',
        }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                p: 3,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}>
                <Typography variant="h4" sx={{ 
                    fontWeight: 700,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                    🎯 TS Lead Workspace
                </Typography>
                <Box>
                    <Button 
                        variant="outlined" 
                        onClick={fetchCards} 
                        sx={{ 
                            mr: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            }
                        }}
                    >
                        Reset Data
                    </Button>
                    {filter.type && (
                        <Button 
                            variant="contained" 
                            onClick={() => setFilter({ type: null, value: null })}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                        >
                            Clear Filter
                        </Button>
                    )}
                </Box>
            </Box>

            <FormControl fullWidth sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    background: 'white',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                    }
                }
            }}>
                <InputLabel id="list-select-label" shrink>
                    🗂&nbsp;Lists
                </InputLabel>
                <Select
                    labelId="list-select-label"
                    multiple
                    value={selectedListIds}
                    onChange={(e) => setSelectedListIds(e.target.value)}
                    notched
                    renderValue={(selected) =>
                        selected.map(id => listsId.find(l => l.id === id)?.name).join(', ')
                    }
                >
                    {listsId.map((list) => (
                        <MenuItem key={list.id} value={list.id}>
                            <Checkbox checked={selectedListIds.includes(list.id)} />
                            <ListItemText primary={list.name} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} md={3}>
                    <TextField
                        type="date"
                        label="📆 Start Date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={startDate || ''}
                        onChange={(e) => setStartDate(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    borderWidth: 2,
                                }
                            }
                        }}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField
                        type="date"
                        label="📆 End Date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={endDate || ''}
                        onChange={(e) => setEndDate(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    borderWidth: 2,
                                }
                            }
                        }}
                    />
                </Grid>
            </Grid>

            {filter.type && (
                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={`Filtered by ${filter.type === 'app' ? 'App' : 'Member'}: ${filter.value}`}
                        color="primary"
                        onDelete={() => setFilter({ type: null, value: null })}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            '& .MuiChip-deleteIcon': {
                                color: 'primary.main',
                                '&:hover': {
                                    color: 'error.main',
                                }
                            }
                        }}
                    />
                </Box>
            )}

            {(startDate || endDate) && (
                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={`CreatedAt: ${startDate || '...'} → ${endDate || '...'}`}
                        color="secondary"
                        onDelete={() => {
                            setStartDate(null);
                            setEndDate(null);
                        }}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            '& .MuiChip-deleteIcon': {
                                color: 'secondary.main',
                                '&:hover': {
                                    color: 'error.main',
                                }
                            }
                        }}
                    />
                </Box>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TableContainer 
                        component={Paper} 
                        sx={{ 
                            borderRadius: 3,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                            background: 'white',
                            '& .MuiTableCell-root': {
                                py: 2,
                                px: 3,
                            }
                        }}
                    >
                        <Table>
                            <TableHead>
                                <TableRow sx={{ 
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                                    '& .MuiTableCell-root': {
                                        fontWeight: 600,
                                        color: 'primary.main',
                                        fontSize: '1rem',
                                    }
                                }}>
                                    <TableCell><b>#</b></TableCell>
                                    <TableCell><b>Tên Card</b></TableCell>
                                    <TableCell><b>Agent</b></TableCell>
                                    <TableCell><b>App</b></TableCell>
                                    <TableCell
                                        sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': {
                                                color: 'primary.main',
                                            }
                                        }}
                                        onClick={() => setSortByDueAsc(prev => !prev)}
                                    >
                                        <b>Due Date {sortByDueAsc ? '▲' : '▼'}</b>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCards.map((card, index) => {
                                    const dueDate = card.due ? new Date(card.due) : null;
                                    const dueColor = getOverdueColor(getOverdueDays(card.due));

                                    return (
                                        <TableRow 
                                            key={card.id} 
                                            hover 
                                            sx={{ 
                                                backgroundColor: dueColor,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    transform: 'scale(1.01)',
                                                }
                                            }}
                                        >
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                <Link
                                                    component="button"
                                                    onClick={() => setSelectedCard(card)}
                                                    sx={{
                                                        color: 'inherit',
                                                        textDecoration: 'none',
                                                        fontWeight: 500,
                                                        '&:hover': {
                                                            textDecoration: 'underline',
                                                        }
                                                    }}
                                                >
                                                    {card.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{getAgentName(card.idMembers)}</TableCell>
                                            <TableCell>{getAppLabel(card.labels || [])}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>
                                                {dueDate ? dueDate.toLocaleDateString() : '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Box sx={{ 
                        background: 'white',
                        borderRadius: 3,
                        p: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '100%'
                    }}>
                        <Typography 
                            variant="h6" 
                            align="center" 
                            sx={{ 
                                mb: 2,
                                color: 'primary.main',
                                fontWeight: 600,
                                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                        >
                            📱 Số lượng theo App
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={appStats}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={100}
                                    label
                                    onClick={(data) => setFilter({ type: 'app', value: data.name })}
                                >
                                    {appStats.map((entry, index) => (
                                        <Cell 
                                            key={index} 
                                            fill={COLORS[index % COLORS.length]}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{
                                        background: 'white',
                                        borderRadius: 2,
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Box sx={{ 
                        background: 'white',
                        borderRadius: 3,
                        p: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '100%'
                    }}>
                        <Typography 
                            variant="h6" 
                            align="center" 
                            sx={{ 
                                mb: 2,
                                color: 'primary.main',
                                fontWeight: 600,
                                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                        >
                            👤 Số lượng theo Member
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={memberStats}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={100}
                                    label
                                    onClick={(data) => setFilter({ type: 'member', value: data.name })}
                                >
                                    {memberStats.map((entry, index) => (
                                        <Cell 
                                            key={index} 
                                            fill={COLORS[index % COLORS.length]}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{
                                        background: 'white',
                                        borderRadius: 2,
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>
            </Grid>

            <CardDetailModal
                open={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                card={selectedCard}
            />
        </Box>
    );
};

export default TSLeadSummary;
