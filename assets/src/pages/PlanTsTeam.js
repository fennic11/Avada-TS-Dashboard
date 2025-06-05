import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, MenuItem, Divider, ToggleButton, ToggleButtonGroup, Autocomplete, TextField } from '@mui/material';
import GroupTS1 from '../data/GroupTS1.json';
import GroupTS2 from '../data/GroupTS2.json';
import data1 from '../data/data-1-2025.json';
import data2 from '../data/data-2-2025.json';
import data3 from '../data/data-3-2025.json';
import data4 from '../data/data-4-2025.json';
import data5 from '../data/data-5-2025.json';
import appData from '../data/app.json';
import ts1Schedule from '../data/ts1Schedule.json';
import ts2Schedule from '../data/ts2Schedule.json';

const PlanTsTeam = () => {
    const [selectedMonth, setSelectedMonth] = useState('5');
    const [teamSize, setTeamSize] = useState('5');
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

    // Thay thế shiftSchedule bằng data import
    const shiftScheduleTS1 = ts1Schedule.TS1;
    const shiftScheduleTS2 = ts2Schedule.TS2;

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

        // Tính trung bình cho mỗi thành viên
        const avgCardsPerMember = Math.round(teamData.totalCards / totalMembers);
        const avgPointsPerMember = Math.round(teamData.totalPoints / totalMembers);

        // Tính trung bình theo ngày và tuần cho mỗi thành viên
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const weeksInMonth = Math.ceil(daysInMonth / 7);

        // Tính trung bình mỗi ngày cho mỗi thành viên
        const avgCardsPerDay = Math.round(avgCardsPerMember / daysInMonth);
        const avgPointsPerDay = Math.round(avgPointsPerMember / daysInMonth);

        // Tính trung bình mỗi tuần cho mỗi thành viên
        const avgCardsPerWeek = Math.round(avgCardsPerMember / weeksInMonth);
        const avgPointsPerWeek = Math.round(avgPointsPerMember / weeksInMonth);

        return {
            totalMembers,
            avgCardsPerMember,
            avgPointsPerMember,
            avgCardsPerDay,
            avgPointsPerDay,
            avgCardsPerWeek,
            avgPointsPerWeek,
            members
        };
    };

    // Thêm hàm xử lý thay đổi ca trực
    const handleShiftChange = (team, day, shiftIndex, value) => {
        // This function is now empty as the shiftSchedule is read-only
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

    // Hàm tính số ca trực và tổng KPI cho từng người
    const shiftPoints = [460, 460, 136, 136, 164, 177];
    function calculateShiftStats(shiftSchedule, teamMembers) {
        // Tạo object lưu số ca và KPI cho từng người
        const stats = {};
        teamMembers.forEach(m => {
            stats[m.fullName] = { shifts: 0, kpi: 0 };
        });
        Object.entries(shiftSchedule).forEach(([day, shifts]) => {
            shifts.forEach((shiftArr, shiftIdx) => {
                shiftArr.forEach(person => {
                    if (person && stats[person]) {
                        stats[person].shifts += 1;
                        stats[person].kpi += shiftPoints[shiftIdx];
                    }
                });
            });
        });
        return stats;
    }

    return (
        <Container maxWidth="xl">
            <Box sx={{ 
                padding: '2rem',
                background: 'linear-gradient(145deg, #f5f7fa 0%, #e4e8eb 100%)',
                minHeight: '100vh'
            }}>
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
                                                
                                                {/* Tổng số thành viên */}
                                                <Box sx={{ mb: 2 }}>
                                                    <Paper 
                                                        elevation={1}
                                                        sx={{ 
                                                            p: 1.5, 
                                                            textAlign: 'center',
                                                            background: 'linear-gradient(145deg, #e3f2fd 0%, #bbdefb 100%)',
                                                            maxWidth: '200px'
                                                        }}
                                                    >
                                                        <Typography variant="subtitle2" color="text.secondary">
                                                            Số thành viên
                                                        </Typography>
                                                        <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                                                            {memberStats.totalMembers}
                                                        </Typography>
                                                    </Paper>
                                                </Box>

                                                {/* Thống kê theo ngày */}
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#1976d2' }}>
                                                        Thống kê theo ngày
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={6}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 1.5, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #e8f5e9 0%, #c8e6c9 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Trung bình cards/ngày
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                                    {memberStats.avgCardsPerDay}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                        <Grid item xs={6}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 1.5, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Trung bình points/ngày
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                                                                    {memberStats.avgPointsPerDay}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                    </Grid>
                                                </Box>

                                                {/* Thống kê theo tuần */}
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#1976d2' }}>
                                                        Thống kê theo tuần
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={6}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 1.5, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #e8f5e9 0%, #c8e6c9 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Trung bình cards/tuần
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                                    {memberStats.avgCardsPerWeek}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                        <Grid item xs={6}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 1.5, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Trung bình points/tuần
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                                                                    {memberStats.avgPointsPerWeek}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                    </Grid>
                                                </Box>

                                                {/* Thống kê theo tháng */}
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#1976d2' }}>
                                                        Thống kê theo tháng
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={6}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 1.5, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #e8f5e9 0%, #c8e6c9 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Trung bình cards/người
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                                    {memberStats.avgCardsPerMember}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                        <Grid item xs={6}>
                                                            <Paper 
                                                                elevation={1}
                                                                sx={{ 
                                                                    p: 1.5, 
                                                                    textAlign: 'center',
                                                                    background: 'linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)'
                                                                }}
                                                            >
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Trung bình points/người
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                                                                    {memberStats.avgPointsPerMember}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                    </Grid>
                                                </Box>
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

                                            {/* Bảng thống kê apps với drag and drop */}
                                            <Box sx={{ mb: 3 }}>
                                                <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                                                    Thống kê theo App
                                                </Typography>
                                                <TableContainer>
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
                                                                <TableRow key={app.label}>
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
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Grid>
                </Grid>
            </Box>

            {/* Đặt phần Thống kê ca trực & KPI và Lịch trực theo ca xuống cuối cùng */}
            <Box sx={{ mt: 4 }}>
                {/* Bảng thống kê số ca trực và KPI từng người */}
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
                    <Typography variant="h5" sx={{ mb: 3, color: '#1976d2', fontWeight: 'bold' }}>
                        Thống kê ca trực & KPI
                    </Typography>
                    <Grid container spacing={4}>
                        {/* TS1 */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>Team TS1</Typography>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Thành viên</TableCell>
                                            <TableCell align="center">Số ca trực (tháng)</TableCell>
                                            <TableCell align="center">KPI ca trực (tháng)</TableCell>
                                            <TableCell align="center">KPI Issue (tháng)</TableCell>
                                            <TableCell align="center">Tổng KPI</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {getFilteredMembers('TS1').map(member => {
                                            const stats = calculateShiftStats(shiftScheduleTS1, getFilteredMembers('TS1'))[member.fullName];
                                            const monthlyShifts = stats.shifts * 4;
                                            const monthlyKPI = stats.kpi * 4;
                                            const avgKPI = ts1MemberStats.avgPointsPerMember;
                                            const totalKPI = monthlyKPI + avgKPI;
                                            return (
                                                <TableRow key={member.fullName}>
                                                    <TableCell>{member.fullName}</TableCell>
                                                    <TableCell align="center">{monthlyShifts}</TableCell>
                                                    <TableCell align="center">{monthlyKPI}</TableCell>
                                                    <TableCell align="center">{avgKPI}</TableCell>
                                                    <TableCell align="center" style={{ fontWeight: 'bold' }}>{totalKPI}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                        {/* TS2 */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>Team TS2</Typography>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Thành viên</TableCell>
                                            <TableCell align="center">Số ca trực (tháng)</TableCell>
                                            <TableCell align="center">KPI ca trực (tháng)</TableCell>
                                            <TableCell align="center">KPI trung bình</TableCell>
                                            <TableCell align="center">Tổng KPI</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {getFilteredMembers('TS2').map(member => {
                                            const stats = calculateShiftStats(shiftScheduleTS2, getFilteredMembers('TS2'))[member.fullName];
                                            const monthlyShifts = stats.shifts * 4;
                                            const monthlyKPI = stats.kpi * 4;
                                            const avgKPI = ts2MemberStats.avgPointsPerMember;
                                            const totalKPI = monthlyKPI + avgKPI;
                                            return (
                                                <TableRow key={member.fullName}>
                                                    <TableCell>{member.fullName}</TableCell>
                                                    <TableCell align="center">{monthlyShifts}</TableCell>
                                                    <TableCell align="center">{monthlyKPI}</TableCell>
                                                    <TableCell align="center">{avgKPI}</TableCell>
                                                    <TableCell align="center" style={{ fontWeight: 'bold' }}>{totalKPI}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Bảng xếp ca trực - đặt ở cuối cùng */}
                <Paper 
                    elevation={3}
                    sx={{ 
                        p: 3,
                        borderRadius: '15px',
                        background: 'white',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                        mt: 4
                    }}
                >
                    <Typography variant="h5" sx={{ mb: 3, color: '#1976d2', fontWeight: 'bold' }}>
                        Lịch trực theo ca
                    </Typography>
                    
                    {/* Bảng ca trực TS1 */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                            Team TS1
                        </Typography>
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Ca</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Thời gian</TableCell>
                                        {shiftScheduleTS1 && Object.keys(shiftScheduleTS1).map(day => (
                                            <TableCell key={day} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                {day}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Ca 5', 'Ca 6'].map((ca, shiftIndex) => (
                                        <TableRow key={ca}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{ca}</TableCell>
                                            <TableCell>
                                                {[
                                                    '00:00 - 04:00',
                                                    '04:00 - 08:00',
                                                    '08:00 - 12:00',
                                                    '12:00 - 16:00',
                                                    '16:00 - 20:00',
                                                    '20:00 - 00:00'
                                                ][shiftIndex]}
                                            </TableCell>
                                            {shiftScheduleTS1 && Object.keys(shiftScheduleTS1).map(day => (
                                                <TableCell key={`${day}-${shiftIndex}`} align="center">
                                                    {shiftScheduleTS1[day][shiftIndex] && shiftScheduleTS1[day][shiftIndex].length > 0 ? (
                                                        <Box>
                                                            {shiftScheduleTS1[day][shiftIndex].map((person, idx) =>
                                                                person ? <Typography key={idx} variant="body2">{person}</Typography> : null
                                                            )}
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">-</Typography>
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    {/* Bảng ca trực TS2 */}
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: '#555' }}>
                            Team TS2
                        </Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Ca</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Thời gian</TableCell>
                                        {shiftScheduleTS2 && Object.keys(shiftScheduleTS2).map(day => (
                                            <TableCell key={day} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                                {day}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Ca 5', 'Ca 6'].map((ca, shiftIndex) => (
                                        <TableRow key={ca}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{ca}</TableCell>
                                            <TableCell>
                                                {[
                                                    '00:00 - 04:00',
                                                    '04:00 - 08:00',
                                                    '08:00 - 12:00',
                                                    '12:00 - 16:00',
                                                    '16:00 - 20:00',
                                                    '20:00 - 00:00'
                                                ][shiftIndex]}
                                            </TableCell>
                                            {shiftScheduleTS2 && Object.keys(shiftScheduleTS2).map(day => (
                                                <TableCell key={`${day}-${shiftIndex}`} align="center">
                                                    {shiftScheduleTS2[day][shiftIndex] && shiftScheduleTS2[day][shiftIndex].length > 0 ? (
                                                        <Box>
                                                            {shiftScheduleTS2[day][shiftIndex].map((person, idx) =>
                                                                person ? <Typography key={idx} variant="body2">{person}</Typography> : null
                                                            )}
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">-</Typography>
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default PlanTsTeam;