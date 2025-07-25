// File: ResolutionTimeList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { getResolutionTimes } from "../../api/cardsApi";
import members from "../../data/members.json";
import {
    Table, TableHead, TableBody, TableRow, TableCell,
    Typography, Paper, CircularProgress, Box, Grid, TextField, MenuItem, Button, Chip, Link, Tooltip
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Legend, ResponsiveContainer, AreaChart, Area, LabelList } from "recharts";
import { format } from "date-fns";
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import CardDetailModal from '../CardDetailModal';
import KeyMetricsBoxCharts from '../Chart/BoxChart';
import HeatmapOfWeek from '../Heatmap/HeatmapOfWeek';


const memberMap = members.reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
}, {});

const memberIds = members.map((m) => m.id);

const TIME_GROUPS = [
    { label: "<1h", min: 0, max: 60 },
    { label: "1–4h", min: 60, max: 240 },
    { label: "4–8h", min: 240, max: 480 },
    { label: "8–12h", min: 480, max: 720 },
    { label: "12–24h", min: 720, max: 1440 },
    { label: ">24h", min: 1440, max: Infinity },
];

function formatMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

function safeFormatDate(dateValue) {
    try {
        const date = dateValue instanceof Date
            ? dateValue
            : dateValue?.toDate
                ? dateValue.toDate()
                : new Date(dateValue);
        if (isNaN(date)) return "—";
        return format(date, "dd/MM/yyyy HH:mm");
    } catch {
        return "—";
    }
}

function groupTimes(cards, field) {
    return TIME_GROUPS.map(group => {
        const count = cards.filter(card => {
            const value = Number(card[field]);
            return !isNaN(value) && value >= group.min && value < group.max;
        }).length;
        return { name: group.label, count };
    });
}

function averageTime(cards, field) {
    const values = cards.map(c => Number(c[field])).filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) return null;
    const total = values.reduce((a, b) => a + b, 0);
    return total / values.length;
}

function groupAverageByDate(cards, field) {
    const map = new Map();

    cards.forEach(card => {
        const value = Number(card[field]);
        if (isNaN(value)) return;

        const date = format(new Date(card.createdAt), "yyyy-MM-dd");

        if (!map.has(date)) map.set(date, { total: 0, count: 0 });

        map.get(date).total += value;
        map.get(date).count += 1;
    });

    return Array.from(map.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([date, { total, count }]) => ({
            date,
            average: count > 0 ? Math.round(total / count) : 0
        }));
}

function groupByShift(cards, field) {
    const shiftMap = new Map();
    
    cards.forEach(card => {
        const value = Number(card[field]);
        if (isNaN(value)) return;

        const createdAt = new Date(card.createdAt);
        const hour = createdAt.getHours();
        
        // Determine shift based on hour
        let shift;
        if (hour >= 0 && hour < 4) shift = "Ca 1";
        else if (hour >= 4 && hour < 8) shift = "Ca 2";
        else if (hour >= 8 && hour < 12) shift = "Ca 3";
        else if (hour >= 12 && hour < 16) shift = "Ca 4";
        else if (hour >= 16 && hour < 20) shift = "Ca 5";
        else shift = "Ca 6";

        if (!shiftMap.has(shift)) {
            shiftMap.set(shift, { total: 0, count: 0 });
        }

        // Convert minutes to hours
        shiftMap.get(shift).total += value / 60;
        shiftMap.get(shift).count += 1;
    });

    return Array.from(shiftMap.entries())
        .map(([shift, { total, count }]) => ({
            shift,
            average: count > 0 ? Math.round(total / count * 10) / 10 : 0, // Round to 1 decimal place
            count
        }))
        .sort((a, b) => {
            const shiftOrder = {
                "Ca 1": 1,
                "Ca 2": 2,
                "Ca 3": 3,
                "Ca 4": 4,
                "Ca 5": 5,
                "Ca 6": 6
            };
            return shiftOrder[a.shift] - shiftOrder[b.shift];
        });
}

function groupByTimeAndCount(cards, field, groupBy) {
    const timeMap = new Map();
    const countMap = new Map();

    // Initialize maps for all TS members
    members
        .filter(member => member.role === 'TS' || member.role === 'ts-lead')
        .forEach(member => {
            timeMap.set(member.fullName, 0);
            countMap.set(member.fullName, 0);
        });

    cards.forEach(card => {
        const value = Number(card[field]);
        if (isNaN(value)) return;

        const keys = groupBy === "member"
            ? card.members?.filter(id => {
                const member = members.find(m => m.id === id);
                return member && member.role === 'TS';
            })
            : card.labels?.filter(l => l.startsWith("App:"));

        if (!keys || keys.length === 0) return;

        const isMember = groupBy === "member";
        const portion = isMember ? value / keys.length : value;

        const unique = new Set();

        keys.forEach(k => {
            const name = isMember ? members.find(m => m.id === k)?.fullName : k;
            if (!name) return;

            // Tổng thời gian
            if (!timeMap.has(name)) timeMap.set(name, 0);
            timeMap.set(name, timeMap.get(name) + portion / 60); // phút → giờ

            // Tổng số lượng card (mỗi card tính 1 lần)
            if (!unique.has(name)) {
                countMap.set(name, (countMap.get(name) || 0) + 1);
                unique.add(name);
            }
        });
    });

    const result = Array.from(timeMap.entries())
        .map(([name, time]) => ({
            name,
            time: Math.round(time * 10) / 10,
            count: countMap.get(name) || 0,
        }))
        .filter(item => item.count > 0); // Only show members with cards

    return result;
}

