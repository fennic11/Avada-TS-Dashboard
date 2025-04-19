import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Grid, Button, Box, Chip,
    FormControl, InputLabel, Select, MenuItem,
    useTheme, alpha, Tabs, Tab, CircularProgress, Backdrop, Avatar, Alert, Divider
} from '@mui/material';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { getCardsByList, getActionsByCard } from '../../api/trelloApi';
import members from '../../data/members.json';
import listsId from '../../data/listsId.json';
import CardDetailModal from '../CardDetailModal';
import { parseISO, differenceInDays } from 'date-fns';
import { calculateResolutionTime } from '../../utils/resolutionTime';
import { useSnackbar } from 'notistack';

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
    const { enqueueSnackbar } = useSnackbar();
    const [cards, setCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [sortByDueAsc, setSortByDueAsc] = useState(true);
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
    const [calculatingMember, setCalculatingMember] = useState(null);
    const [memberResults, setMemberResults] = useState({});
    const [notifiedMembers, setNotifiedMembers] = useState(new Set());

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
            const tabLists = listsId.filter(list => 
                tabLabels[tabIndex].listNames.includes(list.name)
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
            let tabCards = results.flat();
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
        return members.filter(member => member.role === 'TS' || member.role === 'ts-lead');
    }, []);

    const getAppLabel = (labels) => {
        const appLabel = labels.find(label => label.name?.startsWith('App:'));
        return appLabel ? appLabel.name.replace('App:', '').trim() : 'Unknown';
    };

    const getAppColor = (appName) => {
        const colors = [
            '#2563eb', // Blue
            '#16a34a', // Green
            '#dc2626', // Red
            '#9333ea', // Purple
            '#ea580c', // Orange
            '#0891b2', // Cyan
            '#4f46e5', // Indigo
            '#db2777', // Pink
            '#059669', // Emerald
            '#7c3aed', // Violet
            '#ca8a04', // Yellow
            '#be123c', // Rose
            '#0d9488', // Teal
        ];
        
        // Get a consistent index for the same string
        let hash = 0;
        for (let i = 0; i < appName.length; i++) {
            hash = appName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
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
                color: "#4CAF50" // Green color for Done
            };
        }
        
        // Check for Dev Fixing tab
        if (tabLabels[selectedTab].label === 'Dev Fixing') {
            if (card.listName === 'Fix done from dev') {
                return {
                    label: "Done",
                    color: "#4CAF50" // Green color for Done
                };
            }
            return {
                label: "Pending",
                color: "#FF9800" // Orange color for Pending
            };
        }
        
        // Check for New Issues list
        if (card.listName && card.listName.trim() === "New Issues") {
            return {
                label: "Waiting",
                color: "#F44336" // Red color for Waiting
            };
        }
        
        return {
            label: "In Progress",
            color: "#2196F3" // Blue color for In Progress
        };
    };

    const handleTaskClick = (card) => {
        setSelectedCard(card.id);
    };

    const handlePieChartClick = (entry) => {
        if (entry && entry.name) {
            const member = tsMembers.find(m => m.username === entry.name);
            if (member) {
                updateTabFilter('tsMember', member.id);
            }
        }
    };

    const handleBarChartClick = (entry) => {
        if (entry && entry.name) {
            const member = tsMembers.find(m => m.username === entry.name);
            if (member) {
                updateTabFilter('tsMember', member.id);
            }
        }
    };

    const handleAppPieChartClick = (entry) => {
        if (entry && entry.name) {
            const currentAppFilter = currentFilters.app;
            // If clicking the same app again, clear the filter
            if (currentAppFilter === entry.name) {
                updateTabFilter('app', '');
            } else {
                updateTabFilter('app', entry.name);
            }
        }
    };

    const handleStatusBarChartClick = (entry) => {
        if (entry && entry.name) {
            updateTabFilter('status', entry.name.toLowerCase().replace(' ', '_'));
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

                // Filter by app if selected
                if (filters.app) {
                    const appLabel = card.labels?.find(label => label.name?.startsWith('App:'))?.name?.replace('App:', '').trim() || 'Unknown';
                    pass = pass && appLabel === filters.app;
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
        const memberStats = {};
        const appStats = {};
        const uniqueApps = new Set();

        // First pass to collect unique apps
        cards.forEach(card => {
            const appLabel = card.labels?.find(label => label.name?.startsWith('App:'))?.name?.replace('App:', '').trim() || 'Unknown';
            uniqueApps.add(appLabel);
        });

        // Create color mapping for apps
        const appColorMap = {};
        Array.from(uniqueApps).forEach((app, index) => {
            appColorMap[app] = COLORS[index % COLORS.length];
        });

        cards.forEach(card => {
            // Count cards per app
            const appLabel = card.labels?.find(label => label.name?.startsWith('App:'))?.name?.replace('App:', '').trim() || 'Unknown';
            if (!appStats[appLabel]) {
                appStats[appLabel] = {
                    name: appLabel,
                    value: 0,
                    color: appColorMap[appLabel]
                };
            }
            appStats[appLabel].value++;

            card.idMembers.forEach(memberId => {
                const member = tsMembers.find(m => m.id === memberId);
                if (!member) return; // Skip if not a TS member

                // Initialize member stats if not exists
                if (!memberStats[member.username]) {
                    memberStats[member.username] = {
                        name: member.username,
                        'Total Issues': 0,
                        'Done': 0,
                        'Doing': 0,
                        'Wait': 0,
                        color: TS_MEMBER_COLORS[member.id] || COLORS[0]
                    };
                }

                // Update total cards
                memberStats[member.username]['Total Issues']++;

                // Update status counts
                if (card.dueComplete) {
                    memberStats[member.username]['Done']++;
                } else if (card.listName === "Doing (Inshift)") {
                    memberStats[member.username]['Doing']++;
                } else if (card.listName === "New Issues") {
                    memberStats[member.username]['Wait']++;
                }
            });
        });

        // Format data for pie charts
        const pieData = Object.values(memberStats).map(stats => ({
            name: stats.name,
            value: stats['Total Issues'],
            color: stats.color
        }));

        const appPieData = Object.values(appStats).sort((a, b) => b.value - a.value);

        // Format data for bar chart - use memberStats directly
        const barData = Object.values(memberStats);

        return {
            pieData,
            barData,
            appPieData
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

    const calculateMemberResolutionTime = async (memberId) => {
        setCalculatingMember(memberId);
        
        const memberCards = cards.filter(card => 
            card.idMembers.includes(memberId) && card.dueComplete
        );
        
        if (memberCards.length === 0) {
            setMemberResults(prev => ({
                ...prev,
                [memberId]: { error: 'No completed cards found' }
            }));
            setCalculatingMember(null);
            return;
        }

        try {
            const results = [];
            let totalResolutionTime = 0;
            let totalTSResolutionTime = 0;
            let totalFirstActionTime = 0;
            let validResultsCount = 0;
            
            for (const card of memberCards) {
                const actions = await getActionsByCard(card.id);
                const timing = calculateResolutionTime(actions);
                
                if (timing) {
                    validResultsCount++;
                    totalResolutionTime += timing.resolutionTime || 0;
                    totalTSResolutionTime += timing.TSResolutionTime || 0;
                    totalFirstActionTime += timing.firstActionTime || 0;
                    
                    results.push({
                        cardName: card.name,
                        resolutionTime: timing.resolutionTime || 0,
                        tsResolutionTime: timing.TSResolutionTime || 0,
                        firstActionTime: timing.firstActionTime || 0,
                        isOverTime: (timing.resolutionTime || 0) > 120
                    });
                }
            }
            
            const averageResolutionTime = validResultsCount > 0 ? Math.round(totalResolutionTime / validResultsCount) : 0;
            const averageTSResolutionTime = validResultsCount > 0 ? Math.round(totalTSResolutionTime / validResultsCount) : 0;
            const averageFirstActionTime = validResultsCount > 0 ? Math.round(totalFirstActionTime / validResultsCount) : 0;
            
            setMemberResults(prev => ({
                ...prev,
                [memberId]: { 
                    results,
                    averageResolutionTime,
                    averageTSResolutionTime,
                    averageFirstActionTime,
                    isAverageOverTime: averageResolutionTime > 120
                }
            }));
        } catch (error) {
            console.error('Error calculating resolution time:', error);
            setMemberResults(prev => ({
                ...prev,
                [memberId]: { error: 'Error calculating resolution time' }
            }));
        } finally {
            setCalculatingMember(null);
        }
    };

    // Check for high waiting ratio
    useEffect(() => {
        const checkHighWaitingRatio = () => {
            tsMembers.forEach(member => {
                const memberCards = cards.filter(card => card.idMembers.includes(member.id));
                const totalCards = memberCards.length;
                const waitingCards = memberCards.filter(card => 
                    card.listName === "New Issues" && !card.dueComplete
                ).length;
                
                const waitingRatio = totalCards > 0 ? waitingCards / totalCards : 0;
                console.log('=== TS Member Stats ===');
                console.log('Member:', member.username);
                console.log('Total Cards:', totalCards);
                console.log('Waiting Cards:', waitingCards);
                console.log('Waiting Ratio:', waitingRatio);
                console.log('=====================');

                if (totalCards > 0 && waitingRatio > 0.4 && !notifiedMembers.has(member.id)) {
                    enqueueSnackbar(`${member.username} has high waiting ratio: ${Math.round(waitingRatio * 100)}%`, {
                        variant: 'warning',
                        anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'right',
                        },
                        autoHideDuration: 6000,
                        preventDuplicate: true,
                        style: {
                            marginTop: '60px',
                        },
                        action: (key) => (
                            <Button 
                                onClick={() => {
                                    setNotifiedMembers(prev => {
                                        const newSet = new Set(prev);
                                        newSet.add(member.id);
                                        return newSet;
                                    });
                                }}
                                color="inherit"
                                size="small"
                            >
                                Dismiss
                            </Button>
                        ),
                    });
                }
            });
        };

        checkHighWaitingRatio();
    }, [cards, tsMembers, enqueueSnackbar, notifiedMembers]);

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
                    TS Lead Workspace
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
                        <InputLabel id="ts-member-label">TS Member</InputLabel>
                        <Select
                            labelId="ts-member-label"
                            value={currentFilters.tsMember}
                            onChange={(e) => updateTabFilter('tsMember', e.target.value)}
                            label="TS Member"
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
                                    {member.username}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Status Filter */}
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel id="status-label">Status</InputLabel>
                        <Select
                            labelId="status-label"
                            value={currentFilters.status}
                            onChange={(e) => updateTabFilter('status', e.target.value)}
                            label="Status"
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
            {(currentFilters.tsMember || currentFilters.status || currentFilters.app) && (
                <Box sx={{ mb: 2 }}>
                    {currentFilters.tsMember && (
                        <Chip
                            label={`TS Member: ${tsMembers.find(m => m.id === currentFilters.tsMember)?.username}`}
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
                    {currentFilters.app && (
                        <Chip
                            label={`App: ${currentFilters.app}`}
                            onDelete={() => updateTabFilter('app', '')}
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
                {/* Member Distribution Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '400px'
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Cards by TS Member
                        </Typography>
                        <Divider />
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
                                    outerRadius={80}
                                    fill="#8884d8"
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    onClick={handlePieChartClick}
                                >
                                    {chartsData.pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color}
                                            style={{ 
                                                cursor: 'pointer',
                                                filter: currentFilters.tsMember === entry.name ? 'brightness(1.2)' : 'none'
                                            }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* App Distribution Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '400px'
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Cards by App
                        </Typography>
                        <Divider />
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Legend 
                                    verticalAlign="top" 
                                    align="center"
                                    height={36}
                                />
                                <Pie
                                    data={chartsData.appPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    label={(entry) => `${entry.value}`}
                                    onClick={handleAppPieChartClick}
                                >
                                    {chartsData.appPieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${entry.name}`} 
                                            fill={entry.color}
                                            style={{ 
                                                cursor: 'pointer',
                                                filter: currentFilters.app === entry.name ? 'brightness(1.2)' : 'none'
                                            }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Member Status Bar Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '400px'
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Cards by Status
                        </Typography>
                        <Divider />
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={chartsData.barData}
                                onClick={handleStatusBarChartClick}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 70
                                }}
                            >
                                <Legend 
                                    verticalAlign="top" 
                                    align="center"
                                    height={36}
                                />
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="name" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={80}
                                    interval={0}
                                    tick={{
                                        fontSize: 12,
                                        dx: -8,
                                        dy: 8
                                    }}
                                />
                                <YAxis />
                                <Tooltip />
                                <Bar 
                                    dataKey="Total Issues" 
                                    fill="#9575cd"
                                    name="Total Issues"
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.primary,
                                        fontSize: 12
                                    }}
                                />
                                <Bar 
                                    dataKey="Done" 
                                    fill="#4caf50"
                                    name="Done"
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.primary,
                                        fontSize: 12
                                    }}
                                />
                                <Bar 
                                    dataKey="Doing" 
                                    fill="#2196f3"
                                    name="Doing"
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.primary,
                                        fontSize: 12
                                    }}
                                />
                                <Bar 
                                    dataKey="Wait" 
                                    fill="#f44336"
                                    name="Wait"
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.primary,
                                        fontSize: 12
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Resolution Time Statistics */}
            {selectedTab === 0 && (
                <Paper sx={{ 
                    p: 2, 
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    background: 'white'
                }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: 'primary.main',
                        fontSize: '1rem',
                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        pb: 1
                    }}>
                        📊 Resolution Time Statistics
                    </Typography>
                    <Grid container spacing={1} sx={{ px: 1 }}>
                        {tsMembers
                            .filter(member => cards.some(card => card.idMembers.includes(member.id)))
                            .map(member => {
                                const memberCards = cards.filter(card => card.idMembers.includes(member.id));
                                const totalCards = memberCards.length;
                                const completedCards = memberCards.filter(card => card.dueComplete).length;
                                const doingCards = memberCards.filter(card => 
                                    card.listName === "Doing (Inshift)" && !card.dueComplete
                                ).length;
                                const waitingCards = memberCards.filter(card => 
                                    card.listName === "New Issues" && !card.dueComplete
                                ).length;

                                return (
                                    <Grid item xs={12} sm={6} md={3} key={member.id}>
                                        <Paper sx={{ 
                                            p: 1.5,
                                            pt: 4,
                                            borderRadius: 2,
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                            background: alpha(theme.palette.primary.main, 0.02),
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            '&:hover': {
                                                background: alpha(theme.palette.primary.main, 0.05),
                                                transform: 'translateY(-2px)',
                                                transition: 'all 0.2s ease'
                                            }
                                        }}>
                                            {/* Warning for high waiting ratio */}
                                            {(() => {
                                                const waitingRatio = totalCards > 0 ? waitingCards / totalCards : 0;
                                                if (totalCards > 0 && waitingRatio > 0.4) {
                                                    return (
                                                        <Alert 
                                                            severity="warning" 
                                                            sx={{ 
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                borderRadius: '8px 8px 0 0',
                                                                zIndex: 1,
                                                                py: 0.5,
                                                                '& .MuiAlert-icon': {
                                                                    fontSize: '1rem'
                                                                },
                                                                '& .MuiAlert-message': {
                                                                    fontSize: '0.75rem',
                                                                    py: 0
                                                                }
                                                            }}
                                                        >
                                                            High waiting ratio: {Math.round(waitingRatio * 100)}%
                                                        </Alert>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Header with Avatar and Name */}
                                            <Box sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 1, 
                                                mb: 1.5,
                                                pb: 1,
                                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                            }}>
                                                <Avatar
                                                    src={member.avatarUrl}
                                                    alt={member.username}
                                                    sx={{ 
                                                        width: 32, 
                                                        height: 32,
                                                        bgcolor: TS_MEMBER_COLORS[member.id] || 'primary.main',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {member.initials}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle1" sx={{ 
                                                        fontWeight: 600,
                                                        color: 'primary.main',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {member.username}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                        {member.role}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Card Statistics */}
                                            <Box sx={{ 
                                                display: 'flex', 
                                                gap: 0.5, 
                                                mb: 1.5,
                                                flexWrap: 'wrap'
                                            }}>
                                                <Paper sx={{ 
                                                    p: 0.5, 
                                                    flex: '1 1 auto',
                                                    minWidth: '60px',
                                                    textAlign: 'center',
                                                    background: alpha(theme.palette.background.default, 0.6)
                                                }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                        {totalCards}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                        Total
                                                    </Typography>
                                                </Paper>
                                                <Paper sx={{ 
                                                    p: 0.5, 
                                                    flex: '1 1 auto',
                                                    minWidth: '60px',
                                                    textAlign: 'center',
                                                    background: alpha(theme.palette.success.main, 0.1)
                                                }}>
                                                    <Typography variant="h6" sx={{ 
                                                        fontWeight: 600,
                                                        color: 'success.main',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        {completedCards}
                                                    </Typography>
                                                    <Typography variant="caption" color="success.main" sx={{ fontSize: '0.65rem' }}>
                                                        Done
                                                    </Typography>
                                                </Paper>
                                                <Paper sx={{ 
                                                    p: 0.5, 
                                                    flex: '1 1 auto',
                                                    minWidth: '60px',
                                                    textAlign: 'center',
                                                    background: alpha(theme.palette.primary.main, 0.1)
                                                }}>
                                                    <Typography variant="h6" sx={{ 
                                                        fontWeight: 600,
                                                        color: 'primary.main',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        {doingCards}
                                                    </Typography>
                                                    <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.65rem' }}>
                                                        Doing
                                                    </Typography>
                                                </Paper>
                                                <Paper sx={{ 
                                                    p: 0.5, 
                                                    flex: '1 1 auto',
                                                    minWidth: '60px',
                                                    textAlign: 'center',
                                                    background: alpha(theme.palette.info.main, 0.1)
                                                }}>
                                                    <Typography variant="h6" sx={{ 
                                                        fontWeight: 600,
                                                        color: 'info.main',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        {waitingCards}
                                                    </Typography>
                                                    <Typography variant="caption" color="info.main" sx={{ fontSize: '0.65rem' }}>
                                                        Wait
                                                    </Typography>
                                                </Paper>
                                            </Box>

                                            {/* Resolution Time Section */}
                                            <Box sx={{ mt: 'auto' }}>
                                                {!memberResults[member.id] ? (
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        fullWidth
                                                        onClick={() => calculateMemberResolutionTime(member.id)}
                                                        disabled={calculatingMember === member.id}
                                                        sx={{ 
                                                            py: 0.5,
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        {calculatingMember === member.id ? 'Calculating...' : 'Calculate Resolution Time'}
                                                    </Button>
                                                ) : memberResults[member.id].error ? (
                                                    <Box sx={{ mt: 1 }}>
                                                        <Typography color="error" variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                            {memberResults[member.id].error}
                                                        </Typography>
                                                        <Button
                                                            size="small"
                                                            onClick={() => {
                                                                setMemberResults(prev => {
                                                                    const newResults = {...prev};
                                                                    delete newResults[member.id];
                                                                    return newResults;
                                                                });
                                                            }}
                                                            sx={{ mt: 0.5, fontSize: '0.7rem' }}
                                                        >
                                                            Try Again
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ mt: 1 }}>
                                                        <Grid container spacing={0.5}>
                                                            <Grid item xs={4}>
                                                                <Paper sx={{ 
                                                                    p: 0.5, 
                                                                    textAlign: 'center',
                                                                    background: alpha(theme.palette.background.paper, 0.8)
                                                                }}>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                                        Total Time
                                                                    </Typography>
                                                                    <Typography variant="body1" sx={{ 
                                                                        fontWeight: 600,
                                                                        color: memberResults[member.id].averageResolutionTime > 120 ? 'error.main' : 'success.main',
                                                                        fontSize: '0.8rem'
                                                                    }}>
                                                                        {Math.floor(memberResults[member.id].averageResolutionTime / 60)}h {memberResults[member.id].averageResolutionTime % 60}m
                                                                    </Typography>
                                                                </Paper>
                                                            </Grid>
                                                            <Grid item xs={4}>
                                                                <Paper sx={{ 
                                                                    p: 0.5, 
                                                                    textAlign: 'center',
                                                                    background: alpha(theme.palette.background.paper, 0.8)
                                                                }}>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                                        TS Time
                                                                    </Typography>
                                                                    <Typography variant="body1" sx={{ 
                                                                        fontWeight: 600,
                                                                        color: memberResults[member.id].averageTSResolutionTime > 120 ? 'error.main' : 'success.main',
                                                                        fontSize: '0.8rem'
                                                                    }}>
                                                                        {Math.floor(memberResults[member.id].averageTSResolutionTime / 60)}h {memberResults[member.id].averageTSResolutionTime % 60}m
                                                                    </Typography>
                                                                </Paper>
                                                            </Grid>
                                                            <Grid item xs={4}>
                                                                <Paper sx={{ 
                                                                    p: 0.5, 
                                                                    textAlign: 'center',
                                                                    background: alpha(theme.palette.background.paper, 0.8)
                                                                }}>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                                        First Action
                                                                    </Typography>
                                                                    <Typography variant="body1" sx={{ 
                                                                        fontWeight: 600,
                                                                        color: memberResults[member.id].averageFirstActionTime > 30 ? 'error.main' : 'success.main',
                                                                        fontSize: '0.8rem'
                                                                    }}>
                                                                        {Math.floor(memberResults[member.id].averageFirstActionTime / 60)}h {memberResults[member.id].averageFirstActionTime % 60}m
                                                                    </Typography>
                                                                </Paper>
                                                            </Grid>
                                                        </Grid>

                                                        <Button
                                                            size="small"
                                                            fullWidth
                                                            variant="text"
                                                            onClick={() => {
                                                                setMemberResults(prev => {
                                                                    const newResults = {...prev};
                                                                    delete newResults[member.id];
                                                                    return newResults;
                                                                });
                                                            }}
                                                            sx={{ 
                                                                mt: 0.5, 
                                                                fontSize: '0.7rem',
                                                                py: 0.5
                                                            }}
                                                        >
                                                            Calculate Again
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                    </Grid>
                </Paper>
            )}

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
                            const status = getCardStatus(card);

                            return (
                                <TableRow 
                                    key={card.id} 
                                    hover 
                                    onClick={() => handleTaskClick(card)}
                                    sx={{ 
                                        backgroundColor: '#FFFFFF',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: alpha('#000', 0.02),
                                        },
                                        '& .MuiTableCell-root': {
                                            color: theme.palette.text.primary,
                                            fontWeight: 500,
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
                                                maxWidth: '250px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {card.name}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexWrap: 'nowrap', 
                                            gap: 0.5,
                                            maxWidth: '300px',
                                            overflowX: 'auto',
                                            '&::-webkit-scrollbar': {
                                                height: '4px'
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: '#f1f1f1',
                                                borderRadius: '2px'
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                background: '#888',
                                                borderRadius: '2px',
                                                '&:hover': {
                                                    background: '#555'
                                                }
                                            }
                                        }}>
                                            {card.idMembers.map(id => {
                                                const member = members.find(m => m.id === id);
                                                if (!member) return null;
                                                return (
                                                    <Chip
                                                        key={id}
                                                        label={member.username}
                                                        size="small"
                                                        sx={{
                                                            height: '20px',
                                                            fontSize: '0.7rem',
                                                            '& .MuiChip-label': {
                                                                px: 1,
                                                            },
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                            color: 'primary.main',
                                                            fontWeight: 500,
                                                            whiteSpace: 'nowrap',
                                                            flex: '0 0 auto',
                                                            '&:hover': {
                                                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getAppLabel(card.labels || [])}
                                            size="small"
                                            sx={{
                                                backgroundColor: alpha(getAppColor(getAppLabel(card.labels || [])), 0.1),
                                                color: getAppColor(getAppLabel(card.labels || [])),
                                                fontWeight: 500,
                                                '&:hover': {
                                                    backgroundColor: alpha(getAppColor(getAppLabel(card.labels || [])), 0.2),
                                                }
                                            }}
                                        />
                                    </TableCell>
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
                                            size="medium"
                                            sx={{
                                                fontWeight: 500,
                                                px: 2,
                                                backgroundColor: (() => {
                                                    switch (status.label) {
                                                        case 'Done':
                                                            return alpha('#4CAF50', 0.1);
                                                        case 'In Progress':
                                                            return alpha('#2196F3', 0.1);
                                                        case 'Waiting':
                                                            return alpha('#F44336', 0.1);
                                                        default:
                                                            return alpha('#F5F5F5', 1);
                                                    }
                                                })(),
                                                color: (() => {
                                                    switch (status.label) {
                                                        case 'Done':
                                                            return '#4CAF50';
                                                        case 'In Progress':
                                                            return '#2196F3';
                                                        case 'Waiting':
                                                            return '#F44336';
                                                        default:
                                                            return '#666666';
                                                    }
                                                })(),
                                                borderRadius: '16px',
                                                '&:hover': {
                                                    backgroundColor: (() => {
                                                        switch (status.label) {
                                                            case 'Done':
                                                                return alpha('#4CAF50', 0.2);
                                                            case 'In Progress':
                                                                return alpha('#2196F3', 0.2);
                                                            case 'Waiting':
                                                                return alpha('#F44336', 0.2);
                                                            default:
                                                                return alpha('#F5F5F5', 0.8);
                                                        }
                                                    })()
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