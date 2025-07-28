import React, { useState, useEffect } from 'react';
import { getDevResolutionTimes } from '../api/devCardsApi';
import { DatePicker, Button, Select, Row, Col, Card, Statistic, Typography } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';

import dayjs from 'dayjs';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import appData from '../data/app.json';
import members from '../data/members.json';
import TableResolutionTime from '../components/Table/TableResolutionTime';

// Extend dayjs with dayOfYear plugin
dayjs.extend(dayOfYear);

const { RangePicker } = DatePicker;
const { Title } = Typography;

// Format phút sang giờ/ngày
function formatMinutes(mins) {
    if (!mins || isNaN(mins)) return '—';
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} h`;
    const days = Math.floor(mins / 1440);
    const hours = ((mins % 1440) / 60).toFixed(1);
    return hours > 0 ? `${days} ngày ${hours} h` : `${days} ngày`;
}

// Tạo map từ label_trello/app_name sang product_team
const appLabelToTeam = {};
appData.forEach(app => {
    if (app.label_trello) appLabelToTeam[app.label_trello] = app.product_team;
    if (app.app_name) appLabelToTeam[app.app_name] = app.product_team;
});

const productTeams = Array.from(new Set(appData.map(app => app.product_team)));

function getCardTeam(card) {
    let team = null;
    if (card.labels && card.labels.length > 0) {
        team = card.labels.map(l => appLabelToTeam[l]).find(Boolean);
    }
    if (!team && card.appName) {
        team = appLabelToTeam[card.appName];
    }
    if (!team && card.cardName) {
        team = appLabelToTeam[card.cardName];
    }
    return team;
}

function calcAvg(arr, key) {
    const nums = arr.map(c => Number(c[key])).filter(v => !isNaN(v) && v > 0);
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// Tính toán thống kê tổng quan
function calculateOverallStats(cards) {
    const validCards = cards.filter(card => 
        Number(card.resolutionTime) > 0 && !isNaN(Number(card.resolutionTime))
    );
    
    if (validCards.length === 0) {
        return {
            totalCards: 0,
            avgResolutionTime: 0,
            avgFirstActionTime: 0,
            avgResolutionTimeDev: 0,
            under1h: 0,
            oneTo12h: 0,
            twelveTo24h: 0,
            over24h: 0
        };
    }

    const resolutionTimes = validCards.map(card => Number(card.resolutionTime));
    const firstActionTimes = validCards.map(card => Number(card.firstActionTime)).filter(t => t > 0);
    const resolutionTimeDevs = validCards.map(card => Number(card.resolutionTimeDev)).filter(t => t > 0);

    // Phân loại theo thời gian resolution
    const under1h = resolutionTimes.filter(t => t < 60).length;
    const oneTo12h = resolutionTimes.filter(t => t >= 60 && t < 720).length;
    const twelveTo24h = resolutionTimes.filter(t => t >= 720 && t < 1440).length;
    const over24h = resolutionTimes.filter(t => t >= 1440).length;

    return {
        totalCards: validCards.length,
        avgResolutionTime: Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length),
        avgFirstActionTime: firstActionTimes.length > 0 ? Math.round(firstActionTimes.reduce((a, b) => a + b, 0) / firstActionTimes.length) : 0,
        avgResolutionTimeDev: resolutionTimeDevs.length > 0 ? Math.round(resolutionTimeDevs.reduce((a, b) => a + b, 0) / resolutionTimeDevs.length) : 0,
        under1h,
        oneTo12h,
        twelveTo24h,
        over24h
    };
}

// Tạo dữ liệu cho biểu đồ
function createChartData(stats) {
    return [
        { name: '< 1h', value: stats.under1h, color: '#10b981' },
        { name: '1h-12h', value: stats.oneTo12h, color: '#f59e0b' },
        { name: '12h-24h', value: stats.twelveTo24h, color: '#ef4444' },
        { name: '> 24h', value: stats.over24h, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
}

// Tạo dữ liệu cho heatmap resolution time theo ngày tạo
function createHeatmapData(cards) {
    const validCards = cards.filter(card => 
        Number(card.resolutionTime) > 0 && 
        !isNaN(Number(card.resolutionTime)) &&
        card.createdAt
    );

    if (validCards.length === 0) return [];

    // Nhóm cards theo ngày tạo
    const cardsByDate = {};
    validCards.forEach(card => {
        const date = dayjs(card.createdAt).format('YYYY-MM-DD');
        if (!cardsByDate[date]) {
            cardsByDate[date] = [];
        }
        cardsByDate[date].push(Number(card.resolutionTime));
    });

    // Tính trung bình resolution time cho mỗi ngày
    const heatmapData = Object.entries(cardsByDate).map(([date, times], index) => {
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const dateObj = dayjs(date);
        return {
            date,
            avgResolutionTime: avgTime,
            cardCount: times.length,
            x: index, // Sử dụng index thay vì dayOfYear
            y: dateObj.hour(), // Giờ trong ngày (0-23)
            z: avgTime // Độ lớn của điểm (resolution time)
        };
    });

    return heatmapData.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
}

// Helper functions cho heatmap
function getWeekdayIdx(date) {
    const d = new Date(date);
    return d.getDay();
}

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

const roleOptions = [
    { label: 'Tất cả', value: 'ALL' },
    { label: 'CS', value: 'CS' },
    { label: 'TS', value: 'TS' }
];

const DevResolutionTime = () => {
    const today = dayjs();
    const sevenDaysAgo = dayjs().subtract(7, 'day');
    const [dateRange, setDateRange] = useState([sevenDaysAgo, today]);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(undefined);
    const [selectedRole, setSelectedRole] = useState('ALL');
    const [selectedMember, setSelectedMember] = useState(undefined);

    const handleFetch = async (range = dateRange) => {
        if (!range || range.length !== 2) return;
        setLoading(true);
        setError('');
        try {
            const startDate = range[0].format('YYYY-MM-DD');
            const endDate = range[1].format('YYYY-MM-DD');
            const data = await getDevResolutionTimes(startDate, endDate);
            setCards(data);
        } catch (err) {
            setError('Lỗi khi lấy dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleFetch([sevenDaysAgo, today]);
        // eslint-disable-next-line
    }, []);

    // Reset member filter when role changes
    useEffect(() => {
        setSelectedMember(undefined);
    }, [selectedRole]);

    // Lấy danh sách member theo role
    const membersByRole = (selectedRole && selectedRole !== 'ALL')
        ? members.filter(m => (m.role || '').toUpperCase() === selectedRole)
        : [];

    // Lọc cards theo team
    let filteredCards = (!selectedTeam || selectedTeam === 'ALL')
        ? cards
        : cards.filter(card => getCardTeam(card) === selectedTeam);

    // Lọc cards theo role
    if (selectedRole && selectedRole !== 'ALL') {
        const memberIds = membersByRole.map(m => m.id);
        filteredCards = filteredCards.filter(card =>
            Array.isArray(card.members) && card.members.some(id => memberIds.includes(id))
        );
    }

    // Lọc cards theo member
    if (selectedMember) {
        filteredCards = filteredCards.filter(card =>
            Array.isArray(card.members) && card.members.includes(selectedMember)
        );
    }

    // Tính AVG cho từng team
    const teamAvgs = {};
    productTeams.forEach(team => {
        const teamCards = cards.filter(card => getCardTeam(card) === team);
        teamAvgs[team] = {
            resolutionTime: calcAvg(teamCards, 'resolutionTime'),
            firstActionTime: calcAvg(teamCards, 'firstActionTime'),
            resolutionTimeDev: calcAvg(teamCards, 'resolutionTimeDev'),
            count: teamCards.length
        };
    });

    // Nếu filter theo team thì chỉ hiển thị box của team đó
    const teamsToShow = (!selectedTeam || selectedTeam === 'ALL') ? productTeams : [selectedTeam];

    // Tính toán thống kê tổng quan
    const overallStats = calculateOverallStats(filteredCards);
    const chartData = createChartData(overallStats);
    const heatmapData = createHeatmapData(filteredCards);
    
    // Tạo heatmap data cho resolution time
    const resolutionTimeHeatmap = reorderHeatmap(getResolutionTimeHeatmap(filteredCards, 'resolutionTime'));

    return (
        <div style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc 0%,#e0e7ef 100%)', padding: 0 }}>
            <div style={{ maxWidth: '100%', margin: '0 auto', padding: '32px 12px 0 12px' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: 32, fontWeight: 800, color: '#1e293b', letterSpacing: 1 }}>Dev Resolution Time</Title>
                <Card
                    style={{
                        maxWidth: 1200,
                        width: '100%',
                        margin: '0 auto 32px auto',
                        borderRadius: 20,
                        boxShadow: '0 4px 24px 0 rgba(30,41,59,0.10)',
                        background: '#fff',
                        padding: 0
                    }}
                    bodyStyle={{ padding: 32 }}
                >
                    <Row gutter={[24, 8]} align="middle" justify="center">
                        <Col xs={24} sm={12} md={6} lg={5} xl={4}>
                            <Typography.Text style={{ color: '#64748b', fontWeight: 500, fontSize: 13 }}>Ngày</Typography.Text>
                            <RangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                format="YYYY-MM-DD"
                                allowClear
                                style={{ width: '100%', marginTop: 4 }}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={5} lg={4} xl={4}>
                            <Typography.Text style={{ color: '#64748b', fontWeight: 500, fontSize: 13 }}>Team</Typography.Text>
                            <Select
                                allowClear
                                placeholder="Chọn Product Team"
                                style={{ width: '100%', marginTop: 4 }}
                                value={selectedTeam}
                                onChange={val => setSelectedTeam(val)}
                                size="middle"
                            >
                                <Select.Option value="ALL">Tất cả team</Select.Option>
                                {productTeams.map(team => (
                                    <Select.Option key={team} value={team}>{team}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={4} lg={3} xl={3}>
                            <Typography.Text style={{ color: '#64748b', fontWeight: 500, fontSize: 13 }}>Role</Typography.Text>
                            <Select
                                style={{ width: '100%', marginTop: 4 }}
                                value={selectedRole}
                                onChange={val => setSelectedRole(val)}
                                size="middle"
                            >
                                {roleOptions.map(opt => (
                                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        {selectedRole && selectedRole !== 'ALL' && (
                            <Col xs={24} sm={12} md={5} lg={4} xl={4}>
                                <Typography.Text style={{ color: '#64748b', fontWeight: 500, fontSize: 13 }}>{selectedRole === 'TS' ? 'Thành viên TS' : 'Thành viên CS'}</Typography.Text>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder={`Chọn ${selectedRole}`}
                                    style={{ width: '100%', marginTop: 4 }}
                                    value={selectedMember}
                                    onChange={val => setSelectedMember(val)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {membersByRole.map(m => (
                                        <Select.Option key={m.id} value={m.id}>{m.fullName || m.username}</Select.Option>
                                    ))}
                                </Select>
                            </Col>
                        )}
                        <Col xs={24} sm={12} md={4} lg={3} xl={3} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button
                                type="primary"
                                onClick={() => handleFetch(dateRange)}
                                loading={loading}
                                disabled={!dateRange || dateRange.length !== 2}
                                style={{ width: '100%', fontWeight: 600, height: 40, marginTop: 22 }}
                            >
                                Lấy dữ liệu
                            </Button>
                        </Col>
                    </Row>
                </Card>
                <Row gutter={[24, 24]} justify="center" style={{ marginBottom: 32 }}>
                    {teamsToShow.map(team => (
                        <Col
                            key={team}
                            xs={24}
                            sm={12}
                            md={8}
                            lg={6}
                            xl={4}
                            style={{ display: 'flex', justifyContent: 'center' }}
                        >
                            <Card
                                bordered={false}
                                style={{
                                    width: 260,
                                    minHeight: 200,
                                    borderRadius: 18,
                                    boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                    background: '#fff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 18
                                }}
                                headStyle={{
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: 20,
                                    color: '#2563eb',
                                    background: 'linear-gradient(90deg,#e0e7ff 0%,#f0f9ff 100%)',
                                    borderRadius: '18px 18px 0 0',
                                    border: 'none'
                                }}
                                title={<span style={{ color: '#2563eb', fontWeight: 700 }}>{team}</span>}
                            >
                                <Statistic title={<span style={{ color: '#64748b' }}>AVG Resolution Time</span>} value={formatMinutes(teamAvgs[team].resolutionTime)} valueStyle={{ fontWeight: 600, color: '#3b82f6' }} />
                                <Statistic title={<span style={{ color: '#64748b' }}>AVG First Action Time</span>} value={formatMinutes(teamAvgs[team].firstActionTime)} valueStyle={{ fontWeight: 600, color: '#6366f1' }} style={{ marginTop: 12 }} />
                                <Statistic title={<span style={{ color: '#64748b' }}>AVG Resolution Time Dev</span>} value={formatMinutes(teamAvgs[team].resolutionTimeDev)} valueStyle={{ fontWeight: 600, color: '#0ea5e9' }} style={{ marginTop: 12 }} />
                                <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Cards: {teamAvgs[team].count}</div>
                            </Card>
                        </Col>
                    ))}
                </Row>
                
                {/* Thống kê tổng quan */}
                <Row gutter={[24, 24]} justify="center" style={{ marginBottom: 32 }}>
                    <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                textAlign: 'center',
                                padding: 24
                            }}
                        >
                            <Statistic 
                                title={<span style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>Tổng số Cards</span>} 
                                value={overallStats.totalCards} 
                                valueStyle={{ fontWeight: 700, color: '#2563eb', fontSize: 32 }} 
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                textAlign: 'center',
                                padding: 24
                            }}
                        >
                            <Statistic 
                                title={<span style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>AVG Resolution Time</span>} 
                                value={formatMinutes(overallStats.avgResolutionTime)} 
                                valueStyle={{ fontWeight: 700, color: '#3b82f6', fontSize: 32 }} 
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                textAlign: 'center',
                                padding: 24
                            }}
                        >
                            <Statistic 
                                title={<span style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>AVG First Action Time</span>} 
                                value={formatMinutes(overallStats.avgFirstActionTime)} 
                                valueStyle={{ fontWeight: 700, color: '#6366f1', fontSize: 32 }} 
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                textAlign: 'center',
                                padding: 24
                            }}
                        >
                            <Statistic 
                                title={<span style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>AVG Resolution Time Dev</span>} 
                                value={formatMinutes(overallStats.avgResolutionTimeDev)} 
                                valueStyle={{ fontWeight: 700, color: '#0ea5e9', fontSize: 32 }} 
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Biểu đồ phân bố thời gian resolution */}
                <Row gutter={[24, 24]} justify="center" style={{ marginBottom: 32 }}>
                    <Col xs={24} lg={12}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                padding: 24
                            }}
                            title={
                                <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 18 }}>
                                    Phân bố Cards theo Resolution Time
                                </span>
                            }
                        >
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#64748b"
                                        fontSize={12}
                                        fontWeight={600}
                                    />
                                    <YAxis 
                                        stroke="#64748b"
                                        fontSize={12}
                                    />
                                    <Tooltip 
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        formatter={(value, name) => [value, 'Số Cards']}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                padding: 24
                            }}
                            title={
                                <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 18 }}>
                                    Tỷ lệ Cards theo Resolution Time
                                </span>
                            }
                        >
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        formatter={(value, name) => [value, 'Số Cards']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>

                {/* Heatmap Resolution Time */}
                <Row gutter={[24, 24]} justify="center" style={{ marginBottom: 32 }}>
                    <Col xs={24}>
                        <Card
                            bordered={false}
                            style={{
                                borderRadius: 18,
                                boxShadow: '0 4px 24px 0 rgba(30,41,59,0.08)',
                                background: '#fff',
                                padding: 24
                            }}
                            title={
                                <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 18 }}>
                                    Resolution Time Heatmap
                                </span>
                            }
                        >
                            {/* Chú thích màu heatmap */}
                            <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
                                <Col>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 20, borderRadius: 4, background: '#bbf7d0', border: '1.5px solid #cbd5e1' }} />
                                        <span style={{ fontSize: 14, color: '#334155' }}>&lt; 1h</span>
                                    </div>
                                </Col>
                                <Col>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 20, borderRadius: 4, background: '#bae6fd', border: '1.5px solid #cbd5e1' }} />
                                        <span style={{ fontSize: 14, color: '#334155' }}>1-4h</span>
                                    </div>
                                </Col>
                                <Col>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 20, borderRadius: 4, background: '#fde68a', border: '1.5px solid #cbd5e1' }} />
                                        <span style={{ fontSize: 14, color: '#334155' }}>4-8h</span>
                                    </div>
                                </Col>
                                <Col>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 20, borderRadius: 4, background: '#fca5a5', border: '1.5px solid #cbd5e1' }} />
                                        <span style={{ fontSize: 14, color: '#334155' }}>&gt; 8h</span>
                                    </div>
                                </Col>
                            </Row>
                            
                            {/* Heatmap Grid */}
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Header row: 0h-23h */}
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <div style={{ width: 48 }} />
                                    {Array.from({ length: 24 }).map((_, h) => (
                                        <div key={h} style={{ width: 48, textAlign: 'center', fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                                            {h}h
                                        </div>
                                    ))}
                                    <div style={{ width: 48, textAlign: 'center', fontSize: 14, color: '#64748b', fontWeight: 700 }}>
                                        AVG
                                    </div>
                                </div>
                                
                                {/* Rows: Mon-Sun */}
                                {resolutionTimeHeatmap.map((row, i) => {
                                    // Tính avg của cả ngày
                                    const total = row.reduce((sum, cell) => sum + cell.total, 0);
                                    const count = row.reduce((sum, cell) => sum + cell.count, 0);
                                    const avgDay = count > 0 ? total / count : 0;
                                    const avgDayHour = avgDay / 60;
                                    
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: 48, textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 14 }}>
                                                {WEEKDAYS[i]}
                                            </div>
                                            {row.map((cell, h) => {
                                                const avg = cell.count > 0 ? cell.total / cell.count : 0;
                                                const avgHour = avg / 60;
                                                
                                                return (
                                                    <div
                                                        key={h}
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 8,
                                                            background: getCellColor(avg),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: '#fff',
                                                            border: '1.5px solid #cbd5e1',
                                                            cursor: cell.count > 0 ? 'pointer' : 'default',
                                                            transition: 'all 0.18s ease',
                                                        }}
                                                        title={cell.count > 0 ? `${avgHour.toFixed(1)}h\n${cell.count} cards` : 'No data'}
                                                    >
                                                        {cell.count > 0 ? (avgHour < 1 ? `${Math.round(avg)}p` : `${avgHour.toFixed(1)}h`) : ''}
                                                    </div>
                                                );
                                            })}
                                            {/* AVG column */}
                                            <div
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 8,
                                                    background: getCellColor(avgDay),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: '#fff',
                                                    border: '2px solid #6366f1',
                                                }}
                                                title={count > 0 ? `AVG: ${avgDayHour.toFixed(1)}h\nTổng cards: ${count}` : 'No data'}
                                            >
                                                {count > 0 ? avgDayHour.toFixed(1) : ''}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <TableResolutionTime 
                    filteredCards={filteredCards}
                    loading={loading}
                    error={error}
                />
            </div>
        </div>
    );
};

export default DevResolutionTime;