function calculateAgentLeaderboard(cards) {
    const agentStats = new Map();

    // Initialize stats for all TS members
    members
        .filter(member => member.role === 'TS')
        .forEach(member => {
            agentStats.set(member.id, {
                name: member.fullName,
                totalTime: 0,
                cardCount: 0,
                averageTime: 0,
                resolutionTime: 0,
                firstActionTime: 0,
                resolutionTimeTS: 0
            });
        });

    // Calculate stats for each card
    cards.forEach(card => {
        if (!card.members || !card.resolutionTime) return;

        card.members.forEach(memberId => {
            const member = members.find(m => m.id === memberId);
            if (!member || member.role !== 'TS') return;

            const stats = agentStats.get(memberId);
            if (!stats) return;

            stats.totalTime += card.resolutionTime || 0;
            stats.cardCount += 1;
            stats.resolutionTime += card.resolutionTime || 0;
            stats.firstActionTime += card.firstActionTime || 0;
            stats.resolutionTimeTS += card.resolutionTimeTS || 0;
        });
    });

    // Calculate averages and filter out members with no cards
    return Array.from(agentStats.values())
        .map(stats => ({
            ...stats,
            averageTime: stats.cardCount > 0 ? stats.totalTime / stats.cardCount : 0,
            avgResolutionTime: stats.cardCount > 0 ? stats.resolutionTime / stats.cardCount : 0,
            avgFirstActionTime: stats.cardCount > 0 ? stats.firstActionTime / stats.cardCount : 0,
            avgResolutionTimeTS: stats.cardCount > 0 ? stats.resolutionTimeTS / stats.cardCount : 0
        }))
        .filter(stats => stats.cardCount > 0)
        .sort((a, b) => a.averageTime - b.averageTime);
}

// Helper: Get weekday index (0=Sun, 1=Mon, ..., 6=Sat)
function getWeekdayIdx(date) {
    const d = new Date(date);
    return d.getDay();
}

// Helper: Get hour (0-23)
function getHour(date) {
    return new Date(date).getHours();
}

// Tạo heatmap: 7 ngày x 24 giờ, mỗi ô là { total, count }
function getResolutionTimeHeatmap(cards, field = 'resolutionTime') {
    // 0=Sun, 1=Mon, ..., 6=Sat
    const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ total: 0, count: 0 })));
    cards.forEach(card => {
        const value = Number(card[field]);
        if (isNaN(value) || value <= 0) return;
        const date = card.createdAt;
        const weekday = getWeekdayIdx(date);
        const hour = getHour(date);
        heatmap[weekday][hour].total += value;
        heatmap[weekday][hour].count += 1;
    });
    return heatmap;
}

// Helper: Weekday labels (bắt đầu từ Monday)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper: Lấy index weekday (0=Mon, 6=Sun) từ Date
function getWeekdayIdxMondayFirst(date) {
    // JS getDay: 0=Sun, 1=Mon,...,6=Sat => 0=Mon, ..., 6=Sun
    const jsIdx = new Date(date).getDay();
    return [1,2,3,4,5,6,0].indexOf(jsIdx);
}

// Chuyển đổi heatmap để render: luôn bắt đầu từ Monday
function reorderHeatmap(heatmap) {
    // heatmap: 0=Sun, 1=Mon, ..., 6=Sat
    // Trả về: [Mon, Tue, ..., Sun]
    return [1,2,3,4,5,6,0].map(idx => heatmap[idx]);
}

