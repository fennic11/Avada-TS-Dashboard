import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, useTheme, alpha, Button, Menu, MenuItem, TextField, InputAdornment } from '@mui/material';
import { getCardsByList, getListsByBoardId } from '../../api/trelloApi';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';

const SPEEDUP_POINTS = {
    '0': 4,
    '1': 8,
    '2': 20,
    '3': 40,
    '4': 45
};

const BOARD_ID = '638d769884c52b05235a2310';
const DEFAULT_LIST_ID = '6629f8b136152f62cca0c46b';

const SpeedUpKPI = () => {
    const theme = useTheme();
    const [kpiData, setKpiData] = useState({
        totalPoints: 0,
        totalCards: 0,
        levels: {
            level0: { cards: 0, points: 0 },
            level1: { cards: 0, points: 0 },
            level2: { cards: 0, points: 0 },
            level3: { cards: 0, points: 0 },
            level4: { cards: 0, points: 0 }
        }
    });
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState([]);
    const [currentList, setCurrentList] = useState(DEFAULT_LIST_ID);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const listsData = await getListsByBoardId(BOARD_ID);
                if (listsData) {
                    setLists(listsData);
                }
            } catch (error) {
                console.error('Error fetching lists:', error);
            }
        };

        fetchLists();
    }, []);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                const cards = await getCardsByList(currentList);
                
                if (!cards) {
                    throw new Error('Failed to fetch cards');
                }

                const newKpiData = {
                    totalPoints: 0,
                    totalCards: cards.length,
                    levels: {
                        level0: { cards: 0, points: 0 },
                        level1: { cards: 0, points: 0 },
                        level2: { cards: 0, points: 0 },
                        level3: { cards: 0, points: 0 },
                        level4: { cards: 0, points: 0 }
                    }
                };

                cards.forEach(card => {
                    card.labels.forEach(label => {
                        // Check for issue level labels
                        if (label.name.includes('Issue: level') || label.name === 'Issues: Level 4') {
                            const level = label.name.includes('Level 4') ? '4' : label.name.split('level ')[1];
                            const points = SPEEDUP_POINTS[level];
                            
                            if (points) {
                                newKpiData.totalPoints += points;
                                switch (level) {
                                    case '0':
                                        newKpiData.levels.level0.cards++;
                                        newKpiData.levels.level0.points += points;
                                        break;
                                    case '1':
                                        newKpiData.levels.level1.cards++;
                                        newKpiData.levels.level1.points += points;
                                        break;
                                    case '2':
                                        newKpiData.levels.level2.cards++;
                                        newKpiData.levels.level2.points += points;
                                        break;
                                    case '3':
                                        newKpiData.levels.level3.cards++;
                                        newKpiData.levels.level3.points += points;
                                        break;
                                    case '4':
                                        newKpiData.levels.level4.cards++;
                                        newKpiData.levels.level4.points += points;
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                    });
                });

                setKpiData(newKpiData);
            } catch (error) {
                console.error('Error fetching cards:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCards();
    }, [currentList]);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSearchTerm('');
    };

    const handleListSelect = (listId) => {
        setCurrentList(listId);
        handleClose();
    };

    const filteredLists = lists.filter(list => 
        list.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    background: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 2,
                }}
            >
                <CircularProgress size={60} thickness={4} />
                <Typography variant="h6" sx={{ mt: 3, color: 'primary.main' }}>
                    Đang tải dữ liệu Speed Up KPI...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', p: 4 }}>
            <Box sx={{ 
                mb: 4,
                display: 'flex', 
                alignItems: 'center',
                gap: 2
            }}>
                <Button
                    variant="outlined"
                    onClick={handleClick}
                    startIcon={<AssignmentIcon />}
                    sx={{
                        minWidth: 300,
                        justifyContent: 'flex-start',
                        backgroundColor: 'white',
                        borderRadius: 2,
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                        borderWidth: 2,
                        '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                        py: 1.5,
                        px: 2,
                    }}
                >
                    {lists.find(list => list.id === currentList)?.name || 'Chọn list'}
                </Button>

                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    PaperProps={{
                        sx: {
                            width: 300,
                            maxHeight: 400,
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        }
                    }}
                >
                    <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                        <TextField
                            fullWidth
                            placeholder="Tìm kiếm list..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: theme.palette.primary.main }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    borderRadius: 1,
                                }
                            }}
                        />
                    </Box>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {filteredLists.map((list) => (
                            <MenuItem
                                key={list.id}
                                onClick={() => handleListSelect(list.id)}
                                selected={list.id === currentList}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.16),
                                        }
                                    }
                                }}
                            >
                                <AssignmentIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                                {list.name}
                            </MenuItem>
                        ))}
                    </Box>
                </Menu>
            </Box>

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} md={6}>
                    <Card 
                        sx={{ 
                            borderRadius: 3,
                            boxShadow: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6,
                            },
                            border: 'none',
                            background: 'white',
                        }}
                    >
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                                Tổng số card
                            </Typography>
                            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                {kpiData.totalCards}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card 
                        sx={{ 
                            borderRadius: 3,
                            boxShadow: 3,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6,
                            },
                            border: 'none',
                            background: 'white',
                        }}
                    >
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                                Tổng điểm KPI
                            </Typography>
                            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                {kpiData.totalPoints}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Level Cards */}
                {Object.entries(kpiData.levels)
                    .filter(([_, data]) => data.cards > 0)
                    .map(([level, data], index) => (
                    <Grid item xs={12} md={4} key={level}>
                        <Card 
                            sx={{ 
                                borderRadius: 3,
                                boxShadow: 3,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                },
                                border: 'none',
                                background: 'white',
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>
                                    Level {level.slice(-1)} ({SPEEDUP_POINTS[level.slice(-1)]}pts)
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">Cards</Typography>
                                        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                            {data.cards}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">Points</Typography>
                                        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                            {data.points}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default SpeedUpKPI;
