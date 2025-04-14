import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Grid, Button, Box, Chip,
    FormControl, InputLabel, Select, MenuItem,
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
import { parseISO, differenceInDays } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#2E93fA'];

// Fixed colors for TS members
const TS_MEMBER_COLORS = {
    '66557fb36a637c6c5535b081': '#FF6B6B', // Nguyễn Văn Hoài An
    '63b3a60ff51ce601421b0dd3': '#4ECDC4', // Nguyễn Ngọc Anh
    '65f7bdde58e8e0a6ba703027': '#45B7D1', // Cuong TT
    '652379ca67556a7b753dd6d3': '#96CEB4', // Maison
    '67a1b61b94a1eddf291107f3': '#FFEEAD', // Carter
    '66385f83fe51bce2bd707ff6': '#D4A5A5', // Trần Thị Bích Phương
    '63b3a589a05c1801101fd5d2': '#9B59B6', // William
    '65dc1670ae5414d1dd11a26d': '#3498DB'  // Đỗ Minh Quân
};

const TSLeadSummary = () => {
    const theme = useTheme();
    const [cards, setCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [sortByDueAsc, setSortByDueAsc] = useState(true);
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

    const tabLabels = [
        { 
            label: 'Doing', 
            listNames: ['New Issues', 'Doing (Inshift)'] 
        },
        { 
            label: 'Speed up', 
            listNames: ['New Speed up (SLA: 2d)', 'CuongTT-Speed up'] 
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
            label: 'Dev Fixing', 
            listNames: ['Fix done from dev', 'Waiting to fix (from dev)']
        },
        { 
            label: 'Done', 
            listNames: ['Done'] 
        }
    ];
    
    // State for filters per tab
    const [tabFilters, setTabFilters] = useState(
        tabLabels.reduce((acc, tab) => ({
            ...acc,
            [tab.label]: {
                tsMember: '',
                status: '',
                type: null,
                value: null
            }
        }), {})
    );

    const statusOptions = [
        { value: 'waiting', label: 'Waiting' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
        { value: 'pending', label: 'Pending' }
    ];

    const fetchTabData = useCallback(async (tabIndex) => {
        setLoading(true);
        try {
            // Get lists for this tab
            const tabLists = listsId.filter(list => 
                tabLabels[tabIndex].listNames.includes(list.name)
            );

            // Fetch cards for these lists
            const fetchPromises = tabLists.map(list => 
                getCardsByList(list.id).then(cardsInList => 
                    cardsInList.map(card => ({
                        ...card,
                        listName: list.name,
                        listId: list.id
                    }))
                )
            );

            const results = await Promise.all(fetchPromises);
            const tabCards = results.flat();

            // Log for debugging
            console.log('Fetched cards:', tabCards);
            console.log('Tab lists:', tabLists);
            console.log('Tab index:', tabIndex);

            setCards(tabCards);
            setTabFilters(prev => ({
                ...prev,
                [tabLabels[tabIndex].label]: {
                    tsMember: '',
                    status: '',
                    type: null,
                    value: null
                }
            }));
        } catch (error) {
            console.error('Error fetching tab data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data for Doing tab by default
    useEffect(() => {
        fetchTabData(0); // 0 is the index of the Doing tab
    }, [fetchTabData]);

    const handleTabChange = async (event, newValue) => {
        setSelectedTab(newValue);
        await fetchTabData(newValue);
    };

    // Update filter for current tab
    const updateTabFilter = (filterType, value) => {
        setTabFilters(prev => ({
            ...prev,
            [tabLabels[selectedTab].label]: {
                ...prev[tabLabels[selectedTab].label],
                [filterType]: value
            }
        }));
    };

    // Get current tab's filters
    const currentFilters = useMemo(() => {
        return tabFilters[tabLabels[selectedTab].label];
    }, [tabFilters, selectedTab]);

    // Get TS members
    const tsMembers = useMemo(() => {
        return members.filter(member => member.role === 'TS');
    }, []);

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

    const getOverdueColor = (daysOverdue, dueComplete) => {
        if (dueComplete) return '#E8F5E9'; // Light green for done
        if (!daysOverdue) return '#FFFFFF'; // White for normal
        const alpha = Math.min(0.2 + daysOverdue * 0.1, 1);
        return `rgba(255, 0, 0, ${alpha})`; // Red for overdue
    };

    const getTextColor = (backgroundColor) => {
        if (backgroundColor === '#FFFFFF') return theme.palette.text.primary;
        if (backgroundColor === '#E8F5E9') return '#2E7D32'; // Dark green text for done
        return '#FFFFFF'; // White text for other cases
    };

    const getOverdueDays = (dueDate) => {
        if (!dueDate) return null;
        const diff = differenceInDays(new Date(), parseISO(dueDate));
        return diff > 0 ? diff : null;
    };

    const getCardStatus = (card) => {
        if (card.dueComplete) {
            return {
                label: "Done",
                color: "success"
            };
        }
        
        // Check for Dev Fixing tab
        if (tabLabels[selectedTab].label === 'Dev Fixing') {
            if (card.listName === 'Fix done from dev') {
                return {
                    label: "Done",
                    color: "success"
                };
            }
            return {
                label: "Pending",
                color: "warning"
            };
        }
        
        // Check for New Issues list
        if (card.listName && card.listName.trim() === "New Issues") {
            return {
                label: "Waiting",
                color: "info"
            };
        }
        
        return {
            label: "In Progress",
            color: "primary"
        };
    };

    const handleTaskClick = (card) => {
        setSelectedCard(card.id);
    };

    const handlePieChartClick = (entry) => {
        if (entry && entry.name) {
            const member = tsMembers.find(m => m.fullName === entry.name);
            if (member) {
                updateTabFilter('tsMember', member.id);
            }
        }
    };

    const handleBarChartClick = (entry) => {
        if (entry && entry.name) {
            const member = tsMembers.find(m => m.fullName === entry.name);
            if (member) {
                updateTabFilter('tsMember', member.id);
            }
        }
    };

    const filteredCards = useMemo(() => {
        return cards
            .filter(card => {
                let pass = true;
                const filters = currentFilters;

                // Filter by TS member if selected
                if (filters.tsMember) {
                    pass = card.idMembers.some(id => id === filters.tsMember);
                }

                // Filter by status if selected
                if (filters.status) {
                    const status = getCardStatus(card);
                    // Special handling for Dev Fixing tab
                    if (tabLabels[selectedTab].label === 'Dev Fixing') {
                        pass = pass && status.label.toLowerCase() === filters.status;
                    } else {
                        pass = pass && status.label.toLowerCase().replace(' ', '_') === filters.status;
                    }
                }

                if (filters.type === 'app') {
                    pass = pass && getAppLabel(card.labels || []) === filters.value;
                } else if (filters.type === 'member') {
                    pass = pass && card.idMembers.some(id => {
                        const member = members.find(m => m.id === id);
                        return member?.name === filters.value;
                    });
                } else if (filters.type === 'overdue') {
                    const days = getOverdueDays(card.due);
                    pass = pass && !!days;
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
    }, [cards, currentFilters, sortByDueAsc, selectedTab]);

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
            value,
            color: TS_MEMBER_COLORS[tsMembers.find(m => m.fullName === name)?.id] || COLORS[0]
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
            }), {}),
            color: TS_MEMBER_COLORS[tsMembers.find(m => m.fullName === name)?.id] || COLORS[0]
        }));

        return {
            pieData,
            barData,
            uniqueLists
        };
    }, [cards, tsMembers]);

    // Function to check for updates
    const checkForUpdates = useCallback(async () => {
        try {
            const currentTab = tabLabels[selectedTab];
            const tabLists = listsId.filter(list => 
                currentTab.listNames.includes(list.name)
            );

            const fetchPromises = tabLists.map(list => 
                getCardsByList(list.id).then(cardsInList => 
                    cardsInList.map(card => ({
                        ...card,
                        listName: list.name,
                        listId: list.id
                    }))
                )
            );

            const results = await Promise.all(fetchPromises);
            const newCards = results.flat();

            // Check if there are any changes
            const hasChanges = JSON.stringify(newCards) !== JSON.stringify(cards);
            
            if (hasChanges) {
                setCards(newCards);
                setLastUpdateTime(Date.now());
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }, [cards, selectedTab]);

    // Set up polling
    useEffect(() => {
        const interval = setInterval(checkForUpdates, 5000); // Check every 5 seconds
        
        return () => clearInterval(interval);
    }, [checkForUpdates]);


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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                    </Typography>
                    <Button 
                        variant="outlined" 
                        onClick={() => handleTabChange(null, selectedTab)} 
                        sx={{ 
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
                    {currentFilters.type && (
                        <Button 
                            variant="contained" 
                            onClick={() => updateTabFilter('type', null)}
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
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {tab.label}
                                    <Chip 
                                        label={cards.filter(card => 
                                            tab.listNames.includes(card.listName)
                                        ).length}
                                        size="small"
                                        sx={{ 
                                            height: '20px',
                                            '& .MuiChip-label': {
                                                px: 1,
                                                fontSize: '0.75rem'
                                            }
                                        }}
                                    />
                                </Box>
                            }
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
                {/* TS Member Filter */}
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel id="ts-member-label">🎯 TS Member</InputLabel>
                        <Select
                            labelId="ts-member-label"
                            value={currentFilters.tsMember}
                            onChange={(e) => updateTabFilter('tsMember', e.target.value)}
                            label="🎯 TS Member"
                            sx={{
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>All TS Members</em>
                            </MenuItem>
                            {tsMembers.map((member) => (
                                <MenuItem key={member.id} value={member.id}>
                                    {member.fullName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Status Filter */}
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel id="status-label">📊 Status</InputLabel>
                        <Select
                            labelId="status-label"
                            value={currentFilters.status}
                            onChange={(e) => updateTabFilter('status', e.target.value)}
                            label="📊 Status"
                            sx={{
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>All Statuses</em>
                            </MenuItem>
                            {statusOptions.map((status) => (
                                <MenuItem key={status.value} value={status.value}>
                                    {status.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {/* Active Filters Display */}
            {(currentFilters.tsMember || currentFilters.status || currentFilters.type) && (
                <Box sx={{ mb: 2 }}>
                    {currentFilters.tsMember && (
                        <Chip
                            label={`TS Member: ${tsMembers.find(m => m.id === currentFilters.tsMember)?.fullName}`}
                            onDelete={() => updateTabFilter('tsMember', '')}
                            color="primary"
                            variant="outlined"
                            sx={{
                                m: 0.5,
                                borderRadius: 2,
                                '& .MuiChip-deleteIcon': {
                                    color: 'primary.main',
                                    '&:hover': {
                                        color: 'error.main',
                                    }
                                }
                            }}
                        />
                    )}
                    {currentFilters.status && (
                        <Chip
                            label={`Status: ${statusOptions.find(s => s.value === currentFilters.status)?.label}`}
                            onDelete={() => updateTabFilter('status', '')}
                            color="primary"
                            variant="outlined"
                            sx={{
                                m: 0.5,
                                borderRadius: 2,
                                '& .MuiChip-deleteIcon': {
                                    color: 'primary.main',
                                    '&:hover': {
                                        color: 'error.main',
                                    }
                                }
                            }}
                        />
                    )}
                    {currentFilters.type && (
                        <Chip
                            label={`Filtered by ${currentFilters.type === 'app' ? 'App' : 'Member'}: ${currentFilters.value}`}
                            onDelete={() => updateTabFilter('type', null)}
                            color="primary"
                            variant="outlined"
                            sx={{
                                m: 0.5,
                                borderRadius: 2,
                                '& .MuiChip-deleteIcon': {
                                    color: 'primary.main',
                                    '&:hover': {
                                        color: 'error.main',
                                    }
                                }
                            }}
                        />
                    )}
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
                                    onClick={handlePieChartClick}
                                >
                                    {chartsData.pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color}
                                            style={{ cursor: 'pointer' }}
                                        />
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
                            <BarChart 
                                data={chartsData.barData}
                                onClick={handleBarChartClick}
                            >
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
                                    style={{ cursor: 'pointer' }}
                                />
                                <Bar 
                                    dataKey="Done Issues" 
                                    fill="#82ca9d"
                                    name="Done Issues"
                                    style={{ cursor: 'pointer' }}
                                />
                                {chartsData.uniqueLists.map((list, index) => (
                                    <Bar 
                                        key={list} 
                                        dataKey={list} 
                                        stackId="a" 
                                        fill={chartsData.barData[index]?.color || COLORS[index % COLORS.length]}
                                        style={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Table */}
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
                            const dueColor = getOverdueColor(getOverdueDays(card.due), card.dueComplete);
                            const status = getCardStatus(card);

                            return (
                                <TableRow 
                                    key={card.id} 
                                    hover 
                                    onClick={() => handleTaskClick(card)}
                                    sx={{ 
                                        backgroundColor: getOverdueColor(getOverdueDays(card.due), card.dueComplete),
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            transform: 'scale(1.01)',
                                            backgroundColor: alpha(getOverdueColor(getOverdueDays(card.due), card.dueComplete), 0.8),
                                            '& .MuiTableCell-root': {
                                                color: getTextColor(getOverdueColor(getOverdueDays(card.due), card.dueComplete)),
                                                fontWeight: 600,
                                            },
                                            '& .MuiChip-root': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                                color: getTextColor(getOverdueColor(getOverdueDays(card.due), card.dueComplete)),
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.3),
                                                }
                                            }
                                        },
                                        '& .MuiTableCell-root': {
                                            color: getTextColor(getOverdueColor(getOverdueDays(card.due), card.dueComplete)),
                                            fontWeight: 500,
                                        },
                                        '& .MuiChip-root': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            color: getTextColor(getOverdueColor(getOverdueDays(card.due), card.dueComplete)),
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                            }
                                        }
                                    }}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                color: 'inherit',
                                                textDecoration: 'none',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {card.name}
                                        </Box>
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
                                            label={status.label}
                                            size="small"
                                            color={status.color}
                                            sx={{
                                                fontWeight: 500,
                                                minWidth: '100px',
                                                backgroundColor: status.color === 'success' ? '#4CAF50' :
                                                               status.color === 'warning' ? '#FFA000' :
                                                               status.color === 'info' ? '#2196F3' :
                                                               status.color === 'primary' ? '#3F51B5' : '',
                                                color: '#FFFFFF',
                                                '&:hover': {
                                                    backgroundColor: status.color === 'success' ? '#388E3C' :
                                                                   status.color === 'warning' ? '#F57C00' :
                                                                   status.color === 'info' ? '#1976D2' :
                                                                   status.color === 'primary' ? '#303F9F' : '',
                                                }
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
                cardId={selectedCard}
            />
        </Box>
    );
};

export default TSLeadSummary;