import { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Grid,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Accordion,
    AccordionSummary, AccordionDetails, Card, CardContent, Link,
    useTheme, alpha, Tabs, Tab, Chip, Fade, Select, MenuItem, FormControl, InputLabel, Avatar
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupIcon from '@mui/icons-material/Group';
import WarningIcon from '@mui/icons-material/Warning';
import SpeedUpKPI from './speedUpKpi';
import BugsKpiSummary from './BugsKpi';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssignmentIcon from '@mui/icons-material/Assignment';
import members from '../../data/members.json';
import { getCardsByList, getListsByBoardId } from '../../api/trelloApi';

const ISSUE_POINTS = {
    'Issue: level 0': 4,
    'Issue: level 1': 8,
    'Issue: level 2': 15,
    'Issue: level 3': 30,
    'Issues: Level 4': 45,
};

const BOARD_ID = '638d769884c52b05235a2310';
const DEFAULT_ISSUES_LIST_ID = '66d7d254bdad4fb0a354495a';
const DEFAULT_BUGS_LIST_ID = '663ae7d6feac5f2f8d7a1c86';

const IssuesKpiSummary = () => {
    const theme = useTheme();
    const [singleMemberKPIs, setSingleMemberKPIs] = useState({});
    const [totalCards, setTotalCards] = useState(0);
    const [noLevelCards, setNoLevelCards] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeLevelFilter, setActiveLevelFilter] = useState({});
    const [multiLevelCards, setMultiLevelCards] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [lists, setLists] = useState([]);
    const [issuesSelectedList, setIssuesSelectedList] = useState('');
    const [bugsSelectedList, setBugsSelectedList] = useState('');

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const listsData = await getListsByBoardId(BOARD_ID);
                if (listsData) {
                    setLists(listsData);
                    // Set default list IDs for both tabs
                    setIssuesSelectedList(DEFAULT_ISSUES_LIST_ID);
                    setBugsSelectedList(DEFAULT_BUGS_LIST_ID);
                }
            } catch (error) {
                console.error('Error fetching lists:', error);
            }
        };

        fetchLists();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!issuesSelectedList) return;

            try {
                setLoading(true);

                const memberIdsList = members.map(m => m.id);
                const cards = await getCardsByList(issuesSelectedList);
                if (!cards) return;

                setTotalCards(cards.length);

                const singleKPI = {};
                const multiCards = [];
                const noLevelCards = [];
                const multiLevelCards = [];

                for (let card of cards) {
                    const validLabels = card.labels.filter(label => ISSUE_POINTS[label.name]);
                    const memberIds = card.idMembers;
                    const validMembers = memberIds.filter(id => memberIdsList.includes(id));

                    // Không có agent => bỏ qua
                    if (validMembers.length === 0) continue;

                    // Có nhiều hơn 1 label level => bỏ vào danh sách riêng
                    if (validLabels.length > 1) {
                        multiLevelCards.push({ ...card, memberIds: validMembers, levels: validLabels.map(l => l.name) });
                        continue;
                    }

                    // Không có level => thêm vào danh sách card không có level
                    if (validLabels.length === 0) {
                        noLevelCards.push({ ...card, memberIds: validMembers });
                        continue;
                    }

                    // Tới đây là card hợp lệ (1 label level + có member)
                    const level = validLabels[0].name;
                    const point = ISSUE_POINTS[level];

                    if (validMembers.length === 1) {
                        const memberId = validMembers[0];
                        if (!singleKPI[memberId]) {
                            singleKPI[memberId] = {
                                points: 0,
                                cards: [],
                                levelPoints: {},
                                levelCardCount: {},
                            };
                        }

                        singleKPI[memberId].points += point;
                        singleKPI[memberId].cards.push({ ...card, level, point });

                        // Level - Điểm
                        if (!singleKPI[memberId].levelPoints[level]) {
                            singleKPI[memberId].levelPoints[level] = 0;
                        }
                        singleKPI[memberId].levelPoints[level] += point;

                        // Level - Số lượng card
                        if (!singleKPI[memberId].levelCardCount[level]) {
                            singleKPI[memberId].levelCardCount[level] = 0;
                        }
                        singleKPI[memberId].levelCardCount[level] += 1;
                    } else {
                        multiCards.push({
                            card,
                            point,
                            level,
                            memberIds: validMembers,
                        });
                    }
                }

                setSingleMemberKPIs(singleKPI);
                setNoLevelCards(noLevelCards);
                setMultiLevelCards(multiLevelCards);
            } catch (error) {
                console.error(error);
                alert("Đã có lỗi khi lấy dữ liệu từ Trello.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [issuesSelectedList]);

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

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80vh',
                    background: alpha(theme.palette.primary.main, 0.03),
                    borderRadius: 2,
                }}
            >
                <CircularProgress 
                    size={80} 
                    thickness={4}
                    sx={{ color: 'primary.main' }}
                />
                <Typography 
                    variant="h5" 
                    sx={{ 
                        mt: 4, 
                        color: 'primary.main',
                        fontWeight: 500
                    }}
                >
                    Đang tải dữ liệu KPI...
                </Typography>
                <Typography 
                    variant="body1" 
                    sx={{ 
                        mt: 2, 
                        color: 'text.secondary'
                    }}
                >
                    Vui lòng đợi trong giây lát
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', p: 4, maxWidth: '1800px', margin: '0 auto' }}>
            {/* Header Section */}
            <Paper 
                elevation={0}
                sx={{ 
                    mb: 4,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    p: 4,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3
                }}>
                    <Box>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                fontWeight: 700,
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                            }}
                        >
                            <BarChartIcon sx={{ fontSize: 40 }} />
                            KPI Dashboard
                        </Typography>
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                mt: 1,
                                color: 'text.secondary'
                            }}
                        >
                            Theo dõi hiệu suất và tiến độ công việc
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Tabs Section */}
            <Paper 
                elevation={0}
                sx={{ 
                    mb: 4,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
                }}
            >
                <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange}
                    sx={{
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'primary.main',
                            height: 3,
                        },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                            minWidth: 160,
                            py: 2,
                        }
                    }}
                >
                    <Tab 
                        icon={<BarChartIcon />} 
                        label="Issues KPI" 
                        iconPosition="start"
                    />
                    <Tab 
                        icon={<BugReportIcon />} 
                        label="Bugs KPI" 
                        iconPosition="start"
                    />
                    <Tab 
                        icon={<TrendingUpIcon />} 
                        label="Speed Up KPI" 
                        iconPosition="start"
                    />
                </Tabs>
            </Paper>

            {/* Main Content */}
            <Fade in={true} timeout={500}>
                <Box>
                    {/* Issues KPI Tab */}
                    <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                        <Paper 
                            elevation={0}
                            sx={{ 
                                mb: 4,
                                p: 3,
                                borderRadius: 3,
                                background: alpha(theme.palette.primary.main, 0.05),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            }}
                        >
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                mb: 3
                            }}>
                                <Box>
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            fontWeight: 600,
                                            color: 'primary.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2
                                        }}
                                    >
                                        <BarChartIcon sx={{ fontSize: 32 }} />
                                        Thống kê tổng quan
                                    </Typography>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{ 
                                            mt: 1,
                                            color: 'text.secondary'
                                        }}
                                    >
                                        Xem tổng số card và chuyển đổi giữa chế độ xem theo card hoặc điểm
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <FormControl 
                                        sx={{ 
                                            minWidth: 300,
                                            '& .MuiInputLabel-root': {
                                                color: theme.palette.text.secondary,
                                                '&.Mui-focused': {
                                                    color: theme.palette.primary.main,
                                                }
                                            }
                                        }}
                                    >
                                        <InputLabel>Chọn List</InputLabel>
                                        <Select
                                            value={issuesSelectedList}
                                            label="Chọn List"
                                            onChange={(e) => setIssuesSelectedList(e.target.value)}
                                            sx={{
                                                backgroundColor: 'white',
                                                borderRadius: 2,
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: alpha(theme.palette.primary.main, 0.2),
                                                    borderWidth: 2,
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: alpha(theme.palette.primary.main, 0.3),
                                                },
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.primary.main,
                                                },
                                                '& .MuiSelect-select': {
                                                    py: 1.5,
                                                    px: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }
                                            }}
                                        >
                                            {lists.map((list) => (
                                                <MenuItem 
                                                    key={list.id} 
                                                    value={list.id}
                                                    sx={{
                                                        py: 1.5,
                                                        px: 2,
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
                                        </Select>
                                    </FormControl>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Tổng số card
                                        </Typography>
                                        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                            {totalCards}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Leaderboard Section */}
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
                                    🏆 Bảng xếp hạng theo điểm
                                </Typography>
                                <Grid container spacing={2}>
                                    {Object.entries(singleMemberKPIs)
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
                        </Paper>
                        <Grid container spacing={3}>
                            {Object.entries(singleMemberKPIs).map(([memberId, data]) => {
                                if (data.cards.length === 0) return null;

                                const filteredCards = activeLevelFilter[memberId]
                                    ? data.cards.filter(card => card.level === activeLevelFilter[memberId])
                                    : data.cards;

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
                                                    {Object.entries(data.levelCardCount).map(([level, value]) => {
                                                        const isActive = activeLevelFilter[memberId] === level;
                                                        return (
                                                            <Chip
                                                                key={level}
                                                                label={`${level}: ${value} card`}
                                                                onClick={() =>
                                                                    setActiveLevelFilter(prev => ({
                                                                        ...prev,
                                                                        [memberId]: prev[memberId] === level ? null : level
                                                                    }))
                                                                }
                                                                sx={{
                                                                    m: 0.5,
                                                                    borderRadius: 2,
                                                                    backgroundColor: isActive 
                                                                        ? alpha(theme.palette.primary.main, 0.1)
                                                                        : alpha(theme.palette.divider, 0.1),
                                                                    color: isActive ? 'primary.main' : 'text.primary',
                                                                    fontWeight: isActive ? 600 : 400,
                                                                    '&:hover': {
                                                                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    })}
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
                                                            Chi tiết ({filteredCards.length} card
                                                            {activeLevelFilter[memberId] ? ` - ${activeLevelFilter[memberId]}` : ''})
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
                                                                    {filteredCards.map((card) => (
                                                                        <TableRow 
                                                                            key={card.id}
                                                                            sx={{
                                                                                '&:hover': {
                                                                                    background: alpha(theme.palette.primary.main, 0.03),
                                                                                }
                                                                            }}
                                                                        >
                                                                            <TableCell>
                                                                                <Link
                                                                                    href={card.shortUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener"
                                                                                    sx={{
                                                                                        color: 'primary.main',
                                                                                        textDecoration: 'none',
                                                                                        '&:hover': {
                                                                                            textDecoration: 'underline',
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {card.name}
                                                                                </Link>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Chip 
                                                                                    label={card.level}
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

                    {/* Bugs KPI Tab */}
                    <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                        <Paper 
                            elevation={0}
                            sx={{ 
                                mb: 4,
                                p: 3,
                                borderRadius: 3,
                                background: alpha(theme.palette.primary.main, 0.05),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            }}
                        >
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                mb: 3
                            }}>
                                <Box>
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            fontWeight: 600,
                                            color: 'primary.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2
                                        }}
                                    >
                                        <BugReportIcon sx={{ fontSize: 32 }} />
                                        Thống kê Bugs
                                    </Typography>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{ 
                                            mt: 1,
                                            color: 'text.secondary'
                                        }}
                                    >
                                        Xem thống kê và phân tích bugs
                                    </Typography>
                                </Box>
                            </Box>
                            <BugsKpiSummary selectedList={bugsSelectedList} />
                        </Paper>
                    </Box>

                    {/* Speed Up KPI Tab */}
                    <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
                        <SpeedUpKPI />
                    </Box>

                    {/* Warning Sections */}
                    {noLevelCards.length > 0 && (
                        <Paper 
                            elevation={0}
                            sx={{ 
                                mt: 6,
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                background: alpha(theme.palette.warning.main, 0.05)
                            }}
                        >
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    mb: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    color: 'warning.main'
                                }}
                            >
                                <WarningIcon /> Cards không có tag level
                            </Typography>

                            <TableContainer 
                                component={Paper}
                                elevation={0}
                                sx={{ 
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                                    overflow: 'hidden'
                                }}
                            >
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ background: alpha(theme.palette.warning.main, 0.05) }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên Card</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Người liên quan</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {noLevelCards.map(card => (
                                            <TableRow 
                                                key={card.id}
                                                sx={{
                                                    '&:hover': {
                                                        background: alpha(theme.palette.warning.main, 0.03),
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <Link
                                                        href={card.shortUrl}
                                                        target="_blank"
                                                        rel="noopener"
                                                        sx={{
                                                            color: 'warning.main',
                                                            textDecoration: 'none',
                                                            '&:hover': {
                                                                textDecoration: 'underline',
                                                            }
                                                        }}
                                                    >
                                                        {card.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {card.memberIds.map((id) => getMemberName(id)).join(', ')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {multiLevelCards.length > 0 && (
                        <Paper 
                            elevation={0}
                            sx={{ 
                                mt: 6,
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                background: alpha(theme.palette.info.main, 0.05)
                            }}
                        >
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    mb: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    color: 'info.main'
                                }}
                            >
                                <GroupIcon /> Card có nhiều người
                            </Typography>

                            <TableContainer 
                                component={Paper}
                                elevation={0}
                                sx={{ 
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                                    overflow: 'hidden'
                                }}
                            >
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ background: alpha(theme.palette.info.main, 0.05) }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên Card</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Người liên quan</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {multiLevelCards.map(card => (
                                            <TableRow 
                                                key={card.id}
                                                sx={{
                                                    '&:hover': {
                                                        background: alpha(theme.palette.info.main, 0.03),
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <Link
                                                        href={card.shortUrl}
                                                        target="_blank"
                                                        rel="noopener"
                                                        sx={{
                                                            color: 'info.main',
                                                            textDecoration: 'none',
                                                            '&:hover': {
                                                                textDecoration: 'underline',
                                                            }
                                                        }}
                                                    >
                                                        {card.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {card.memberIds.map((id) => getMemberName(id)).join(', ')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </Box>
            </Fade>
        </Box>
    );
};

export default IssuesKpiSummary;
