import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Link, Grid, Button, Box, Chip, TextField,
    FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
    useTheme, alpha, Tabs, Tab, CircularProgress, Backdrop
} from '@mui/material';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
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
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(false);

    const tabLabels = [
        { 
            label: 'Doing', 
            listNames: ['New Issues', 'Doing (Inshift)'] 
        },
        { 
            label: 'Speed up', 
            listNames: ['Speed up'] 
        },
        { 
            label: 'Waiting Confirmation', 
            listNames: ["Waiting for Customer's Confirmation (SLA: 2 days)"] 
        },
        { 
            label: 'Waiting Permission', 
            listNames: ['Update workflow required or Waiting for access (SLA: 2 days)'] 
        },
        { 
            label: 'Done', 
            listNames: ['Done'] 
        }
    ];

    const handleTabChange = async (event, newValue) => {
        setSelectedTab(newValue);
        await fetchTabData(newValue);
    };

    const fetchTabData = useCallback(async (tabIndex) => {
        try {
            setLoading(true);
            
            // Get lists for this tab
            const tabLists = listsId.filter(list => 
                tabLabels[tabIndex].listNames.includes(list.name)
            );

            // Fetch cards for these lists
            const fetchPromises = tabLists.map(list => 
                getCardsByList(list.id).then(cardsInList => 
                    cardsInList.map(card => ({
                        ...card,
                        listName: list.name
                    }))
                )
            );

            const results = await Promise.all(fetchPromises);
            const tabCards = results.flat();

            setCards(tabCards);
            setFilter({ type: null, value: null });
        } catch (error) {
            console.error('Error fetching tab data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch initial tab data
    useEffect(() => {
        fetchTabData(0);
    }, [fetchTabData]);

    // Get TS members
    const tsMembers = useMemo(() => {
        return members.filter(member => member.role === 'TS');
    }, []);

    // Memoize filtered cards to prevent unnecessary recalculations
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

    // Memoized data for charts
    const chartsData = useMemo(() => {
        // Count total cards per TS member
        const memberTotals = {};
        const memberListTotals = {};
        const memberCompletedTotals = {};

        cards.forEach(card => {
            card.idMembers.forEach(memberId => {
                const member = tsMembers.find(m => m.id === memberId);
                if (!member) return; // Skip if not a TS member

                // Update total cards per member
                memberTotals[member.fullName] = (memberTotals[member.fullName] || 0) + 1;

                // Update completed cards count
                if (card.dueComplete) {
                    memberCompletedTotals[member.fullName] = (memberCompletedTotals[member.fullName] || 0) + 1;
                }

                // Update cards per member per list
                if (!memberListTotals[member.fullName]) {
                    memberListTotals[member.fullName] = {};
                }
                const listName = listsId.find(l => l.id === card.idList)?.name || 'Unknown';
                memberListTotals[member.fullName][listName] = (memberListTotals[member.fullName][listName] || 0) + 1;
            });
        });

        // Format data for pie chart
        const pieData = Object.entries(memberTotals).map(([name, value]) => ({
            name,
            value
        }));

        // Format data for bar chart
        const uniqueLists = [...new Set(cards.map(card => 
            listsId.find(l => l.id === card.idList)?.name || 'Unknown'
        ))];

        const barData = Object.entries(memberTotals).map(([name]) => ({
            name,
            'Total Issues': memberTotals[name] || 0,
            'Done Issues': memberCompletedTotals[name] || 0,
            ...uniqueLists.reduce((acc, listName) => ({
                ...acc,
                [listName]: memberListTotals[name]?.[listName] || 0
            }), {})
        }));

        return {
            pieData,
            barData,
            uniqueLists
        };
    }, [cards, tsMembers]);

    const getAppLabel = (labels) => {
        const appLabel = labels.find(label => label.name?.startsWith('App:'));
        return appLabel ? appLabel.name.replace('App:', '').trim() : 'Unknown';
    };

    const getAgentName = (idMembers) => {
        if (!idMembers || idMembers.length === 0) return '—';
        const memberNames = idMembers
            .map(id => {
                const member = members.find(m => m.id === id);
                return member ? member.fullName : null;
            })
            .filter(name => name !== null);
        return memberNames.length > 0 ? memberNames.join(', ') : '—';
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

    const handleTaskClick = (card) => {
        setSelectedCard(card);
    };

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
                        onClick={() => fetchTabData(selectedTab)} 
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

            <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 500,
                            minWidth: 'auto',
                            px: 3,
                            py: 1.5,
                        },
                        '& .MuiTabs-indicator': {
                            height: 3,
                        }
                    }}
                >
                    {tabLabels.map((tab, index) => (
                        <Tab 
                            key={index} 
                            label={tab.label} 
                            sx={{
                                '&.Mui-selected': {
                                    color: 'primary.main',
                                    fontWeight: 600,
                                }
                            }}
                        />
                    ))}
                </Tabs>
            </Paper>

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

            {/* Charts Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Pie Chart */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                        p: 3, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '400px'
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Total Cards per TS Member
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Legend 
                                    verticalAlign="top" 
                                    align="center"
                                    height={36}
                                />
                                <Pie
                                    data={chartsData.pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={120}
                                    fill="#8884d8"
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                >
                                    {chartsData.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Bar Chart */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                        p: 3, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '400px'
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Cards per TS Member per List
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartsData.barData}>
                                <Legend 
                                    verticalAlign="top" 
                                    align="center"
                                    height={36}
                                />
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                                <YAxis />
                                <Tooltip />
                                <Bar 
                                    dataKey="Total Issues" 
                                    fill="#8884d8"
                                    name="Total Issues"
                                />
                                <Bar 
                                    dataKey="Done Issues" 
                                    fill="#82ca9d"
                                    name="Done Issues"
                                />
                                {chartsData.uniqueLists.map((list, index) => (
                                    <Bar 
                                        key={list} 
                                        dataKey={list} 
                                        stackId="a" 
                                        fill={COLORS[index % COLORS.length]} 
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

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
                            <TableCell><b>List</b></TableCell>
                            <TableCell><b>Status</b></TableCell>
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
                                            onClick={() => handleTaskClick(card)}
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
                                    <TableCell>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: 1,
                                            maxWidth: '300px'
                                        }}>
                                            {card.idMembers.map(id => {
                                                const member = members.find(m => m.id === id);
                                                if (!member) return null;
                                                return (
                                                    <Chip
                                                        key={id}
                                                        label={member.fullName}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                            color: 'primary.main',
                                                            fontWeight: 500,
                                                            '&:hover': {
                                                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{getAppLabel(card.labels || [])}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={card.listName}
                                            size="small"
                                            sx={{
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                color: 'primary.main',
                                                fontWeight: 500,
                                                minWidth: '120px'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={card.dueComplete ? "Done" : "In Progress"}
                                            size="small"
                                            color={card.dueComplete ? "success" : "warning"}
                                            sx={{
                                                fontWeight: 500,
                                                minWidth: '100px'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                        {dueDate ? dueDate.toLocaleDateString() : '—'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Backdrop
                sx={{ 
                    color: '#fff', 
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    position: 'absolute',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(4px)'
                }}
                open={loading}
            >
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 2
                }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" color="primary">
                        Đang tải dữ liệu...
                    </Typography>
                </Box>
            </Backdrop>

            <CardDetailModal
                open={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                card={selectedCard}
            />
        </Box>
    );
};

export default TSLeadSummary;
