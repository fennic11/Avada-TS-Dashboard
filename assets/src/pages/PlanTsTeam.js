import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment } from '@mui/material';
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
    const [shiftRates, setShiftRates] = useState({
        'Ca 1': 460,
        'Ca 2': 460,
        'Ca 3': 136,
        'Ca 4': 136,
        'Ca 5': 164,
        'Ca 6': 177
    });
    const [issueRates, setIssueRates] = useState({
        'Level 0': 4,
        'Level 1': 8,
        'Level 2': 15,
        'Level 3': 30,
        'Level 4': 45
    });
    const [isRateConfigOpen, setIsRateConfigOpen] = useState(false);
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

    // Thêm hàm tính KPI dựa trên level
    const calculateLevelPoints = (levels) => {
        return Object.entries(levels).reduce((total, [level, count]) => {
            return total + (issueRates[level] || 0) * count;
        }, 0);
    };

    // Tính tổng số card và KPI cho mỗi tháng
    const calculateMonthlyTotals = (data) => {
        return data.reduce((acc, app) => ({
            totalCards: acc.totalCards + app.totalCards,
            totalPoints: acc.totalPoints + calculateLevelPoints(app.levels)
        }), { totalCards: 0, totalPoints: 0 });
    };

    // Tính tổng số card và KPI cho mỗi app qua tất cả các tháng
    const calculateAppTotals = () => {
        const allData = [...data1, ...data2, ...data3, ...data4, ...data5];
        const appTotals = {};

        allData.forEach(app => {
            if (!appTotals[app.app]) {
                appTotals[app.app] = { 
                    totalCards: 0, 
                    totalPoints: 0,
                    levels: {
                        'Level 0': 0,
                        'Level 1': 0,
                        'Level 2': 0,
                        'Level 3': 0,
                        'Level 4': 0
                    }
                };
            }
            appTotals[app.app].totalCards += app.totalCards;
            appTotals[app.app].totalPoints += calculateLevelPoints(app.levels);
            
            // Cập nhật số lượng card cho từng level
            Object.entries(app.levels).forEach(([level, count]) => {
                appTotals[app.app].levels[level] += count;
            });
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
                const appStats = appTotals[app.label_trello] || { 
                    totalCards: 0, 
                    totalPoints: 0,
                    levels: {
                        'Level 0': 0,
                        'Level 1': 0,
                        'Level 2': 0,
                        'Level 3': 0,
                        'Level 4': 0
                    }
                };
                
                // Lấy dữ liệu theo tháng cho app này
                const monthlyData = {
                    month1: data1.find(d => d.app === app.label_trello) || { totalCards: 0, levels: {} },
                    month2: data2.find(d => d.app === app.label_trello) || { totalCards: 0, levels: {} },
                    month3: data3.find(d => d.app === app.label_trello) || { totalCards: 0, levels: {} },
                    month4: data4.find(d => d.app === app.label_trello) || { totalCards: 0, levels: {} },
                    month5: data5.find(d => d.app === app.label_trello) || { totalCards: 0, levels: {} }
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
                    totalPoints = calculateLevelPoints(monthData.levels);
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

    // Thêm hàm xử lý thay đổi rate
    const handleShiftRateChange = (shift, value) => {
        setShiftRates(prev => ({
            ...prev,
            [shift]: Number(value)
        }));
    };

    const handleIssueRateChange = (level, value) => {
        setIssueRates(prev => ({
            ...prev,
            [level]: Number(value)
        }));
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

    // Cập nhật hàm calculateShiftStats để sử dụng shiftRates
    function calculateShiftStats(shiftSchedule, teamMembers) {
        const stats = {};
        teamMembers.forEach(m => {
            stats[m.fullName] = { shifts: 0, kpi: 0 };
        });
        Object.entries(shiftSchedule).forEach(([day, shifts]) => {
            shifts.forEach((shiftArr, shiftIdx) => {
                shiftArr.forEach(person => {
                    if (person && stats[person]) {
                        stats[person].shifts += 1;
                        const shiftName = `Ca ${shiftIdx + 1}`;
                        stats[person].kpi += shiftRates[shiftName];
                    }
                });
            });
        });
        return stats;
    }

    // Thêm XLSX library
    React.useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            // eslint-disable-next-line no-undef
            window.XLSX = XLSX;
        };
        document.head.appendChild(script);
        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    // Hàm export Excel
    const exportToExcel = () => {
        // eslint-disable-next-line no-undef
        if (typeof XLSX === 'undefined' && !window.XLSX) {
            alert('Đang tải thư viện Excel... Vui lòng thử lại sau vài giây.');
            return;
        }

        const ts1MemberStats = calculateMemberStats('TS1');
        const ts2MemberStats = calculateMemberStats('TS2');

        // Tạo workbook và worksheet
        const workbook = {
            SheetNames: ['Rate KPI', 'Thống kê ca trực', 'Lịch trực TS1', 'Lịch trực TS2'],
            Sheets: {}
        };

        // Sheet 1: Rate KPI
        const rateKpiData = [
            ['Rate ca trực'],
            ['Ca', 'Points'],
            ...Object.entries(shiftRates).map(([shift, rate]) => [shift, rate]),
            [''],
            ['Rate Issues'],
            ['Level', 'Points'],
            ...Object.entries(issueRates).map(([level, rate]) => [level, rate])
        ];

        workbook.Sheets['Rate KPI'] = {
            '!ref': `A1:B${rateKpiData.length}`,
            ...rateKpiData.reduce((acc, row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
                    acc[cellRef] = { v: cell };
                });
                return acc;
            }, {})
        };

        // Sheet 2: Thống kê ca trực
        const shiftStatsData = [
            ['Thống kê ca trực & KPI'],
            [''],
            ['Team TS1'],
            ['Thành viên', 'Số ca trực (tháng)', 'KPI ca trực (tháng)', 'KPI Issue (tháng)', 'Tổng KPI'],
            ...getFilteredMembers('TS1').map(member => {
                const stats = calculateShiftStats(shiftScheduleTS1, getFilteredMembers('TS1'))[member.fullName];
                const monthlyShifts = stats.shifts * 4;
                const monthlyKPI = stats.kpi * 4;
                const avgKPI = ts1MemberStats.avgPointsPerMember;
                const totalKPI = monthlyKPI + avgKPI;
                return [member.fullName, monthlyShifts, monthlyKPI, avgKPI, totalKPI];
            }),
            [''],
            ['Team TS2'],
            ['Thành viên', 'Số ca trực (tháng)', 'KPI ca trực (tháng)', 'KPI Issue (tháng)', 'Tổng KPI'],
            ...getFilteredMembers('TS2').map(member => {
                const stats = calculateShiftStats(shiftScheduleTS2, getFilteredMembers('TS2'))[member.fullName];
                const monthlyShifts = stats.shifts * 4;
                const monthlyKPI = stats.kpi * 4;
                const avgKPI = ts2MemberStats.avgPointsPerMember;
                const totalKPI = monthlyKPI + avgKPI;
                return [member.fullName, monthlyShifts, monthlyKPI, avgKPI, totalKPI];
            })
        ];

        workbook.Sheets['Thống kê ca trực'] = {
            '!ref': `A1:E${shiftStatsData.length}`,
            ...shiftStatsData.reduce((acc, row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
                    acc[cellRef] = { v: cell };
                });
                return acc;
            }, {})
        };

        // Sheet 3: Lịch trực TS1
        const ts1ScheduleData = [
            ['Lịch trực TS1'],
            [''],
            ['Ca', 'Thời gian', ...Object.keys(shiftScheduleTS1 || {})],
            ...['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Ca 5', 'Ca 6'].map((ca, shiftIndex) => {
                const timeSlots = [
                    '00:00 - 04:00',
                    '04:00 - 08:00',
                    '08:00 - 12:00',
                    '12:00 - 16:00',
                    '16:00 - 20:00',
                    '20:00 - 00:00'
                ];
                const row = [ca, timeSlots[shiftIndex]];
                
                if (shiftScheduleTS1) {
                    Object.keys(shiftScheduleTS1).forEach(day => {
                        const people = shiftScheduleTS1[day][shiftIndex];
                        row.push(people && people.length > 0 ? people.join(', ') : '-');
                    });
                }
                
                return row;
            })
        ];

        workbook.Sheets['Lịch trực TS1'] = {
            '!ref': `A1:${String.fromCharCode(65 + (Object.keys(shiftScheduleTS1 || {}).length + 1))}${ts1ScheduleData.length}`,
            ...ts1ScheduleData.reduce((acc, row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
                    acc[cellRef] = { v: cell };
                });
                return acc;
            }, {})
        };

        // Sheet 4: Lịch trực TS2
        const ts2ScheduleData = [
            ['Lịch trực TS2'],
            [''],
            ['Ca', 'Thời gian', ...Object.keys(shiftScheduleTS2 || {})],
            ...['Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Ca 5', 'Ca 6'].map((ca, shiftIndex) => {
                const timeSlots = [
                    '00:00 - 04:00',
                    '04:00 - 08:00',
                    '08:00 - 12:00',
                    '12:00 - 16:00',
                    '16:00 - 20:00',
                    '20:00 - 00:00'
                ];
                const row = [ca, timeSlots[shiftIndex]];
                
                if (shiftScheduleTS2) {
                    Object.keys(shiftScheduleTS2).forEach(day => {
                        const people = shiftScheduleTS2[day][shiftIndex];
                        row.push(people && people.length > 0 ? people.join(', ') : '-');
                    });
                }
                
                return row;
            })
        ];

        workbook.Sheets['Lịch trực TS2'] = {
            '!ref': `A1:${String.fromCharCode(65 + (Object.keys(shiftScheduleTS2 || {}).length + 1))}${ts2ScheduleData.length}`,
            ...ts2ScheduleData.reduce((acc, row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    const cellRef = String.fromCharCode(65 + colIndex) + (rowIndex + 1);
                    acc[cellRef] = { v: cell };
                });
                return acc;
            }, {})
        };

        // Tạo file và download
        // eslint-disable-next-line no-undef
        const xlsxLib = window.XLSX || XLSX;
        const wbout = xlsxLib.write(workbook, { bookType: 'xlsx', type: 'binary' });
        const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PlanTS_Team_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    // Helper function để convert string sang ArrayBuffer
    const s2ab = (s) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    };

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
                        <Button
                            variant="contained"
                            color="success"
                            onClick={exportToExcel}
                            sx={{ mr: 2 }}
                        >
                            Export Excel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => setIsRateConfigOpen(true)}
                            sx={{ mr: 2 }}
                        >
                            Cấu hình Rate
                        </Button>
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
                        >
                            <ToggleButton value="5">5 thành viên</ToggleButton>
                            <ToggleButton value="6">6 thành viên</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>

                {/* Dialog cấu hình Rate */}
                <Dialog
                    open={isRateConfigOpen}
                    onClose={() => setIsRateConfigOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Cấu hình Rate
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                                Rate ca trực
                            </Typography>
                            <Grid container spacing={2}>
                                {Object.entries(shiftRates).map(([shift, rate]) => (
                                    <Grid item xs={12} sm={6} md={4} key={shift}>
                                        <TextField
                                            label={shift}
                                            type="number"
                                            value={rate}
                                            onChange={(e) => handleShiftRateChange(shift, e.target.value)}
                                            fullWidth
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">Points</InputAdornment>,
                                            }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                                Rate Issues
                            </Typography>
                            <Grid container spacing={2}>
                                {Object.entries(issueRates).map(([level, rate]) => (
                                    <Grid item xs={12} sm={6} md={4} key={level}>
                                        <TextField
                                            label={level}
                                            type="number"
                                            value={rate}
                                            onChange={(e) => handleIssueRateChange(level, e.target.value)}
                                            fullWidth
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">Points</InputAdornment>,
                                            }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsRateConfigOpen(false)}>Đóng</Button>
                    </DialogActions>
                </Dialog>

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