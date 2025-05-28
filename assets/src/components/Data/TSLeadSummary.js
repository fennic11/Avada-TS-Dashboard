import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Grid, Button, Box, Chip,
    FormControl, InputLabel, Select, MenuItem,
    useTheme, alpha, Tabs, Tab, CircularProgress, Backdrop, Avatar, Alert, Divider,
    TextField
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
import WarningIcon from '@mui/icons-material/Warning';
import TimerIcon from '@mui/icons-material/Timer';

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
    const [cardUrl, setCardUrl] = useState('');
    const [sortByDueAsc, setSortByDueAsc] = useState(true);
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
    const [calculatingMember, setCalculatingMember] = useState(null);
    const [memberResults, setMemberResults] = useState({});
    const [uniqueApps, setUniqueApps] = useState([]);
    const [filterType, setFilterType] = useState('all'); // 'all', 'cs', 'ts'

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

    // Get TS members with active cards
    const activeTSMembers = useMemo(() => {
        const activeMembers = new Set();
        cards.forEach(card => {
            card.idMembers.forEach(id => {
                const member = members.find(m => m.id === id);
                if (member && (member.role === 'TS' || member.role === 'ts-lead')) {
                    activeMembers.add(id);
                }
            });
        });
        return activeMembers;
    }, [cards, members]);

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

                // Filter by member type (CS/TS)
                if (filterType !== 'all') {
                    const hasTSMember = card.idMembers.some(id => {
                        const member = members.find(m => m.id === id);
                        return member && (member.role === 'TS' || member.role === 'ts-lead');
                    });
                    pass = filterType === 'ts' ? hasTSMember : !hasTSMember;
                }

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
    }, [cards, currentFilters, sortByDueAsc, selectedTab, filterType]);

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

    const handleCardUrlSubmit = (e) => {
        e.preventDefault();
        try {
            // Extract card ID from Trello URL
            const cardId = cardUrl.split('/').pop();
            if (cardId) {
                setSelectedCard(cardId);
                setCardUrl('');
            } else {
                console.error('Invalid card URL');
            }
        } catch (error) {
            console.error('Error parsing card URL:', error);
        }
    };

    // Update useEffect to collect unique apps
    useEffect(() => {
        const apps = new Set();
        cards.forEach(card => {
            const appLabel = card.labels?.find(label => label.name?.startsWith('App:'))?.name?.replace('App:', '').trim() || 'Unknown';
            apps.add(appLabel);
        });
        setUniqueApps(Array.from(apps).sort());
    }, [cards]);

    return (
        <Box sx={{ 
            width: '100%', 
            p: 4, 
            maxWidth: '1800px', 
            margin: '0 auto',
            minHeight: '100vh',
            background: alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes fadeIn': {
                from: {
                    opacity: 0,
                    transform: 'translateY(20px)',
                    filter: 'blur(10px)'
                },
                to: {
                    opacity: 1,
                    transform: 'translateY(0)',
                    filter: 'blur(0)'
                }
            }
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
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                }
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

            <Paper sx={{ 
                mb: 3, 
                borderRadius: 2, 
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    minWidth: 'auto',
                    px: 3,
                    py: 1.5,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'visible',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: 3,
                        backgroundColor: 'primary.main',
                        transform: 'scaleX(0)',
                        transformOrigin: 'left center',
                        transition: 'transform 0.3s ease'
                    },
                    '&:hover': {
                        backgroundColor: 'transparent',
                        color: 'primary.main',
                        '&::after': {
                            transform: 'scaleX(0.8)'
                        }
                    },
                    '&.Mui-selected': {
                        fontWeight: 600,
                        '&::after': {
                            transform: 'scaleX(1)'
                        }
                    }
                },
                '& .MuiTabs-indicator': {
                    display: 'none'
                }
            }}>
                <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTabs-flexContainer': {
                            gap: 1
                        },
                        '& .MuiTabs-scrollButtons': {
                            '&.Mui-disabled': {
                                opacity: 0.3
                            },
                            '&:hover': {
                                backgroundColor: 'transparent'
                            }
                        }
                    }}
                >
                    {tabLabels.map((tab, index) => (
                        <Tab 
                            key={index} 
                            label={
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    py: 0.5
                                }}>
                                    {tab.label}
                                    <Chip 
                                        label={cards.filter(card => 
                                            tab.listNames.includes(card.listName)
                                        ).length}
                                        size="small"
                                        sx={{ 
                                            height: '20px',
                                            backgroundColor: selectedTab === index ? 
                                                alpha(theme.palette.primary.main, 0.2) : 
                                                alpha(theme.palette.primary.main, 0.1),
                                            color: selectedTab === index ? 
                                                'primary.main' : 
                                                'text.secondary',
                                            transition: 'all 0.2s ease',
                                            '& .MuiChip-label': {
                                                px: 1,
                                                fontSize: '0.75rem',
                                                fontWeight: selectedTab === index ? 600 : 500
                                            }
                                        }}
                                    />
                                </Box>
                            }
                            sx={{
                                opacity: 1,
                                color: selectedTab === index ? 'primary.main' : 'text.primary',
                                '&:not(.Mui-selected):hover': {
                                    opacity: 0.8
                                }
                            }}
                        />
                    ))}
                </Tabs>
            </Paper>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                {/* Member Type Filter */}
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel id="member-type-label"
                            sx={{ 
                                '&.Mui-focused': { 
                                    color: 'primary.main',
                                    fontWeight: 500 
                                } 
                            }}
                        >
                            Member Type
                        </InputLabel>
                        <Select
                            labelId="member-type-label"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            label="Member Type"
                            sx={{
                                height: { xs: '45px', sm: '50px' },
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    fontSize: { xs: '0.875rem', sm: '0.9rem' }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    transition: 'all 0.2s ease'
                                },
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                },
                                '&.Mui-focused': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                }
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        mt: 1,
                                        borderRadius: 2,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        '& .MuiMenuItem-root': {
                                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                            py: 1.5,
                                            px: 2,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.08)
                                            },
                                            '&.Mui-selected': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.15)
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                        >
                            <MenuItem value="all">
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: 'grey.400',
                                    mr: 1 
                                }} />
                                All Members
                            </MenuItem>
                            <MenuItem value="cs">
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: 'info.main',
                                    mr: 1 
                                }} />
                                CS Members
                            </MenuItem>
                            <MenuItem value="ts">
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: 'success.main',
                                    mr: 1 
                                }} />
                                TS Members
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                {/* TS Member Filter */}
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel id="ts-member-label"
                            sx={{ 
                                '&.Mui-focused': { 
                                    color: 'primary.main',
                                    fontWeight: 500 
                                } 
                            }}
                        >
                            TS Member
                        </InputLabel>
                        <Select
                            labelId="ts-member-label"
                            value={currentFilters.tsMember}
                            onChange={(e) => updateTabFilter('tsMember', e.target.value)}
                            label="TS Member"
                            sx={{
                                height: { xs: '45px', sm: '50px' },
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    fontSize: { xs: '0.875rem', sm: '0.9rem' }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    transition: 'all 0.2s ease'
                                },
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                },
                                '&.Mui-focused': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                }
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        mt: 1,
                                        borderRadius: 2,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        maxHeight: { xs: 300, sm: 400 },
                                        '& .MuiMenuItem-root': {
                                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                            py: 1.5,
                                            px: 2,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.08)
                                            },
                                            '&.Mui-selected': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.15)
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                        >
                            <MenuItem value="">
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    color: 'text.secondary',
                                    fontStyle: 'italic'
                                }}>
                                    <Box sx={{ 
                                        width: 24, 
                                        height: 24, 
                                        borderRadius: '50%',
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem'
                                    }}>
                                        All
                                    </Box>
                                    All TS Members
                                </Box>
                            </MenuItem>
                            {tsMembers.map((member) => (
                                <MenuItem 
                                    key={member.id} 
                                    value={member.id}
                                    sx={{
                                        color: activeTSMembers.has(member.id) ? 'success.main' : 'inherit',
                                        fontWeight: activeTSMembers.has(member.id) ? 600 : 400
                                    }}
                                >
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 1,
                                        width: '100%',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 1 
                                        }}>
                                            <Avatar 
                                                src={member.avatarUrl}
                                                alt={member.username}
                                                sx={{ 
                                                    width: 24, 
                                                    height: 24,
                                                    fontSize: '0.75rem',
                                                    bgcolor: TS_MEMBER_COLORS[member.id] || 'primary.main'
                                                }}
                                            >
                                                {member.initials}
                                            </Avatar>
                                            {member.username}
                                        </Box>
                                        {activeTSMembers.has(member.id) && (
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    bgcolor: 'success.main'
                                                }}
                                            />
                                        )}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Status Filter */}
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel id="status-label"
                            sx={{ 
                                '&.Mui-focused': { 
                                    color: 'primary.main',
                                    fontWeight: 500 
                                } 
                            }}
                        >
                            Status
                        </InputLabel>
                        <Select
                            labelId="status-label"
                            value={currentFilters.status}
                            onChange={(e) => updateTabFilter('status', e.target.value)}
                            label="Status"
                            sx={{
                                height: { xs: '45px', sm: '50px' },
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    fontSize: { xs: '0.875rem', sm: '0.9rem' }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    transition: 'all 0.2s ease'
                                },
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                },
                                '&.Mui-focused': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                }
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        mt: 1,
                                        borderRadius: 2,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        '& .MuiMenuItem-root': {
                                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                            py: 1.5,
                                            px: 2,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.08)
                                            },
                                            '&.Mui-selected': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.15)
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                        >
                            <MenuItem value="">
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    color: 'text.secondary',
                                    fontStyle: 'italic'
                                }}>
                                    <Box sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%',
                                        bgcolor: 'grey.400'
                                    }} />
                                    All Statuses
                                </Box>
                            </MenuItem>
                            {statusOptions.map((status) => (
                                <MenuItem key={status.value} value={status.value}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 1 
                                    }}>
                                        <Box sx={{ 
                                            width: 8, 
                                            height: 8, 
                                            borderRadius: '50%',
                                            bgcolor: (() => {
                                                switch (status.value) {
                                                    case 'done': return 'success.main';
                                                    case 'in_progress': return 'primary.main';
                                                    case 'waiting': return 'error.main';
                                                    case 'pending': return 'warning.main';
                                                    default: return 'grey.400';
                                                }
                                            })()
                                        }} />
                                        {status.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* App Filter */}
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel id="app-label"
                            sx={{ 
                                '&.Mui-focused': { 
                                    color: 'primary.main',
                                    fontWeight: 500 
                                } 
                            }}
                        >
                            App
                        </InputLabel>
                        <Select
                            labelId="app-label"
                            value={currentFilters.app || ''}
                            onChange={(e) => updateTabFilter('app', e.target.value)}
                            label="App"
                            sx={{
                                height: { xs: '45px', sm: '50px' },
                                borderRadius: 2,
                                background: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    fontSize: { xs: '0.875rem', sm: '0.9rem' }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)',
                                    transition: 'all 0.2s ease'
                                },
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                },
                                '&.Mui-focused': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '2px'
                                    }
                                }
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        mt: 1,
                                        borderRadius: 2,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        maxHeight: { xs: 300, sm: 400 },
                                        '& .MuiMenuItem-root': {
                                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                            py: 1.5,
                                            px: 2,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.08)
                                            },
                                            '&.Mui-selected': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.15)
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                        >
                            <MenuItem value="">
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    color: 'text.secondary',
                                    fontStyle: 'italic'
                                }}>
                                    <Box sx={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%',
                                        bgcolor: 'grey.400'
                                    }} />
                                    All Apps
                                </Box>
                            </MenuItem>
                            {uniqueApps.map((app) => (
                                <MenuItem key={app} value={app}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 1,
                                        width: '100%',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 1 
                                        }}>
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: getAppColor(app)
                                                }}
                                            />
                                            {app}
                                        </Box>
                                        {currentFilters.app === app && (
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    bgcolor: 'primary.main'
                                                }}
                                            />
                                        )}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Card URL Input */}
                <Grid item xs={12} md={3}>
                    <form onSubmit={handleCardUrlSubmit} style={{ width: '100%' }}>
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1,
                            width: '100%'
                        }}>
                            <TextField
                                fullWidth
                                label="Enter Card URL"
                                value={cardUrl}
                                onChange={(e) => setCardUrl(e.target.value)}
                                placeholder="https://trello.com/c/cardId"
                                size="small"
                                sx={{
                                    flex: 1,
                                    borderRadius: 2,
                                    background: 'white',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        height: { xs: '45px', sm: '50px' },
                                        '& fieldset': {
                                            borderColor: 'rgba(0, 0, 0, 0.12)',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'primary.main',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'primary.main',
                                        }
                                    },
                                    '& .MuiInputLabel-root': {
                                        transform: 'translate(14px, 16px) scale(1)',
                                        '&.Mui-focused, &.MuiFormLabel-filled': {
                                            transform: 'translate(14px, -9px) scale(0.75)'
                                        }
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                sx={{
                                    height: { xs: '45px', sm: '50px' },
                                    minWidth: { xs: '45px', sm: '50px' },
                                    borderRadius: 2,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                    backgroundColor: 'primary.main',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                                    },
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <Box 
                                    component="span" 
                                    sx={{ 
                                        fontSize: '1.5rem',
                                        lineHeight: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    →
                                </Box>
                            </Button>
                        </Box>
                    </form>
                </Grid>
            </Grid>

            {/* Active Filters Display */}
            {(currentFilters.tsMember || currentFilters.status || currentFilters.app || filterType !== 'all') && (
                <Box sx={{ 
                    mb: 2,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.background.paper, 0.5),
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}>
                    {filterType !== 'all' && (
                        <Chip
                            label={`Type: ${filterType === 'ts' ? 'TS Members' : 'CS Members'}`}
                            onDelete={() => setFilterType('all')}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{
                                borderRadius: 2,
                                height: '28px',
                                '& .MuiChip-label': {
                                    px: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                                },
                                '& .MuiChip-deleteIcon': {
                                    fontSize: '1rem',
                                    color: 'primary.main',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        color: 'error.main'
                                    }
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }
                            }}
                        />
                    )}
                    {currentFilters.tsMember && (
                        <Chip
                            avatar={
                                <Avatar
                                    src={tsMembers.find(m => m.id === currentFilters.tsMember)?.avatarUrl}
                                    sx={{ width: 20, height: 20 }}
                                >
                                    {tsMembers.find(m => m.id === currentFilters.tsMember)?.initials}
                                </Avatar>
                            }
                            label={`TS: ${tsMembers.find(m => m.id === currentFilters.tsMember)?.username}`}
                            onDelete={() => updateTabFilter('tsMember', '')}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{
                                borderRadius: 2,
                                height: '28px',
                                '& .MuiChip-label': {
                                    px: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                                },
                                '& .MuiChip-deleteIcon': {
                                    fontSize: '1rem',
                                    color: 'primary.main',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        color: 'error.main'
                                    }
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }
                            }}
                        />
                    )}
                    {currentFilters.status && (
                        <Chip
                            icon={
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: (() => {
                                            switch (currentFilters.status) {
                                                case 'done': return 'success.main';
                                                case 'in_progress': return 'primary.main';
                                                case 'waiting': return 'error.main';
                                                case 'pending': return 'warning.main';
                                                default: return 'grey.400';
                                            }
                                        })(),
                                        ml: 1.5
                                    }}
                                />
                            }
                            label={`Status: ${statusOptions.find(s => s.value === currentFilters.status)?.label}`}
                            onDelete={() => updateTabFilter('status', '')}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{
                                borderRadius: 2,
                                height: '28px',
                                '& .MuiChip-label': {
                                    px: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                                },
                                '& .MuiChip-deleteIcon': {
                                    fontSize: '1rem',
                                    color: 'primary.main',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        color: 'error.main'
                                    }
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }
                            }}
                        />
                    )}
                    {currentFilters.app && (
                        <Chip
                            icon={
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: getAppColor(currentFilters.app),
                                        ml: 1.5
                                    }}
                                />
                            }
                            label={`App: ${currentFilters.app}`}
                            onDelete={() => updateTabFilter('app', '')}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{
                                borderRadius: 2,
                                height: '28px',
                                '& .MuiChip-label': {
                                    px: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                                },
                                '& .MuiChip-deleteIcon': {
                                    fontSize: '1rem',
                                    color: 'primary.main',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        color: 'error.main'
                                    }
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
                        p: { xs: 2.5, sm: 3 }, 
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        height: { xs: '400px', sm: '450px' },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.12)'
                        }
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ 
                            mb: 2.5,
                            fontSize: { xs: '1.1rem', sm: '1.2rem' },
                            fontWeight: 600,
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            '&::before': {
                                content: '""',
                                width: 4,
                                height: 24,
                                backgroundColor: 'primary.main',
                                borderRadius: 2,
                                display: 'block'
                            }
                        }}>
                            Cards by TS Member
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={chartsData.pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="42%"
                                    outerRadius={({ viewBox: { width, height } }) => 
                                        Math.min(width, height) * 0.32
                                    }
                                    innerRadius={({ viewBox: { width, height } }) => 
                                        Math.min(width, height) * 0.2
                                    }
                                    fill="#8884d8"
                                    paddingAngle={2}
                                    label={false}
                                    labelLine={false}
                                    onClick={handlePieChartClick}
                                >
                                    {chartsData.pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color}
                                            style={{ 
                                                cursor: 'pointer',
                                                filter: currentFilters.tsMember === entry.name ? 'brightness(1.2)' : 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                    ))}
                                </Pie>
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    wrapperStyle={{
                                        paddingLeft: '24px',
                                        fontSize: '13px',
                                        width: '40%',
                                        maxHeight: '100%',
                                        overflowY: 'auto',
                                        '& .recharts-legend-item': {
                                            marginBottom: '12px !important',
                                            display: 'flex !important',
                                            alignItems: 'center !important'
                                        }
                                    }}
                                    formatter={(value, entry) => {
                                        const total = chartsData.pieData.reduce((sum, item) => sum + item.value, 0);
                                        const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                        return (
                                            <Box sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center',
                                                gap: 1,
                                                fontSize: '0.8rem',
                                                color: theme.palette.text.primary,
                                                fontWeight: currentFilters.tsMember === entry.payload.name ? 600 : 400
                                            }}>
                                                <span style={{ 
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '120px'
                                                }}>
                                                    {entry.payload.name}
                                                </span>
                                                <span style={{ 
                                                    color: theme.palette.text.secondary,
                                                    marginLeft: 'auto'
                                                }}>
                                                    {entry.payload.value} ({percentage}%)
                                                </span>
                                            </Box>
                                        );
                                    }}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                                        padding: '12px 16px',
                                        fontSize: '13px',
                                        fontWeight: 500
                                    }}
                                    itemStyle={{
                                        padding: '4px 0'
                                    }}
                                    formatter={(value, name, props) => {
                                        const total = chartsData.pieData.reduce((sum, item) => sum + item.value, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return [`${value} (${percentage}%)`, name];
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* App Distribution Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                        p: { xs: 2.5, sm: 3 }, 
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        height: { xs: '400px', sm: '450px' },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.12)'
                        }
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ 
                            mb: 2.5,
                            fontSize: { xs: '1.1rem', sm: '1.2rem' },
                            fontWeight: 600,
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            '&::before': {
                                content: '""',
                                width: 4,
                                height: 24,
                                backgroundColor: 'primary.main',
                                borderRadius: 2,
                                display: 'block'
                            }
                        }}>
                            Cards by App
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={chartsData.appPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="42%"
                                    outerRadius={({ viewBox: { width, height } }) => 
                                        Math.min(width, height) * 0.32
                                    }
                                    innerRadius={({ viewBox: { width, height } }) => 
                                        Math.min(width, height) * 0.2
                                    }
                                    fill="#8884d8"
                                    paddingAngle={2}
                                    label={false}
                                    labelLine={false}
                                    onClick={handleAppPieChartClick}
                                >
                                    {chartsData.appPieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${entry.name}`} 
                                            fill={entry.color}
                                            style={{ 
                                                cursor: 'pointer',
                                                filter: currentFilters.app === entry.name ? 'brightness(1.2)' : 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                    ))}
                                </Pie>
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    wrapperStyle={{
                                        paddingLeft: '24px',
                                        fontSize: '13px',
                                        width: '40%',
                                        maxHeight: '100%',
                                        overflowY: 'auto',
                                        '& .recharts-legend-item': {
                                            marginBottom: '12px !important',
                                            display: 'flex !important',
                                            alignItems: 'center !important'
                                        }
                                    }}
                                    formatter={(value, entry) => {
                                        const total = chartsData.appPieData.reduce((sum, item) => sum + item.value, 0);
                                        const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                        return (
                                            <Box sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center',
                                                gap: 1,
                                                fontSize: '0.8rem',
                                                color: theme.palette.text.primary,
                                                fontWeight: currentFilters.app === entry.payload.name ? 600 : 400
                                            }}>
                                                <span style={{ 
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '120px'
                                                }}>
                                                    {entry.payload.name}
                                                </span>
                                                <span style={{ 
                                                    color: theme.palette.text.secondary,
                                                    marginLeft: 'auto'
                                                }}>
                                                    {entry.payload.value} ({percentage}%)
                                                </span>
                                            </Box>
                                        );
                                    }}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                                        padding: '12px 16px',
                                        fontSize: '13px',
                                        fontWeight: 500
                                    }}
                                    itemStyle={{
                                        padding: '4px 0'
                                    }}
                                    formatter={(value, name, props) => {
                                        const total = chartsData.appPieData.reduce((sum, item) => sum + item.value, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return [`${value} (${percentage}%)`, name];
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Member Status Bar Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                        p: { xs: 2.5, sm: 3 }, 
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        height: { xs: '400px', sm: '450px' },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.12)'
                        }
                    }}>
                        <Typography variant="h6" gutterBottom sx={{ 
                            mb: 2.5,
                            fontSize: { xs: '1.1rem', sm: '1.2rem' },
                            fontWeight: 600,
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            '&::before': {
                                content: '""',
                                width: 4,
                                height: 24,
                                backgroundColor: 'primary.main',
                                borderRadius: 2,
                                display: 'block'
                            }
                        }}>
                            Cards by Status
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart 
                                data={chartsData.barData}
                                onClick={handleStatusBarChartClick}
                                margin={{
                                    top: 20,
                                    right: 24,
                                    left: -16,
                                    bottom: 48
                                }}
                            >
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center"
                                    layout="horizontal"
                                    wrapperStyle={{
                                        paddingTop: '24px',
                                        fontSize: '13px',
                                        width: '100%',
                                        maxHeight: '35%',
                                        overflowY: 'auto',
                                        '& .recharts-legend-item': {
                                            marginRight: '16px !important'
                                        }
                                    }}
                                    formatter={(value, entry) => {
                                        // Truncate name if too long
                                        const displayName = entry.dataKey.length > 15 
                                            ? `${entry.dataKey.slice(0, 15)}...` 
                                            : entry.dataKey;
                                        return <span style={{ color: theme.palette.text.primary }}>{displayName}</span>;
                                    }}
                                />
                                <CartesianGrid 
                                    strokeDasharray="3 3" 
                                    stroke={alpha(theme.palette.divider, 0.15)}
                                    vertical={false}
                                />
                                <XAxis 
                                    dataKey="name" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={60}
                                    interval={0}
                                    tick={({ x, y, payload }) => {
                                        // Truncate name if too long
                                        const displayName = payload.value.length > 10 
                                            ? `${payload.value.slice(0, 10)}...` 
                                            : payload.value;
                                        return (
                                            <text 
                                                x={x} 
                                                y={y + 8}
                                                textAnchor="end" 
                                                fill={theme.palette.text.secondary}
                                                fontSize="11"
                                                transform={`rotate(-45, ${x}, ${y})`}
                                            >
                                                {displayName}
                                            </text>
                                        );
                                    }}
                                    axisLine={{
                                        stroke: alpha(theme.palette.divider, 0.2)
                                    }}
                                    tickLine={{
                                        stroke: alpha(theme.palette.divider, 0.2)
                                    }}
                                />
                                <YAxis
                                    tick={{
                                        fontSize: 11,
                                        fill: theme.palette.text.secondary
                                    }}
                                    axisLine={{
                                        stroke: alpha(theme.palette.divider, 0.2)
                                    }}
                                    tickLine={{
                                        stroke: alpha(theme.palette.divider, 0.2)
                                    }}
                                />
                                <Tooltip 
                                    cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                                        padding: '12px 16px',
                                        fontSize: '13px',
                                        fontWeight: 500
                                    }}
                                    itemStyle={{
                                        padding: '4px 0'
                                    }}
                                    formatter={(value, name, props) => {
                                        return [`${value}`, name];
                                    }}
                                    labelFormatter={(label) => {
                                        return `Member: ${label}`;
                                    }}
                                />
                                <Bar 
                                    dataKey="Total Issues" 
                                    fill={alpha('#9575cd', 0.85)}
                                    name="Total Issues"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.secondary,
                                        fontSize: 11,
                                        dy: -4,
                                        fontWeight: 500
                                    }}
                                />
                                <Bar 
                                    dataKey="Done" 
                                    fill={alpha('#4caf50', 0.85)}
                                    name="Done"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.secondary,
                                        fontSize: 11,
                                        dy: -4,
                                        fontWeight: 500
                                    }}
                                />
                                <Bar 
                                    dataKey="Doing" 
                                    fill={alpha('#2196f3', 0.85)}
                                    name="Doing"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.secondary,
                                        fontSize: 11,
                                        dy: -4,
                                        fontWeight: 500
                                    }}
                                />
                                <Bar 
                                    dataKey="Wait" 
                                    fill={alpha('#f44336', 0.85)}
                                    name="Wait"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                    style={{ cursor: 'pointer' }}
                                    label={{ 
                                        position: 'top',
                                        fill: theme.palette.text.secondary,
                                        fontSize: 11,
                                        dy: -4,
                                        fontWeight: 500
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
                    background: 'white',
                    animation: 'tableAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    '@keyframes tableAppear': {
                        from: {
                            opacity: 0,
                            transform: 'translateY(20px)',
                            filter: 'blur(5px)'
                        },
                        to: {
                            opacity: 1,
                            transform: 'translateY(0)',
                            filter: 'blur(0)'
                        }
                    }
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
                                    <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
                                        <Paper sx={{ 
                                            p: 2,
                                            borderRadius: 2,
                                            background: 'white',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                            }
                                        }}>
                                            {/* Warning Badge */}
                                            {(() => {
                                                const waitingRatio = totalCards > 0 ? waitingCards / totalCards : 0;
                                                if (totalCards > 0 && waitingRatio > 0.4) {
                                                    return (
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            top: 12,
                                                            right: 12,
                                                            background: alpha(theme.palette.warning.main, 0.1),
                                                            color: theme.palette.warning.main,
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            zIndex: 1
                                                        }}>
                                                            <WarningIcon sx={{ fontSize: '0.875rem' }} />
                                                            {Math.round(waitingRatio * 100)}% waiting
                                                        </Box>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Member Header */}
                                            <Box sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center',
                                                gap: 1.5,
                                                mb: 2
                                            }}>
                                                <Avatar
                                                    src={member.avatarUrl}
                                                    alt={member.username}
                                                    sx={{ 
                                                        width: 40,
                                                        height: 40,
                                                        bgcolor: TS_MEMBER_COLORS[member.id] || 'primary.main',
                                                        fontSize: '1rem',
                                                        fontWeight: 600,
                                                        border: '2px solid white',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {member.initials}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle1" sx={{ 
                                                        fontWeight: 600,
                                                        fontSize: '0.9rem',
                                                        color: 'text.primary',
                                                        lineHeight: 1.2
                                                    }}>
                                                        {member.username}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5
                                                    }}>
                                                        <Box component="span" sx={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            bgcolor: 'success.main',
                                                            display: 'inline-block'
                                                        }}/>
                                                        {member.role}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Stats Grid */}
                                            <Box sx={{ 
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: 1,
                                                mb: 2
                                            }}>
                                                <Box sx={{
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    background: alpha(theme.palette.primary.main, 0.08),
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <Typography variant="h6" sx={{
                                                        fontWeight: 700,
                                                        color: 'primary.main',
                                                        fontSize: '1.1rem',
                                                        lineHeight: 1
                                                    }}>
                                                        {totalCards}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem',
                                                        mt: 0.5
                                                    }}>
                                                        Total
                                                    </Typography>
                                                </Box>

                                                <Box sx={{
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    background: alpha(theme.palette.success.main, 0.08),
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <Typography variant="h6" sx={{
                                                        fontWeight: 700,
                                                        color: 'success.main',
                                                        fontSize: '1.1rem',
                                                        lineHeight: 1
                                                    }}>
                                                        {completedCards}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem',
                                                        mt: 0.5
                                                    }}>
                                                        Done
                                                    </Typography>
                                                </Box>

                                                <Box sx={{
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    background: alpha(theme.palette.warning.main, 0.08),
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <Typography variant="h6" sx={{
                                                        fontWeight: 700,
                                                        color: 'warning.main',
                                                        fontSize: '1.1rem',
                                                        lineHeight: 1
                                                    }}>
                                                        {doingCards}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem',
                                                        mt: 0.5
                                                    }}>
                                                        Doing
                                                    </Typography>
                                                </Box>

                                                <Box sx={{
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    background: alpha(theme.palette.error.main, 0.08),
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}>
                                                    <Typography variant="h6" sx={{
                                                        fontWeight: 700,
                                                        color: 'error.main',
                                                        fontSize: '1.1rem',
                                                        lineHeight: 1
                                                    }}>
                                                        {waitingCards}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem',
                                                        mt: 0.5
                                                    }}>
                                                        Wait
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Resolution Time Button */}
                                            {!memberResults[member.id] ? (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    onClick={() => calculateMemberResolutionTime(member.id)}
                                                    disabled={calculatingMember === member.id}
                                                    startIcon={<TimerIcon />}
                                                    sx={{ 
                                                        mt: 'auto',
                                                        borderRadius: 1.5,
                                                        textTransform: 'none',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    {calculatingMember === member.id ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <CircularProgress size={16} />
                                                            Calculating...
                                                        </Box>
                                                    ) : 'Calculate Resolution Time'}
                                                </Button>
                                            ) : memberResults[member.id].error ? (
                                                <Alert 
                                                    severity="error"
                                                    sx={{ mt: 'auto', fontSize: '0.75rem' }}
                                                    action={
                                                        <Button
                                                            color="error"
                                                            size="small"
                                                            onClick={() => {
                                                                setMemberResults(prev => {
                                                                    const newResults = {...prev};
                                                                    delete newResults[member.id];
                                                                    return newResults;
                                                                });
                                                            }}
                                                        >
                                                            Retry
                                                        </Button>
                                                    }
                                                >
                                                    {memberResults[member.id].error}
                                                </Alert>
                                            ) : (
                                                <Box sx={{ 
                                                    mt: 'auto',
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: 1
                                                }}>
                                                    {['Total Time', 'TS Time', 'First Action'].map((label, index) => (
                                                        <Box key={label} sx={{
                                                            p: 1,
                                                            borderRadius: 1.5,
                                                            background: alpha(theme.palette.primary.main, 0.05),
                                                            textAlign: 'center'
                                                        }}>
                                                            <Typography variant="caption" sx={{ 
                                                                color: 'text.secondary', 
                                                                fontSize: '0.65rem',
                                                                display: 'block'
                                                            }}>
                                                                {label}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ 
                                                                fontWeight: 600,
                                                                color: (() => {
                                                                    const time = index === 0 
                                                                        ? memberResults[member.id].averageResolutionTime
                                                                        : index === 1
                                                                            ? memberResults[member.id].averageTSResolutionTime
                                                                            : memberResults[member.id].averageFirstActionTime;
                                                                    const threshold = index === 2 ? 30 : 120;
                                                                    return time > threshold ? 'error.main' : 'success.main';
                                                                })(),
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                {Math.floor((() => {
                                                                    switch(index) {
                                                                        case 0: return memberResults[member.id].averageResolutionTime;
                                                                        case 1: return memberResults[member.id].averageTSResolutionTime;
                                                                        case 2: return memberResults[member.id].averageFirstActionTime;
                                                                        default: return 0;
                                                                    }
                                                                })() / 60)}h {(() => {
                                                                    switch(index) {
                                                                        case 0: return memberResults[member.id].averageResolutionTime;
                                                                        case 1: return memberResults[member.id].averageTSResolutionTime;
                                                                        case 2: return memberResults[member.id].averageFirstActionTime;
                                                                        default: return 0;
                                                                    }
                                                                })() % 60}m
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
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
                    animation: 'tableAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    '@keyframes tableAppear': {
                        from: {
                            opacity: 0,
                            transform: 'translateY(20px)',
                            filter: 'blur(5px)'
                        },
                        to: {
                            opacity: 1,
                            transform: 'translateY(0)',
                            filter: 'blur(0)'
                        }
                    },
                    '& .MuiTableCell-root': {
                        py: { xs: 1.5, sm: 2 },
                        px: { xs: 1, sm: 2, md: 3 },
                        transition: 'all 0.2s ease',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                    },
                    '& .MuiTableRow-root': {
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            transform: 'scale(1.001)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }
                    }
                }}
            >
                <Table sx={{ minWidth: { xs: '800px', md: '100%' } }}>
                    <TableHead>
                        <TableRow sx={{ 
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                            '& .MuiTableCell-root': {
                                fontWeight: 600,
                                color: 'primary.main',
                                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                py: { xs: 2, sm: 2.5 },
                                whiteSpace: 'nowrap',
                                borderBottom: 'none',
                                '&:first-of-type': {
                                    borderTopLeftRadius: 12,
                                },
                                '&:last-child': {
                                    borderTopRightRadius: 12,
                                }
                            }
                        }}>
                            <TableCell width="5%"><b>#</b></TableCell>
                            <TableCell width="25%"><b>Tên Card</b></TableCell>
                            <TableCell width="20%"><b>Agent</b></TableCell>
                            <TableCell width="10%"><b>App</b></TableCell>
                            <TableCell width="15%"><b>List</b></TableCell>
                            <TableCell width="10%"><b>Status</b></TableCell>
                            <TableCell
                                width="15%"
                                sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': {
                                        color: 'primary.dark',
                                    }
                                }}
                                onClick={() => setSortByDueAsc(prev => !prev)}
                            >
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.5 
                                }}>
                                    <b>Due Date</b>
                                    <Box component="span" sx={{ 
                                        transition: 'transform 0.2s ease',
                                        transform: sortByDueAsc ? 'rotate(0deg)' : 'rotate(180deg)'
                                    }}>
                                        ▼
                                    </Box>
                                </Box>
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
                                        cursor: 'pointer',
                                        '&:nth-of-type(odd)': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.02),
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
                                                maxWidth: { xs: '150px', sm: '200px', md: '250px' },
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
                                            maxWidth: { xs: '200px', sm: '250px', md: '300px' },
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
                                                height: '22px',
                                                backgroundColor: alpha(getAppColor(getAppLabel(card.labels || [])), 0.1),
                                                color: getAppColor(getAppLabel(card.labels || [])),
                                                fontWeight: 500,
                                                fontSize: '0.75rem',
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
                                                height: '22px',
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                color: 'primary.main',
                                                fontWeight: 500,
                                                fontSize: '0.75rem',
                                                minWidth: { xs: '100px', sm: '120px' }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={status.label}
                                            size="small"
                                            sx={{
                                                height: '22px',
                                                fontWeight: 500,
                                                fontSize: '0.75rem',
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
                                                borderRadius: '12px',
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
                                    <TableCell sx={{ 
                                        fontWeight: 500,
                                        color: theme.palette.text.secondary
                                    }}>
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
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                open={loading}
            >
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 2,
                    animation: loading ? 'loadingAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    '@keyframes loadingAppear': {
                        from: {
                            opacity: 0,
                            transform: 'scale(0.9)',
                        },
                        to: {
                            opacity: 1,
                            transform: 'scale(1)',
                        }
                    }
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