// Component: ResolutionTimeHeatmap
function ResolutionTimeHeatmap({ cards, field = 'resolutionTime', onCellClick, heatmapFilter }) {
    const getTitle = () => {
        switch(field) {
            case 'firstActionTime':
                return 'First Action Time Heatmap';
            case 'resolutionTimeTS':
                return 'TS Done Issues Time Heatmap';
            default:
                return 'Resolution Time Heatmap';
        }
    };
    const heatmap = reorderHeatmap(getResolutionTimeHeatmap(cards, field));
    // Tìm max trung bình để scale màu
    let maxAvg = 0;
    heatmap.forEach(row => row.forEach(cell => {
        if (cell.count > 0) {
            const avg = cell.total / cell.count;
            if (avg > maxAvg) maxAvg = avg;
        }
    }));
    // Hàm tính màu theo avg
    function getCellColor(avg) {
        if (!avg) return '#f1f5f9'; // gray-100
        const hours = avg / 60;
        if (hours < 1) {
            // Xanh lá cây tươi
            return '#4ade80'; // green-400
        } else if (hours < 4) {
            // Xanh nước biển tươi
            const percent = (hours - 1) / 3;
            // Interpolate giữa #38bdf8 (blue-400) và #1d4ed8 (blue-700)
            const r = Math.round(56 + (29 - 56) * percent);
            const g = Math.round(189 + (78 - 189) * percent);
            const b = Math.round(248 + (216 - 248) * percent);
            return `rgb(${r},${g},${b})`;
        } else if (hours < 8) {
            // Vàng tươi
            const percent = (hours - 4) / 4;
            // #fde047 (yellow-300) -> #fbbf24 (yellow-400)
            const r = Math.round(253 + (251 - 253) * percent);
            const g = Math.round(224 + (191 - 224) * percent);
            const b = Math.round(71 + (36 - 71) * percent);
            return `rgb(${r},${g},${b})`;
        } else {
            // Đỏ tươi
            const percent = Math.min((hours - 8) / 8, 1);
            // #f87171 (red-400) -> #b91c1c (red-800)
            const r = Math.round(248 + (185 - 248) * percent);
            const g = Math.round(113 + (28 - 113) * percent);
            const b = Math.round(113 + (28 - 113) * percent);
            return `rgb(${r},${g},${b})`;
        }
    }
    return (
        <Paper
            sx={{
                p: 3,
                mb: 4,
                width: '100%',
                maxWidth: '100vw',
                minWidth: 0,
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                overflowX: 'auto',
                boxSizing: 'border-box',
            }}
        >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#1e293b', textAlign: 'left', fontSize: 22 }}>
                {getTitle()}
            </Typography>
            {/* Chú thích màu heatmap */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, ml: 1 }}>
                <Box sx={{ width: 28, height: 20, borderRadius: 1, background: '#bbf7d0', border: '1.5px solid #cbd5e1', mr: 1 }} />
                <Typography sx={{ fontSize: 15, color: '#334155', mr: 2 }}>&lt; 1h</Typography>
                <Box sx={{ width: 28, height: 20, borderRadius: 1, background: '#bae6fd', border: '1.5px solid #cbd5e1', mr: 1 }} />
                <Typography sx={{ fontSize: 15, color: '#334155', mr: 2 }}>1-4h</Typography>
                <Box sx={{ width: 28, height: 20, borderRadius: 1, background: '#fde68a', border: '1.5px solid #cbd5e1', mr: 1 }} />
                <Typography sx={{ fontSize: 15, color: '#334155', mr: 2 }}>4-8h</Typography>
                <Box sx={{ width: 28, height: 20, borderRadius: 1, background: '#fca5a5', border: '1.5px solid #cbd5e1', mr: 1 }} />
                <Typography sx={{ fontSize: 15, color: '#334155' }}>&gt; 8h</Typography>
            </Box>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, mx: 'auto' }}>
                {/* Header row: 0h-23h */}
                <Box sx={{ display: 'flex', columnGap: 1 }}>
                    <Box sx={{ width: 48 }} />
                    {Array.from({ length: 24 }).map((_, h) => (
                        <Box key={h} sx={{ width: 48, textAlign: 'center', fontSize: 16, color: '#64748b' }}>{h}h</Box>
                    ))}
                    {/* Thêm header AVG */}
                    <Box sx={{ width: 48, textAlign: 'center', fontSize: 16, color: '#64748b', fontWeight: 700 }}>AVG</Box>
                </Box>
                {/* Rows: Mon-Sun */}
                {heatmap.map((row, i) => {
                    // Tính avg của cả ngày
                    const total = row.reduce((sum, cell) => sum + cell.total, 0);
                    const count = row.reduce((sum, cell) => sum + cell.count, 0);
                    const avgDay = count > 0 ? total / count : 0;
                    const avgDayHour = avgDay / 60;
                    return (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', columnGap: 1 }}>
                            <Box sx={{ width: 48, textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 16 }}>
                                {WEEKDAYS[i]}
                            </Box>
                            {row.map((cell, h) => {
                                const avg = cell.count > 0 ? cell.total / cell.count : 0;
                                const avgHour = avg / 60;
                                const isActive = heatmapFilter && heatmapFilter.weekday === i && heatmapFilter.hour === h;
                                return (
                                    <Tooltip key={h} title={cell.count > 0 ? `${avgHour.toFixed(1)}h\n${cell.count} cards` : 'No data'} arrow
                                        slotProps={{ tooltip: { sx: { fontSize: 15, px: 2, py: 1 } } }}>
                                        <Box
                                            sx={{
                                                width: 48, height: 48, borderRadius: 2,
                                                background: getCellColor(avg),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 15, fontWeight: 700,
                                                color: '#fff',
                                                cursor: cell.count > 0 ? 'pointer' : 'default',
                                                border: isActive ? '3px solid #6366f1' : '1.5px solid #cbd5e1',
                                                boxShadow: isActive ? '0 0 0 2px #6366f155' : 'none',
                                                transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                                '&:hover': cell.count > 0 ? {
                                                    border: '3px solid #6366f1',
                                                    boxShadow: '0 2px 8px 0 #6366f133',
                                                    transform: 'scale(1.08)',
                                                    zIndex: 2,
                                                } : {},
                                            }}
                                            onClick={() => cell.count > 0 && onCellClick && onCellClick({ weekday: i, hour: h })}
                                        >
                                            {cell.count > 0 ? (avgHour < 1 ? `${Math.round(avg)}p` : `${avgHour.toFixed(1)}h`) : ''}
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                            {/* AVG column */}
                            <Tooltip title={count > 0 ? `AVG: ${avgDayHour.toFixed(1)}h\nTổng cards: ${count}` : 'No data'} arrow
                                slotProps={{ tooltip: { sx: { fontSize: 15, px: 2, py: 1 } } }}>
                                <Box
                                    sx={{
                                        width: 48, height: 48, borderRadius: 2,
                                        background: getCellColor(avgDay),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, fontWeight: 700,
                                        color: '#fff',
                                        border: heatmapFilter && heatmapFilter.weekday === i && heatmapFilter.avg ? '3px solid #6366f1' : '2px solid #6366f1',
                                        boxShadow: heatmapFilter && heatmapFilter.weekday === i && heatmapFilter.avg ? '0 0 0 2px #6366f155' : 'none',
                                        transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? {
                                            border: '3px solid #6366f1',
                                            boxShadow: '0 2px 8px 0 #6366f133',
                                            transform: 'scale(1.08)',
                                            zIndex: 2,
                                        } : {},
                                    }}
                                    onClick={() => count > 0 && onCellClick && onCellClick({ weekday: i, avg: true })}
                                >
                                    {count > 0 ? avgDayHour.toFixed(1) : ''}
                                </Box>
                            </Tooltip>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}

const ResolutionTimeList = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [selectedCard, setSelectedCard] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const [selectedApp, setSelectedApp] = useState("");
    const [selectedMember, setSelectedMember] = useState("");
    const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [chartFilter, setChartFilter] = useState({ field: null, range: null });
    const [heatmapFilter, setHeatmapFilter] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const results = await getResolutionTimes(startDate, endDate);
            const validCards = results.filter(card =>
                !isNaN(Number(card.resolutionTime)) &&
                Number(card.resolutionTime) > 0 &&
                card.members?.some(id => memberIds.includes(id))
            );
            setData(validCards);
        } catch (err) {
            console.error("❌ Lỗi xử lý dữ liệu:", err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // Initial data fetch
    useEffect(() => {
        if (isInitialLoad) {
            fetchData();
            setIsInitialLoad(false);
        }
    }, [isInitialLoad, fetchData]);

    // Update filtered data when filters change
    useEffect(() => {
        let filtered = data.filter((card) => {
            const hasApp = selectedApp ? card.labels?.some(l => l === selectedApp) : true;
            const hasMember = selectedMember ? card.members?.includes(selectedMember) : true;
            const chartMatch = chartFilter.field
                ? (() => {
                    if (chartFilter.field === 'createdAt') {
                        const createdAt = new Date(card.createdAt);
                        const hour = createdAt.getHours();
                        return hour >= chartFilter.range.min && hour < chartFilter.range.max;
                    }
                    return Number(card[chartFilter.field]) >= chartFilter.range.min && 
                           Number(card[chartFilter.field]) < chartFilter.range.max;
                })()
                : true;
            return hasApp && hasMember && chartMatch;
        });

        // Filter out cards that don't have any TS members
        filtered = filtered.filter(card => 
            !selectedMember ? true : card.members?.some(id => {
                const member = members.find(m => m.id === id);
                return member && member.role === 'TS';
            })
        );

        // Filter theo heatmap nếu có
        if (heatmapFilter) {
            filtered = filtered.filter(card => {
                const weekday = getWeekdayIdxMondayFirst(card.createdAt);
                if (heatmapFilter.avg) {
                    // Lọc theo cả ngày
                    return weekday === heatmapFilter.weekday;
                } else {
                    const hour = new Date(card.createdAt).getHours();
                    return weekday === heatmapFilter.weekday && hour === heatmapFilter.hour;
                }
            });
        }

        setFilteredData(filtered);
    }, [data, selectedApp, selectedMember, chartFilter, heatmapFilter]);

    // Handle manual data fetch
    const handleFetchData = () => {
        fetchData();
    };

    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = Number(a[sortConfig.key]);
        const bValue = Number(b[sortConfig.key]);
        if (isNaN(aValue) || isNaN(bValue)) return 0;
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
        }));
    };

    const appOptions = [...new Set(data.flatMap(card => card.labels?.filter(l => l.startsWith("App:"))))];

    const chartsData = {
        resolutionTime: groupTimes(filteredData, "resolutionTime"),
        firstActionTime: groupTimes(filteredData, "firstActionTime"),
        resolutionTimeTS: groupTimes(filteredData, "resolutionTimeTS")
    };

    const averages = {
        resolutionTime: averageTime(filteredData, "resolutionTime"),
        firstActionTime: averageTime(filteredData, "firstActionTime"),
        resolutionTimeTS: averageTime(filteredData, "resolutionTimeTS")
    };

    const avgCharts = {
        resolutionTime: groupAverageByDate(filteredData, "resolutionTime"),
        firstActionTime: groupAverageByDate(filteredData, "firstActionTime"),
        resolutionTimeTS: groupAverageByDate(filteredData, "resolutionTimeTS")
    };

    const timeAndCountData = {
        member: {
            resolutionTime: groupByTimeAndCount(filteredData, "resolutionTime", "member"),
            firstActionTime: groupByTimeAndCount(filteredData, "firstActionTime", "member"),
            resolutionTimeTS: groupByTimeAndCount(filteredData, "resolutionTimeTS", "member"),
        },
        app: {
            resolutionTime: groupByTimeAndCount(filteredData, "resolutionTime", "app"),
            firstActionTime: groupByTimeAndCount(filteredData, "firstActionTime", "app"),
            resolutionTimeTS: groupByTimeAndCount(filteredData, "resolutionTimeTS", "app"),
        }
    };

    const shiftData = {
        resolutionTime: groupByShift(filteredData, "resolutionTime"),
        firstActionTime: groupByShift(filteredData, "firstActionTime"),
        resolutionTimeTS: groupByShift(filteredData, "resolutionTimeTS")
    };

    const CHART_TITLES = {
        resolutionTime: "Resolution Time",
        firstActionTime: "First Action Time",
        resolutionTimeTS: "TS Done Issues Time"
    };

    const handleRowClick = (card) => {
        setSelectedCard(card.cardId);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedCard(null);
    };

    return (
        <Paper 
            sx={{ 
                padding: 4,
                background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}
        >
            <Typography 
                variant="h3" 
                gutterBottom
                sx={{
                    color: '#1e293b',
                    fontWeight: 700,
                    mb: 4,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    textAlign: { xs: 'center', md: 'left' }
                }}
            >
                Overview
            </Typography>


            {/* Filters Section */}
            <Paper 
                sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    mb: 4,
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: { xs: 2, sm: 3 }
                }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: '#1e293b',
                            fontWeight: 600,
                            fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}
                    >
                        Filters
                    </Typography>
                </Box>
                <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            select 
                            fullWidth 
                            label="App"
                            value={selectedApp} 
                            onChange={e => setSelectedApp(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover fieldset': {
                                        borderColor: '#3b82f6'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#64748b'
                                },
                                '& .MuiSelect-select': {
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }
                            }}
                        >
                            <MenuItem value="">All Apps</MenuItem>
                            {appOptions.map(app => (
                                <MenuItem key={app} value={app}>{app}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            select 
                            fullWidth 
                            label="Members"
                            value={selectedMember} 
                            onChange={e => setSelectedMember(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover fieldset': {
                                        borderColor: '#3b82f6'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#64748b'
                                },
                                '& .MuiSelect-select': {
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }
                            }}
                        >
                            <MenuItem value="">All Members</MenuItem>
                            {[...new Map(members
                                .filter(member => member.role === 'TS')
                                .map(m => [m.id, m])).values()]
                                .sort((a, b) => a.fullName.localeCompare(b.fullName))
                                .map(m => (
                                    <MenuItem 
                                        key={m.id} 
                                        value={m.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            minHeight: '48px'
                                        }}
                                    >
                                        <Typography sx={{ 
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#1e293b',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            flex: 1
                                        }}>
                                            {m.fullName}
                                        </Typography>
                                    </MenuItem>
                                ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            type="date" 
                            label="From Date" 
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover fieldset': {
                                        borderColor: '#3b82f6'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#64748b'
                                },
                                '& .MuiInputBase-input': {
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            type="date" 
                            label="To Date" 
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover fieldset': {
                                        borderColor: '#3b82f6'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: '#64748b'
                                },
                                '& .MuiInputBase-input': {
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={12} md={2}>
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1, 
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                            mt: { xs: 1, sm: 0 }
                        }}>
                            {chartFilter.field && (
                                <Button 
                                    variant="outlined" 
                                    color="error"
                                    onClick={() => setChartFilter({ field: null, range: null })}
                                    startIcon={<ClearIcon />}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        borderColor: '#ef4444',
                                        color: '#ef4444',
                                        minWidth: '100px',
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                        '&:hover': {
                                            borderColor: '#dc2626',
                                            backgroundColor: '#fef2f2'
                                        }
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                onClick={handleFetchData}
                                startIcon={<RefreshIcon />}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1,
                                    px: 2,
                                    minWidth: '120px',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)'
                                    },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Get Data
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px'
                }}>
                    <CircularProgress 
                        sx={{ 
                            color: '#3b82f6',
                            width: '60px !important',
                            height: '60px !important'
                        }} 
                    />
                </Box>
            ) : (
                <>
                    {/* Key Metrics */}
                    <KeyMetricsBoxCharts
                        chartsData={chartsData}
                        averages={averages}
                        setChartFilter={setChartFilter}
                        TIME_GROUPS={TIME_GROUPS}
                        formatMinutes={formatMinutes}
                        CHART_TITLES={CHART_TITLES}
                    />
                    {/* HEATMAP HERE */}
                    <HeatmapOfWeek
                        cards={filteredData}
                        field="resolutionTime"
                        onCellClick={setHeatmapFilter}
                        heatmapFilter={heatmapFilter}
                    />
                    
                    {/* First Action Time Heatmap */}
                    <ResolutionTimeHeatmap 
                        cards={filteredData} 
                        field="firstActionTime" 
                        onCellClick={setHeatmapFilter}
                        heatmapFilter={heatmapFilter}
                    />
                    
                    {/* TS Done Issues Time Heatmap */}
                    <ResolutionTimeHeatmap 
                        cards={filteredData} 
                        field="resolutionTimeTS" 
                        onCellClick={setHeatmapFilter}
                        heatmapFilter={heatmapFilter}
                    />
                    {/* Filter chip */}
                    {heatmapFilter && (
                        <Box sx={{ mb: 2 }}>
                            <Chip 
                                label={heatmapFilter.avg
                                    ? `Filter: ${WEEKDAYS[heatmapFilter.weekday]} (AVG)`
                                    : `Filter: ${WEEKDAYS[heatmapFilter.weekday]} - ${heatmapFilter.hour}h`}
                                color="primary"
                                onDelete={() => setHeatmapFilter(null)}
                                sx={{ fontWeight: 600, fontSize: 15 }}
                            />
                        </Box>
                    )}
                    {/* Shift Analysis Charts */}
                    <Grid container spacing={3} sx={{ mb: 4, mt: 10 }}>
                        {Object.entries(shiftData).map(([key, data]) => (
                            <Grid item xs={12} md={4} key={`shift-chart-${key}`}>
                                <Paper
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: 3,
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                        }
                                    }}
                                >
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            mb: 4,
                                            color: '#1e293b',
                                            fontWeight: 600
                                        }}
                                    >
                                        {CHART_TITLES[key]} by Shift
                                    </Typography>
                                    <Box sx={{ height: 400 }}>
                                        <ResponsiveContainer>
                                            <BarChart
                                                data={data}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                                barCategoryGap="20%"
                                                barGap={4}
                                            >
                                                <XAxis 
                                                    dataKey="shift" 
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                    tickLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                    tickLine={{ stroke: '#e2e8f0' }}
                                                    label={{ 
                                                        value: 'Hours', 
                                                        angle: -90, 
                                                        position: 'insideLeft',
                                                        style: { 
                                                            textAnchor: 'middle',
                                                            fill: '#64748b',
                                                            fontSize: 12
                                                        }
                                                    }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "#ffffff",
                                                        border: "1px solid #e2e8f0",
                                                        fontSize: "13px",
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                    labelStyle={{ 
                                                        fontWeight: 600,
                                                        color: '#1e293b'
                                                    }}
                                                    formatter={(value, name) => {
                                                        if (name === "average") {
                                                            return [`${value}h`, "Average Time"];
                                                        } else if (name === "count") {
                                                            return [`${value} cards`, "Card Count"];
                                                        }
                                                        return [value, name];
                                                    }}
                                                />
                                                <Legend 
                                                    wrapperStyle={{ 
                                                        fontSize: 14,
                                                        color: '#64748b'
                                                    }}
                                                    formatter={(value) => {
                                                        if (value === 'average') return 'Average Time (hours)';
                                                        if (value === 'count') return 'Card Count';
                                                        return value;
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="average" 
                                                    fill="#3b82f6" 
                                                    name="Average Time"
                                                    radius={[4, 4, 0, 0]}
                                                    onClick={(data) => {
                                                        if (data && data.payload) {
                                                            const shift = data.payload.shift;
                                                            const shiftNumber = parseInt(shift.split(' ')[1]);
                                                            
                                                            // Calculate correct time ranges for each shift
                                                            let startHour, endHour;
                                                            switch(shiftNumber) {
                                                                case 1:
                                                                    startHour = 0;
                                                                    endHour = 4;
                                                                    break;
                                                                case 2:
                                                                    startHour = 4;
                                                                    endHour = 8;
                                                                    break;
                                                                case 3:
                                                                    startHour = 8;
                                                                    endHour = 12;
                                                                    break;
                                                                case 4:
                                                                    startHour = 12;
                                                                    endHour = 16;
                                                                    break;
                                                                case 5:
                                                                    startHour = 16;
                                                                    endHour = 20;
                                                                    break;
                                                                case 6:
                                                                    startHour = 20;
                                                                    endHour = 24;
                                                                    break;
                                                                default:
                                                                    startHour = 0;
                                                                    endHour = 24;
                                                                    break;
                                                            }
                                                            
                                                            setChartFilter({
                                                                field: 'createdAt',
                                                                range: {
                                                                    min: startHour,
                                                                    max: endHour
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    cursor="pointer"
                                                >
                                                    <LabelList
                                                        dataKey="average"
                                                        position="top"
                                                        formatter={(value) => `${value}h`}
                                                        style={{
                                                            fill: '#64748b',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Time Series Charts */}
                    {Object.entries(avgCharts).map(([key, data]) => (
                        <Paper
                            key={`time-series-${key}`}
                            sx={{
                                p: 4,
                                mb: 4,
                                mt: 15,
                                background: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: 3,
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                }
                            }}
                        >
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    mb: 4,
                                    color: '#1e293b',
                                    fontWeight: 700
                                }}
                            >
                                {CHART_TITLES[key]} Over Time
                            </Typography>
                            <Box sx={{ height: 400 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={data}>
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#64748b" 
                                            tick={{ fontSize: 12 }}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                            tickLine={{ stroke: '#e2e8f0' }}
                                        />
                                        <YAxis 
                                            stroke="#64748b" 
                                            tick={{ fontSize: 12 }}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                            tickLine={{ stroke: '#e2e8f0' }}
                                            label={{ 
                                                value: 'Minutes', 
                                                angle: -90, 
                                                position: 'insideLeft',
                                                style: { 
                                                    textAnchor: 'middle',
                                                    fill: '#64748b',
                                                    fontSize: 12
                                                }
                                            }}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${Math.round(value)} minutes`, "Average"]}
                                            contentStyle={{ 
                                                backgroundColor: "#ffffff", 
                                                border: "1px solid #e2e8f0", 
                                                fontSize: "13px",
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                            labelStyle={{ 
                                                fontWeight: 600,
                                                color: '#1e293b'
                                            }}
                                        />
                                        <Legend 
                                            wrapperStyle={{ 
                                                fontSize: 14, 
                                                paddingTop: 10,
                                                color: '#64748b'
                                            }} 
                                        />
                                        <defs>
                                            <linearGradient id={`avg-color-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="average"
                                            stroke="#3b82f6"
                                            fill={`url(#avg-color-${key})`}
                                            strokeWidth={2}
                                            dot={{ r: 2, fill: '#3b82f6' }}
                                            activeDot={{ r: 4, fill: '#3b82f6' }}
                                            name="Average (minutes)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    ))}

                    {/* Dual Bar Charts */}
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            mb: 4,
                            color: '#1e293b',
                            fontWeight: 700
                        }}
                    >
                        Time & Card Count Analysis
                    </Typography>

                    {/* TS Team Analysis */}
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            mb: 3,
                            color: '#1e293b',
                            fontWeight: 600
                        }}
                    >
                        TS Team Analysis
                    </Typography>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {Object.entries(timeAndCountData.member).map(([key, data]) => (
                            <Grid item xs={12} md={6} key={`member-chart-${key}`}>
                                <Paper
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: 3,
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                        }
                                    }}
                                >
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            mb: 4,
                                            color: '#1e293b',
                                            fontWeight: 600
                                        }}
                                    >
                                        {CHART_TITLES[key]} by TS Member
                                    </Typography>
                                    <Box sx={{ height: 400 }}>
                                        <ResponsiveContainer>
                                            <BarChart
                                                layout="vertical"
                                                data={data.sort((a, b) => b.time - a.time)}
                                                margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                                barCategoryGap="20%"
                                                barGap={4}
                                            >
                                                <XAxis 
                                                    type="number"
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                    tickLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    width={150}
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                    tickLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "#ffffff",
                                                        border: "1px solid #e2e8f0",
                                                        fontSize: "13px",
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                    labelStyle={{ 
                                                        fontWeight: 600,
                                                        color: '#1e293b'
                                                    }}
                                                    formatter={(value, name) => {
                                                        if (name === "time") {
                                                            return [`${value} hours`, "Total Time"];
                                                        } else if (name === "count") {
                                                            return [`${value} cards`, "Card Count"];
                                                        } else {
                                                            return [value, name];
                                                        }
                                                    }}
                                                />
                                                <Legend 
                                                    wrapperStyle={{ 
                                                        fontSize: 14,
                                                        color: '#64748b'
                                                    }}
                                                    formatter={(value) => {
                                                        if (value === 'time') return 'Total Time';
                                                        if (value === 'count') return 'Card Count';
                                                        return value;
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="time" 
                                                    fill="#3b82f6" 
                                                    name="Total Time"
                                                    radius={[0, 4, 4, 0]}
                                                    label={({ value, payload }) => {
                                                        const total = data.reduce((sum, item) => sum + item.time, 0);
                                                        const percentage = ((value / total) * 100).toFixed(1);
                                                        return [
                                                            `${value}h`,
                                                            `${percentage}%`
                                                        ].join('\n');
                                                    }}
                                                    labelStyle={{
                                                        fill: '#64748b',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        textAnchor: 'start'
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="count" 
                                                    fill="#10b981" 
                                                    name="Card Count"
                                                    radius={[0, 4, 4, 0]}
                                                    label={({ value, payload }) => {
                                                        const total = data.reduce((sum, item) => sum + item.count, 0);
                                                        const percentage = ((value / total) * 100).toFixed(1);
                                                        return [
                                                            `${value}`,
                                                            `${percentage}%`
                                                        ].join('\n');
                                                    }}
                                                    labelStyle={{
                                                        fill: '#64748b',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        textAnchor: 'start'
                                                    }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* App Analysis */}
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            mb: 3,
                            color: '#1e293b',
                            fontWeight: 600
                        }}
                    >
                        App Analysis
                    </Typography>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {Object.entries(timeAndCountData.app).map(([key, data]) => (
                            <Grid item xs={12} md={6} key={`app-chart-${key}`}>
                                <Paper
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: 3,
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                        }
                                    }}
                                >
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            mb: 4,
                                            color: '#1e293b',
                                            fontWeight: 600
                                        }}
                                    >
                                        {CHART_TITLES[key]} by App
                                    </Typography>
                                    <Box sx={{ height: 400 }}>
                                        <ResponsiveContainer>
                                            <BarChart
                                                layout="vertical"
                                                data={data.sort((a, b) => b.time - a.time)}
                                                margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                                barCategoryGap="20%"
                                                barGap={4}
                                            >
                                                <XAxis 
                                                    type="number"
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                    tickLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    width={150}
                                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                    tickLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "#ffffff",
                                                        border: "1px solid #e2e8f0",
                                                        fontSize: "13px",
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                    labelStyle={{ 
                                                        fontWeight: 600,
                                                        color: '#1e293b'
                                                    }}
                                                    formatter={(value, name) => {
                                                        if (name === "time") {
                                                            return [`${value} hours`, "Total Time"];
                                                        } else if (name === "count") {
                                                            return [`${value} cards`, "Card Count"];
                                                        } else {
                                                            return [value, name];
                                                        }
                                                    }}
                                                />
                                                <Legend 
                                                    wrapperStyle={{ 
                                                        fontSize: 14,
                                                        color: '#64748b'
                                                    }}
                                                    formatter={(value) => {
                                                        if (value === 'time') return 'Total Time';
                                                        if (value === 'count') return 'Card Count';
                                                        return value;
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="time" 
                                                    fill="#3b82f6" 
                                                    name="Total Time"
                                                    radius={[0, 4, 4, 0]}
                                                    label={({ value, payload }) => {
                                                        const total = data.reduce((sum, item) => sum + item.time, 0);
                                                        const percentage = ((value / total) * 100).toFixed(1);
                                                        return [
                                                            `${value}h`,
                                                            `${percentage}%`
                                                        ].join('\n');
                                                    }}
                                                    labelStyle={{
                                                        fill: '#64748b',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        textAnchor: 'start'
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey="count" 
                                                    fill="#10b981" 
                                                    name="Card Count"
                                                    radius={[0, 4, 4, 0]}
                                                    label={({ value, payload }) => {
                                                        const total = data.reduce((sum, item) => sum + item.count, 0);
                                                        const percentage = ((value / total) * 100).toFixed(1);
                                                        return [
                                                            `${value}`,
                                                            `${percentage}%`
                                                        ].join('\n');
                                                    }}
                                                    labelStyle={{
                                                        fill: '#64748b',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        textAnchor: 'start'
                                                    }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* Data Table */}
            <Box sx={{ 
                width: '100%', 
                overflowX: 'auto',
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                backgroundColor: '#ffffff',
                mb: 4,
                mt: 8
            }}>
                <Table 
                    sx={{ 
                        minWidth: { xs: 800, sm: 1000 },
                        border: "1px solid #e2e8f0", 
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                    }}
                >
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                            <TableCell sx={{ 
                                fontWeight: 600, 
                                color: '#1e293b',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 2 }
                            }}>Card</TableCell>
                            <TableCell sx={{ 
                                fontWeight: 600, 
                                color: '#1e293b',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 2 }
                            }}>Link</TableCell>
                            <TableCell sx={{ 
                                fontWeight: 600, 
                                color: '#1e293b',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 2 }
                            }}>App</TableCell>
                            <TableCell sx={{ 
                                fontWeight: 600, 
                                color: '#1e293b',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 2 }
                            }}>Members</TableCell>
                            <TableCell 
                                onClick={() => handleSort("resolutionTime")} 
                                sx={{ 
                                    cursor: "pointer", 
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    py: { xs: 1, sm: 2 },
                                    '&:hover': {
                                        backgroundColor: '#f1f5f9'
                                    }
                                }}
                            >
                                Resolution Time {sortConfig.key === "resolutionTime" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </TableCell>
                            <TableCell 
                                onClick={() => handleSort("firstActionTime")} 
                                sx={{ 
                                    cursor: "pointer", 
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    py: { xs: 1, sm: 2 },
                                    '&:hover': {
                                        backgroundColor: '#f1f5f9'
                                    }
                                }}
                            >
                                First Action Time {sortConfig.key === "firstActionTime" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </TableCell>
                            <TableCell 
                                onClick={() => handleSort("resolutionTimeTS")} 
                                sx={{ 
                                    cursor: "pointer", 
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    py: { xs: 1, sm: 2 },
                                    '&:hover': {
                                        backgroundColor: '#f1f5f9'
                                    }
                                }}
                            >
                                TS Done Issues Time {sortConfig.key === "resolutionTimeTS" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </TableCell>
                            <TableCell sx={{ 
                                fontWeight: 600, 
                                color: '#1e293b',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 2 }
                            }}>Created At</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {sortedData.map((card) => (
                            <TableRow
                                key={card.cardUrl}
                                onClick={() => handleRowClick(card)}
                                sx={{
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        backgroundColor: "#f8fafc",
                                        cursor: "pointer"
                                    }
                                }}
                            >
                                <TableCell>{card.cardName}</TableCell>
                                <TableCell>
                                    <Link href={card.cardUrl} target="_blank" rel="noopener noreferrer">
                                        Trello
                                    </Link>
                                </TableCell>
                                <TableCell>{card.labels?.filter(l => l.startsWith("App:")).join(", ")}</TableCell>
                                <TableCell>{card.members?.map(id => memberMap[id]).filter(Boolean).join(", ")}</TableCell>
                                <TableCell>{formatMinutes(card.resolutionTime)}</TableCell>
                                <TableCell>{formatMinutes(card.firstActionTime)}</TableCell>
                                <TableCell>{formatMinutes(card.resolutionTimeTS)}</TableCell>
                                <TableCell>{safeFormatDate(card.createdAt)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>

            {/* Card Detail Modal */}
            <CardDetailModal
                open={modalOpen}
                onClose={handleCloseModal}
                cardId={selectedCard}
            />

            {/* Add AgentLeaderboard here at the bottom */}
            {!loading && (
                <Box sx={{ mt: 4 }}>
                    <AgentLeaderboard data={filteredData} />
                </Box>
            )}
        </Paper>
    );
};

const AgentLeaderboard = ({ data }) => {
    const leaderboard = calculateAgentLeaderboard(data);

    if (leaderboard.length === 0) {
        return (
            <Paper
                sx={{
                    p: 4,
                    mb: 4,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    textAlign: 'center'
                }}
            >
                <Typography variant="h6" color="text.secondary">
                    No data available for TS Team Leaderboard
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper
            sx={{
                p: 4,
                mb: 4,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                }
            }}
        >
            <Typography 
                variant="h5" 
                sx={{ 
                    mb: 4,
                    color: '#1e293b',
                    fontWeight: 700
                }}
            >
                TS Team Leaderboard
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Rank</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Member</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Total Cards</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Avg Resolution Time</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Avg First Action Time</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Avg TS Done Time</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {leaderboard.map((agent, index) => (
                        <TableRow key={agent.name}>
                            <TableCell>
                                <Chip 
                                    label={`#${index + 1}`}
                                    color={index === 0 ? "success" : index < 3 ? "primary" : "default"}
                                    sx={{ 
                                        fontWeight: 600,
                                        minWidth: '40px'
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500, color: '#1e293b' }}>{agent.name}</TableCell>
                            <TableCell sx={{ color: '#64748b' }}>{agent.cardCount}</TableCell>
                            <TableCell sx={{ fontWeight: 500, color: '#1e293b' }}>
                                {formatMinutes(agent.avgResolutionTime)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500, color: '#1e293b' }}>
                                {formatMinutes(agent.avgFirstActionTime)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500, color: '#1e293b' }}>
                                {formatMinutes(agent.avgResolutionTimeTS)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
};

export default ResolutionTimeList;
