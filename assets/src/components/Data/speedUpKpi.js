import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, useTheme, alpha, Button, Menu, MenuItem, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Avatar } from '@mui/material';
import { getCardsByList, getListsByBoardId } from '../../api/trelloApi';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import members from '../../data/members.json';

const SPEEDUP_POINTS = {
    '0': 4,
    '1': 8,
    '2': 20,
    '3': 40,
    '4': 45
};

const BOARD_ID = '638d769884c52b05235a2310';
const DEFAULT_LIST_ID = '6629f8b136152f62cca0c46b';

const SpeedUpKPI = ({ onKpiDataChange }) => {
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
    const [memberKPIs, setMemberKPIs] = useState({});
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState([]);
    const [currentList, setCurrentList] = useState(DEFAULT_LIST_ID);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const [open, setOpen] = useState(false);

    // Helper functions for member data
    const getMemberName = (id) => {
        const mem = members.find((m) => m.id === id);
        return mem ? mem.fullName : id;
    };

    const getMemberAvatar = (id) => {
        const mem = members.find((m) => m.id === id);
        return mem?.avatarUrl || null;
    };

    const getMemberRole = (id) => {
        const mem = members.find((m) => m.id === id);
        return mem?.role || null;
    };

    const getMemberInitials = (id) => {
        const mem = members.find((m) => m.id === id);
        return mem?.initials || id.substring(0, 2).toUpperCase();
    };

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

                const memberIdsList = members.map(m => m.id);
                const memberKPI = {};

                // Filter cards to only include those with TS/ts-lead members or ricky_avada
                const filteredCards = cards.filter(card => {
                    return card.idMembers.some(id => {
                        const member = members.find(m => m.id === id);
                        return member && (
                            member.role === 'TS' || 
                            member.role === 'ts-lead' || 
                            member.username === 'ricky_avada' || 
                            member.username === 'jade_avada'
                        );
                    });
                });

                filteredCards.forEach(card => {
                    const validMembers = card.idMembers.filter(id => memberIdsList.includes(id));
                    
                    // Only process cards with valid members
                    if (validMembers.length === 0) return;

                    card.labels.forEach(label => {
                        // Check for issue level labels
                        if (label.name.includes('Issue: level') || label.name === 'Issues: Level 4') {
                            const level = label.name.includes('Level 4') ? '4' : label.name.split('level ')[1];
                            const points = SPEEDUP_POINTS[level];
                            
                            if (points) {
                                newKpiData.totalPoints += points;
                                
                                // Update level data
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

                                // Update member KPI data
                                validMembers.forEach(memberId => {
                                    if (!memberKPI[memberId]) {
                                        memberKPI[memberId] = {
                                            points: 0,
                                            cards: [],
                                            levelPoints: {},
                                            levelCardCount: {},
                                        };
                                    }

                                    memberKPI[memberId].points += points;
                                    memberKPI[memberId].cards.push({ ...card, level, point: points });

                                    // Level - Điểm
                                    if (!memberKPI[memberId].levelPoints[level]) {
                                        memberKPI[memberId].levelPoints[level] = 0;
                                    }
                                    memberKPI[memberId].levelPoints[level] += points;

                                    // Level - Số lượng card
                                    if (!memberKPI[memberId].levelCardCount[level]) {
                                        memberKPI[memberId].levelCardCount[level] = 0;
                                    }
                                    memberKPI[memberId].levelCardCount[level] += 1;
                                });
                            }
                        }
                    });
                });

                setKpiData(newKpiData);
                setMemberKPIs(memberKPI);

                // Calculate team total KPI for parent component
                const totalPoints = Object.values(memberKPI).reduce((sum, data) => sum + data.points, 0);
                const totalCards = Object.values(memberKPI).reduce((sum, data) => sum + data.cards.length, 0);
                const totalMembers = Object.keys(memberKPI).length;
                const averagePoints = totalMembers > 0 ? Math.round(totalPoints / totalMembers * 100) / 100 : 0;

                // Send data to parent component
                if (onKpiDataChange) {
                    onKpiDataChange({
                        totalPoints,
                        totalCards,
                        totalMembers,
                        averagePoints
                    });
                }
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

            {/* Member KPI Section */}
            {Object.keys(memberKPIs).length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    >
                        🏆 Bảng xếp hạng theo điểm Speed Up
                    </Typography>
                    <Grid container spacing={2}>
                        {Object.entries(memberKPIs)
                            .map(([memberId, data]) => ({
                                memberId,
                                points: data.points,
                                cards: data.cards.length,
                                name: getMemberName(memberId)
                            }))
                            .sort((a, b) => b.points - a.points)
                            .map((member, index) => (
                                <Grid item xs={12} sm={6} md={4} key={member.memberId}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                            background: index < 3 
                                                ? alpha(theme.palette.primary.main, 0.05)
                                                : 'white',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: 2,
                                            }
                                        }}
                                    >
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 2 
                                        }}>
                                            <Avatar
                                                src={getMemberAvatar(member.memberId)}
                                                alt={getMemberName(member.memberId)}
                                                sx={{ 
                                                    width: 40, 
                                                    height: 40,
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {getMemberInitials(member.memberId)}
                                            </Avatar>
                                            <Box>
                                                <Typography 
                                                    variant="subtitle1" 
                                                    sx={{ 
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1
                                                    }}
                                                >
                                                    {getMemberName(member.memberId)}
                                                    {getMemberRole(member.memberId) === 'TS' && (
                                                        <Chip
                                                            label="TS"
                                                            size="small"
                                                            sx={{
                                                                bgcolor: 'primary.main',
                                                                color: 'white',
                                                                fontSize: '0.75rem',
                                                                height: 20,
                                                                '& .MuiChip-label': {
                                                                    px: 1
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {member.cards} cards • {member.points} points
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                    </Grid>
                </Box>
            )}

            {/* Detailed Member Cards */}
            {Object.keys(memberKPIs).length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    >
                        📊 Chi tiết KPI từng thành viên
                    </Typography>
                    <Grid container spacing={3}>
                        {Object.entries(memberKPIs).map(([memberId, data]) => {
                            if (data.cards.length === 0) return null;

                            return (
                                <Grid item xs={12} md={6} key={memberId}>
                                    <Card 
                                        elevation={0}
                                        sx={{ 
                                            borderRadius: 3,
                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 4,
                                            },
                                            background: 'white',
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 3,
                                                pb: 2,
                                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                            }}>
                                                <Box>
                                                    <Typography 
                                                        variant="h6" 
                                                        sx={{ 
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            mb: 0.5
                                                        }}
                                                    >
                                                        👤 {getMemberName(memberId)}
                                                    </Typography>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.secondary'
                                                        }}
                                                    >
                                                        {data.cards.length} cards
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography 
                                                        variant="h4" 
                                                        sx={{ 
                                                            color: 'primary.main',
                                                            fontWeight: 700,
                                                            lineHeight: 1
                                                        }}
                                                    >
                                                        {data.points}
                                                    </Typography>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            color: 'text.secondary'
                                                        }}
                                                    >
                                                        điểm
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box sx={{ mb: 3 }}>
                                                {Object.entries(data.levelCardCount).map(([level, value]) => (
                                                    <Chip
                                                        key={level}
                                                        label={`Level ${level}: ${value} card (${SPEEDUP_POINTS[level]}pts)`}
                                                        sx={{
                                                            m: 0.5,
                                                            borderRadius: 2,
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                            color: 'primary.main',
                                                            fontWeight: 500,
                                                        }}
                                                    />
                                                ))}
                                            </Box>

                                            <Accordion 
                                                sx={{ 
                                                    borderRadius: '12px !important',
                                                    boxShadow: 'none',
                                                    '&:before': { display: 'none' },
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                }}
                                            >
                                                <AccordionSummary 
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        borderRadius: '12px 12px 0 0',
                                                        '&:hover': {
                                                            background: alpha(theme.palette.primary.main, 0.05),
                                                        }
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 500 }}>
                                                        Chi tiết ({data.cards.length} card)
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <TableContainer 
                                                        component={Paper}
                                                        elevation={0}
                                                        sx={{ 
                                                            borderRadius: 2,
                                                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.03) }}>
                                                                    <TableCell sx={{ fontWeight: 600 }}>Tên Card</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600 }}>Điểm</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {data.cards.map((card) => (
                                                                    <TableRow 
                                                                        key={card.id}
                                                                        sx={{
                                                                            '&:hover': {
                                                                                background: alpha(theme.palette.primary.main, 0.03),
                                                                                cursor: 'pointer'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <TableCell>
                                                                            <Typography
                                                                                variant="body2"
                                                                                sx={{
                                                                                    color: 'primary.main',
                                                                                    textDecoration: 'none',
                                                                                    '&:hover': {
                                                                                        textDecoration: 'underline',
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {card.name}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Chip 
                                                                                label={`Level ${card.level}`}
                                                                                size="small"
                                                                                sx={{
                                                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                                                    color: 'primary.main',
                                                                                    fontWeight: 500
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>{card.point}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </AccordionDetails>
                                            </Accordion>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}
        </Box>
    );
};

export default SpeedUpKPI;
