import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, useTheme, alpha } from '@mui/material';
import { getCardsByList } from '../../api/trelloApi';

const SPEEDUP_POINTS = {
    '0': 4,
    '1': 8,
    '2': 20,
    '3': 40,
    '4': 45
};

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

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                const cards = await getCardsByList('6629f8b136152f62cca0c46b');
                
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
    }, []);

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
        <Box sx={{ width: '100%' }}>
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
