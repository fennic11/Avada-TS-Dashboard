import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, MenuItem, Divider, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import GroupTS1 from '../data/GroupTS1.json';
import GroupTS2 from '../data/GroupTS2.json';
import data1 from '../data/data-1-2025.json';
import data2 from '../data/data-2-2025.json';
import data3 from '../data/data-3-2025.json';
import data4 from '../data/data-4-2025.json';
import data5 from '../data/data-5-2025.json';
import appData from '../data/app.json';

const PlanTsTeam = () => {
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [teamSize, setTeamSize] = useState('6');
    const [appGroups, setAppGroups] = useState(() => {
        // Khởi tạo nhóm app từ appData
        const groups = {
            TS1: [],
            TS2: []
        };
        appData.forEach(app => {
            if (groups[app.group_ts]) {
                groups[app.group_ts].push(app);
            }
        });
        return groups;
    });

    // Tính tổng số card và KPI cho mỗi tháng
    const calculateMonthlyTotals = (data) => {
        return data.reduce((acc, app) => ({
            totalCards: acc.totalCards + app.totalCards,
            totalPoints: acc.totalPoints + app.totalPoints
        }), { totalCards: 0, totalPoints: 0 });
    };

    // Tính tổng số card và KPI cho mỗi app qua tất cả các tháng
    const calculateAppTotals = () => {
        const allData = [...data1, ...data2, ...data3, ...data4, ...data5];
        const appTotals = {};

        allData.forEach(app => {
            if (!appTotals[app.app]) {
                appTotals[app.app] = { totalCards: 0, totalPoints: 0 };
            }
            appTotals[app.app].totalCards += app.totalCards;
            appTotals[app.app].totalPoints += app.totalPoints;
        });

        return appTotals;
    };

    // Hàm xử lý kéo thả
    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const { source, destination } = result;
        const sourceTeam = source.droppableId;
        const destTeam = destination.droppableId;
        const appToMove = appGroups[sourceTeam][source.index];

        // Cập nhật nhóm app
        const newAppGroups = { ...appGroups };
        newAppGroups[sourceTeam] = [...appGroups[sourceTeam]];
        newAppGroups[destTeam] = [...appGroups[destTeam]];

        // Xóa app khỏi nhóm nguồn
        newAppGroups[sourceTeam].splice(source.index, 1);
        // Thêm app vào nhóm đích
        newAppGroups[destTeam].splice(destination.index, 0, appToMove);

        setAppGroups(newAppGroups);
    };

    // Tính toán số liệu theo nhóm TS
    const calculateTeamStats = () => {
        const appTotals = calculateAppTotals();
        const teamStats = {
            TS1: { apps: [], totalCards: 0, totalPoints: 0 },
            TS2: { apps: [], totalCards: 0, totalPoints: 0 }
        };

        // Sử dụng appGroups thay vì appData
        Object.entries(appGroups).forEach(([team, apps]) => {
            apps.forEach(app => {
                const appStats = appTotals[app.label_trello] || { totalCards: 0, totalPoints: 0 };
                
                // Lấy dữ liệu theo tháng cho app này
                const monthlyData = {
                    month1: data1.find(d => d.app === app.label_trello) || { totalCards: 0, totalPoints: 0 },
                    month2: data2.find(d => d.app === app.label_trello) || { totalCards: 0, totalPoints: 0 },
                    month3: data3.find(d => d.app === app.label_trello) || { totalCards: 0, totalPoints: 0 },
                    month4: data4.find(d => d.app === app.label_trello) || { totalCards: 0, totalPoints: 0 },
                    month5: data5.find(d => d.app === app.label_trello) || { totalCards: 0, totalPoints: 0 }
                };

                // Tính toán tổng số liệu dựa trên tháng được chọn
                let totalCards = 0;
                let totalPoints = 0;

                if (selectedMonth === 'all') {
                    totalCards = appStats.totalCards;
                    totalPoints = appStats.totalPoints;
                } else {
                    const monthData = monthlyData[`month${selectedMonth}`];
                    totalCards = monthData.totalCards;
                    totalPoints = monthData.totalPoints;
                }

                teamStats[team].apps.push({
                    name: app.app_name,
                    label: app.label_trello,
                    totalCards,
                    totalPoints,
                    monthlyData
                });
                teamStats[team].totalCards += totalCards;
                teamStats[team].totalPoints += totalPoints;
            });
        });

        // Sắp xếp apps theo số lượng card giảm dần trong mỗi nhóm
        Object.keys(teamStats).forEach(team => {
            teamStats[team].apps.sort((a, b) => b.totalCards - a.totalCards);
        });

        return teamStats;
    };

    // Tính toán số liệu cho tất cả TS
    const calculateAllTSStats = () => {
        const allMembers = [...GroupTS1, ...GroupTS2];
        const teamStats = calculateTeamStats();
        const totalCards = teamStats.TS1.totalCards + teamStats.TS2.totalCards;
        const totalPoints = teamStats.TS1.totalPoints + teamStats.TS2.totalPoints;
        const totalMembers = 7;

        return {
            totalMembers,
            totalCards,
            totalPoints,
            avgCardsPerMember: Math.round(totalCards / totalMembers),
            avgPointsPerMember: Math.round(totalPoints / totalMembers),
            members: allMembers
        };
    };

    // Hàm lọc thành viên dựa trên team size
    const getFilteredMembers = (team) => {
        const allMembers = team === 'TS1' ? GroupTS1 : GroupTS2;
        return teamSize === '5' ? allMembers.slice(0, 5) : allMembers;
    };

    // Tính toán số liệu cho từng thành viên trong nhóm
    const calculateMemberStats = (team) => {
        const members = getFilteredMembers(team);
        const totalMembers = members.length;
        const teamStats = calculateTeamStats();
        const teamData = teamStats[team];

        // Tính trung bình số card và points cho mỗi thành viên
        const avgCardsPerMember = Math.round(teamData.totalCards / totalMembers);
        const avgPointsPerMember = Math.round(teamData.totalPoints / totalMembers);

        return {
            totalMembers,
            avgCardsPerMember,
            avgPointsPerMember,
            members
        };
    };

    const monthlyTotals = {
        month1: calculateMonthlyTotals(data1),
        month2: calculateMonthlyTotals(data2),
        month3: calculateMonthlyTotals(data3),
        month4: calculateMonthlyTotals(data4),
        month5: calculateMonthlyTotals(data5)
    };

    const teamStats = calculateTeamStats();
    const ts1MemberStats = calculateMemberStats('TS1');
    const ts2MemberStats = calculateMemberStats('TS2');

    const allTSStats = calculateAllTSStats();

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Box sx={{ 
                padding: '2rem',
                background: 'linear-gradient(145deg, #f5f7fa 0%, #e4e8eb 100%)',
                minHeight: '100vh'
            }}>
                <Container maxWidth="xl">
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 4 
                    }}>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                color: '#1a237e',
                                fontWeight: 'bold',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            Thống kê theo nhóm TS
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Chọn tháng</InputLabel>
                                <Select
                                    value={selectedMonth}
                                    label="Chọn tháng"
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    <MenuItem value="all">Tất cả các tháng</MenuItem>
                                    <MenuItem value="1">Tháng 1</MenuItem>
                                    <MenuItem value="2">Tháng 2</MenuItem>
                                    <MenuItem value="3">Tháng 3</MenuItem>
                                    <MenuItem value="4">Tháng 4</MenuItem>
                                    <MenuItem value="5">Tháng 5</MenuItem>
                                </Select>
                            </FormControl>
                            <ToggleButtonGroup
                                value={teamSize}
                                exclusive
                                onChange={(e, newValue) => newValue && setTeamSize(newValue)}
                                aria-label="team size"
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        border: '1px solid rgba(0, 0, 0, 0.12)',
                                        '&.Mui-selected': {
                                            backgroundColor: '#1976d2',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: '#1565c0',
                                            },
                                        },
                                    },
                                }}
                            >
                                <ToggleButton value="5" aria-label="5 members">
                                    5 thành viên
                                </ToggleButton>
                                <ToggleButton value="6" aria-label="6 members">
                                    6 thành viên
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    </Box>

                    {/* Hiển thị tổng số card và KPI cho mỗi tháng */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {Object.entries(monthlyTotals).map(([month, totals], index) => (
                            <Grid item xs={12} sm={6} md={2.4} key={month}>
                                <Paper 
                                    elevation={3}
                                    sx={{ 
                                        p: 2,
                                        borderRadius: '15px',
                                        background: 'white',
                                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                        opacity: selectedMonth === 'all' || selectedMonth === String(index + 1) ? 1 : 0.5
                                    }}
                                >
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            mb: 2,
                                            color: '#1976d2',
                                            fontWeight: 'bold',
                                            textAlign: 'center'
                                        }}
                                    >
                                        Tháng {index + 1}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Chip 
                                            label={`${totals.totalCards} cards`}
                                            color="primary"
                                            sx={{ mb: 1 }}
                                        />
                                        <Chip 
                                            label={`${totals.totalPoints} points`}
                                            color="success"
                                        />
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Thống kê tổng hợp */}
                    <Paper 
                        elevation={3}
                        sx={{ 
                            p: 3,
                            borderRadius: '15px',
                            background: 'white',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            mb: 4
                        }}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mb: 3,
                            borderBottom: '2px solid #1976d2',
                            pb: 1
                        }}>
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    color: '#1976d2',
                                    fontWeight: 'bold'
                                }}
                            >
                                Thống kê hiện tại
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Chip 
                                    label={`${allTSStats.totalMembers} TS`}
                                    color="primary"
                                    sx={{ fontWeight: 'bold' }}
                                />
                                <Chip 
                                    label={`${allTSStats.totalCards} cards`}
                                    color="primary"
                                    variant="outlined"
                                />
                                <Chip 
                                    label={`${allTSStats.totalPoints} points`}
                                    color="success"
                                    variant="outlined"
                                />
                            </Box>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <Paper 
                                    elevation={1}
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%)'
                                    }}
                                >
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Số thành viên
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                                        {allTSStats.totalMembers}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper 
                                    elevation={1}
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(145deg, #e8f5e9 0%, #c8e6c9 100%)'
                                    }}
                                >
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Trung bình cards/người
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                        {allTSStats.avgCardsPerMember}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper 
                                    elevation={1}
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)'
                                    }}
                                >
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Trung bình points/người
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                                        {allTSStats.avgPointsPerMember}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Chia container thành 2 phần */}
                    <Grid container spacing={3}>
                        {/* Phần nội dung chi tiết */}
                        <Grid item xs={12}>
                            <Grid container spacing={3}>
                                {Object.entries(teamStats).map(([team, stats]) => {
                                    const memberStats = team === 'TS1' ? ts1MemberStats : ts2MemberStats;
                                    return (
                                        <Grid item xs={12} md={6} key={team}>
                                            <Paper 
                                                elevation={3}
                                                sx={{ 
                                                    p: 3,
                                                    borderRadius: '15px',
                                                    background: 'white',
                                                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                                    height: '100%'
                                                }}
                                            >
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    mb: 3,
                                                    borderBottom: '2px solid #1976d2',
                                                    pb: 1
                                                }}>
                                                    <Typography 
                                                        variant="h5" 
                                                        sx={{ 
                                                            color: '#1976d2',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {team}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                                        <Chip 
                                                            label={`${stats.apps.length} apps`}
                                                            color="primary"
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                        <Chip 
                                                            label={`${stats.totalCards} cards`}
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                        <Chip 
                                                            label={`${stats.totalPoints} points`}
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    </Box>
                                                </Box>

                                                {/* Thông tin về thành viên */}
                                                <Box sx={{ mb: 3 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                                                        Thông tin thành viên
                                                    </Typography>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={4}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 2, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="subtitle2" color="text.secondary">
                                                                    Số thành viên
                                                                </Typography>
                                                                <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                                                                    {memberStats.totalMembers}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                        <Grid item xs={12} sm={4}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 2, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #e8f5e9 0%, #c8e6c9 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="subtitle2" color="text.secondary">
                                                                    Trung bình cards/người
                                                                </Typography>
                                                                <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                                    {memberStats.avgCardsPerMember}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                        <Grid item xs={12} sm={4}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 2, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="subtitle2" color="text.secondary">
                                                                    Trung bình points/người
                                                                </Typography>
                                                                <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                                                                    {memberStats.avgPointsPerMember}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                    </Grid>
                                                </Box>

                                                {/* Danh sách thành viên */}
                                                <Box sx={{ mb: 3 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                                                        Danh sách thành viên
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        {memberStats.members.map((member, index) => (
                                                            <Grid item xs={12} sm={6} md={4} key={index}>
                                                                <Paper 
                                                                    elevation={1}
                                                                    sx={{ 
                                                                        p: 1.5,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 1,
                                                                        '&:hover': {
                                                                            backgroundColor: '#f5f5f5'
                                                                        }
                                                                    }}
                                                                >
                                                                    <Box sx={{ 
                                                                        width: 8, 
                                                                        height: 8, 
                                                                        borderRadius: '50%',
                                                                        backgroundColor: '#1976d2'
                                                                    }} />
                                                                    <Typography variant="body2">
                                                                        {member.fullName}
                                                                    </Typography>
                                                                </Paper>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                </Box>

                                                <Divider sx={{ my: 2 }} />

                                                {/* Bảng thống kê apps với drag and drop */}
                                                <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                                                    Thống kê theo App
                                                </Typography>
                                                <Droppable droppableId={team}>
                                                    {(provided) => (
                                                        <TableContainer
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                        >
                                                            <Table>
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>
                                                                            <Typography variant="h6" sx={{ color: '#555' }}>App</Typography>
                                                                        </TableCell>
                                                                        {selectedMonth === 'all' ? (
                                                                            <>
                                                                                <TableCell align="center">
                                                                                    <Typography variant="h6" sx={{ color: '#555' }}>Tháng 1</Typography>
                                                                                </TableCell>
                                                                                <TableCell align="center">
                                                                                    <Typography variant="h6" sx={{ color: '#555' }}>Tháng 2</Typography>
                                                                                </TableCell>
                                                                                <TableCell align="center">
                                                                                    <Typography variant="h6" sx={{ color: '#555' }}>Tháng 3</Typography>
                                                                                </TableCell>
                                                                                <TableCell align="center">
                                                                                    <Typography variant="h6" sx={{ color: '#555' }}>Tháng 4</Typography>
                                                                                </TableCell>
                                                                                <TableCell align="center">
                                                                                    <Typography variant="h6" sx={{ color: '#555' }}>Tháng 5</Typography>
                                                                                </TableCell>
                                                                            </>
                                                                        ) : (
                                                                            <TableCell align="center">
                                                                                <Typography variant="h6" sx={{ color: '#555' }}>
                                                                                    Tháng {selectedMonth}
                                                                                </Typography>
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell align="center">
                                                                            <Typography variant="h6" sx={{ color: '#555' }}>Tổng</Typography>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {stats.apps.map((app, index) => (
                                                                        <Draggable
                                                                            key={app.label}
                                                                            draggableId={app.label}
                                                                            index={index}
                                                                        >
                                                                            {(provided) => (
                                                                                <TableRow 
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    {...provided.dragHandleProps}
                                                                                    sx={{ 
                                                                                        '&:hover': { 
                                                                                            backgroundColor: '#f5f5f5',
                                                                                            transition: 'background-color 0.3s'
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <TableCell>
                                                                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                                                            {app.name}
                                                                                        </Typography>
                                                                                    </TableCell>
                                                                                    {selectedMonth === 'all' ? (
                                                                                        <>
                                                                                            <TableCell align="center">
                                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month1.totalCards}
                                                                                                        color="primary"
                                                                                                        size="small"
                                                                                                    />
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month1.totalPoints}
                                                                                                        color="success"
                                                                                                        size="small"
                                                                                                    />
                                                                                                </Box>
                                                                                            </TableCell>
                                                                                            <TableCell align="center">
                                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month2.totalCards}
                                                                                                        color="primary"
                                                                                                        size="small"
                                                                                                    />
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month2.totalPoints}
                                                                                                        color="success"
                                                                                                        size="small"
                                                                                                    />
                                                                                                </Box>
                                                                                            </TableCell>
                                                                                            <TableCell align="center">
                                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month3.totalCards}
                                                                                                        color="primary"
                                                                                                        size="small"
                                                                                                    />
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month3.totalPoints}
                                                                                                        color="success"
                                                                                                        size="small"
                                                                                                    />
                                                                                                </Box>
                                                                                            </TableCell>
                                                                                            <TableCell align="center">
                                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month4.totalCards}
                                                                                                        color="primary"
                                                                                                        size="small"
                                                                                                    />
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month4.totalPoints}
                                                                                                        color="success"
                                                                                                        size="small"
                                                                                                    />
                                                                                                </Box>
                                                                                            </TableCell>
                                                                                            <TableCell align="center">
                                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month5.totalCards}
                                                                                                        color="primary"
                                                                                                        size="small"
                                                                                                    />
                                                                                                    <Chip 
                                                                                                        label={app.monthlyData.month5.totalPoints}
                                                                                                        color="success"
                                                                                                        size="small"
                                                                                                    />
                                                                                                </Box>
                                                                                            </TableCell>
                                                                                        </>
                                                                                    ) : (
                                                                                        <TableCell align="center">
                                                                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                                <Chip 
                                                                                                    label={app.monthlyData[`month${selectedMonth}`].totalCards}
                                                                                                    color="primary"
                                                                                                    size="small"
                                                                                                />
                                                                                                <Chip 
                                                                                                    label={app.monthlyData[`month${selectedMonth}`].totalPoints}
                                                                                                    color="success"
                                                                                                    size="small"
                                                                                                />
                                                                                            </Box>
                                                                                        </TableCell>
                                                                                    )}
                                                                                    <TableCell align="center">
                                                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                            <Chip 
                                                                                                label={app.totalCards}
                                                                                                color="primary"
                                                                                                size="small"
                                                                                                sx={{ fontWeight: 'bold' }}
                                                                                            />
                                                                                            <Chip 
                                                                                                label={app.totalPoints}
                                                                                                color="success"
                                                                                                size="small"
                                                                                                sx={{ fontWeight: 'bold' }}
                                                                                            />
                                                                                        </Box>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    )}
                                                </Droppable>
                                            </Paper>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </DragDropContext>
    );
};

export default PlanTsTeam;