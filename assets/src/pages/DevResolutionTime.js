import React, { useState, useEffect } from 'react';
import { getDevResolutionTimes } from '../api/devCardsApi';
import { DatePicker, Button, Select, Row, Col, Card, Statistic, Typography, Spin, Alert, Badge } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ReloadOutlined, TeamOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';
import appData from '../data/app.json';
import members from '../data/members.json';
import TableResolutionTime from '../components/Table/TableResolutionTime';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

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

const productTeams = Array.from(new Set(appData.map(app => app.product_team))).filter(Boolean);
const appNames = Array.from(new Set(appData.map(app => app.app_name))).filter(Boolean);

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

function getCardApp(card) {
    if (card.appName) {
        return card.appName;
    }
    if (card.labels && card.labels.length > 0) {
        const appLabel = card.labels.find(label => label.startsWith('App: '));
        if (appLabel) {
            const appName = appLabel.replace('App: ', '');
            return appName;
        }
    }
    return null;
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

const roleOptions = [
    { label: 'Tất cả', value: 'ALL' },
    { label: 'CS', value: 'CS' },
    { label: 'TS', value: 'TS' }
];

const teamColors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#7b1fa2', '#388e3c'];

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
    const [selectedApp, setSelectedApp] = useState(undefined);

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

    // Lọc cards theo app
    if (selectedApp && selectedApp !== 'ALL') {
        filteredCards = filteredCards.filter(card => getCardApp(card) === selectedApp);
    }

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

    return (
        <div style={{ width: '100%', minHeight: '100vh', background: '#f5f5f5', padding: 0 }}>
            <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px' }}>
                
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <Title level={2} style={{ color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
                        <TeamOutlined style={{ marginRight: 12, color: '#2563eb' }} />
                        Dev Resolution Time Dashboard
                    </Title>
                    <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                        Monitor resolution time performance across product teams
                    </Text>
                </div>

                {/* Filters */}
                <Card style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={12} md={5}>
                            <RangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                format="YYYY-MM-DD"
                                allowClear
                                style={{ width: '100%' }}
                                placeholder={["Start date", "End date"]}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={3}>
                            <Select
                                allowClear
                                placeholder="Select Team"
                                style={{ width: '100%' }}
                                value={selectedTeam}
                                onChange={val => setSelectedTeam(val)}
                            >
                                <Select.Option value="ALL">All Teams</Select.Option>
                                {productTeams.map(team => (
                                    <Select.Option key={team} value={team}>{team}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={3}>
                            <Select
                                allowClear
                                showSearch
                                placeholder="Select App"
                                style={{ width: '100%' }}
                                value={selectedApp}
                                onChange={val => setSelectedApp(val)}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                <Select.Option value="ALL">All Apps</Select.Option>
                                {appNames.map(app => (
                                    <Select.Option key={app} value={app}>{app}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={3}>
                            <Select
                                style={{ width: '100%' }}
                                value={selectedRole}
                                onChange={val => setSelectedRole(val)}
                            >
                                {roleOptions.map(opt => (
                                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        {selectedRole && selectedRole !== 'ALL' && (
                            <Col xs={24} sm={12} md={3}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder={`Select ${selectedRole}`}
                                    style={{ width: '100%' }}
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
                        <Col xs={24} sm={12} md={selectedRole && selectedRole !== 'ALL' ? 3 : 6}>
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={() => handleFetch(dateRange)}
                                loading={loading}
                                disabled={!dateRange || dateRange.length !== 2}
                                style={{ width: '100%', fontWeight: 600 }}
                            >
                                Refresh Data
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* Error Alert */}
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                {/* Key Metrics */}
                <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <Statistic
                                title="Total Cards"
                                value={overallStats.totalCards}
                                valueStyle={{ color: '#2563eb', fontSize: 28, fontWeight: 700 }}
                                prefix={<TeamOutlined style={{ marginRight: 8 }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <Statistic
                                title="AVG Resolution Time"
                                value={formatMinutes(overallStats.avgResolutionTime)}
                                valueStyle={{ color: '#3b82f6', fontSize: 28, fontWeight: 700 }}
                                prefix={<ClockCircleOutlined style={{ marginRight: 8 }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <Statistic
                                title="AVG First Action Time"
                                value={formatMinutes(overallStats.avgFirstActionTime)}
                                valueStyle={{ color: '#6366f1', fontSize: 28, fontWeight: 700 }}
                                prefix={<CheckCircleOutlined style={{ marginRight: 8 }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <Statistic
                                title="AVG Resolution Time Dev"
                                value={formatMinutes(overallStats.avgResolutionTimeDev)}
                                valueStyle={{ color: '#0ea5e9', fontSize: 28, fontWeight: 700 }}
                                prefix={<ExclamationCircleOutlined style={{ marginRight: 8 }} />}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Team Performance Cards */}
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 18 }}>Team Performance Overview</span>
                            <Badge count={teamsToShow.length} style={{ backgroundColor: '#2563eb' }} />
                        </div>
                    }
                    style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                >
                    <Row gutter={[24, 24]}>
                        {teamsToShow.map((team, idx) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={team}>
                                <Card
                                    size="small"
                                    style={{
                                        borderRadius: 16,
                                        background: `linear-gradient(135deg, ${teamColors[idx % teamColors.length]}15 0%, ${teamColors[idx % teamColors.length]}08 100%)`,
                                        border: `2px solid ${teamColors[idx % teamColors.length]}30`,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    bodyStyle={{ padding: 20 }}
                                    onClick={() => setSelectedTeam(selectedTeam === team ? undefined : team)}
                                >
                                    {/* Background decoration */}
                                    <div style={{
                                        position: 'absolute',
                                        top: -20,
                                        right: -20,
                                        width: 60,
                                        height: 60,
                                        borderRadius: '50%',
                                        background: `${teamColors[idx % teamColors.length]}20`,
                                        zIndex: 0
                                    }} />
                                    
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        {/* Team Header */}
                                        <div style={{ 
                                            textAlign: 'center', 
                                            marginBottom: 20,
                                            padding: '12px 16px',
                                            background: `${teamColors[idx % teamColors.length]}20`,
                                            borderRadius: 12,
                                            border: `1px solid ${teamColors[idx % teamColors.length]}40`
                                        }}>
                                            <div style={{ 
                                                fontWeight: 800, 
                                                color: teamColors[idx % teamColors.length], 
                                                fontSize: 18,
                                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                            }}>
                                                {team}
                                            </div>
                                            <div style={{ 
                                                color: '#64748b', 
                                                fontSize: 12, 
                                                fontWeight: 500,
                                                marginTop: 4
                                            }}>
                                                {teamAvgs[team].count} cards
                                            </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            {/* Resolution Time */}
                                            <div style={{
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                borderRadius: 12,
                                                padding: '12px 16px',
                                                border: '1px solid rgba(59, 130, 246, 0.2)'
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    marginBottom: 8
                                                }}>
                                                    <div style={{ 
                                                        fontWeight: 600, 
                                                        color: '#1e293b', 
                                                        fontSize: 13 
                                                    }}>
                                                        Resolution Time
                                                    </div>
                                                    <ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
                                                </div>
                                                <div style={{ 
                                                    fontWeight: 800, 
                                                    color: '#3b82f6', 
                                                    fontSize: 20,
                                                    textAlign: 'center'
                                                }}>
                                                    {formatMinutes(teamAvgs[team].resolutionTime)}
                                                </div>
                                            </div>

                                            {/* First Action Time */}
                                            <div style={{
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                borderRadius: 12,
                                                padding: '12px 16px',
                                                border: '1px solid rgba(99, 102, 241, 0.2)'
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    marginBottom: 8
                                                }}>
                                                    <div style={{ 
                                                        fontWeight: 600, 
                                                        color: '#1e293b', 
                                                        fontSize: 13 
                                                    }}>
                                                        First Action Time
                                                    </div>
                                                    <CheckCircleOutlined style={{ color: '#6366f1', fontSize: 16 }} />
                                                </div>
                                                <div style={{ 
                                                    fontWeight: 800, 
                                                    color: '#6366f1', 
                                                    fontSize: 20,
                                                    textAlign: 'center'
                                                }}>
                                                    {formatMinutes(teamAvgs[team].firstActionTime)}
                                                </div>
                                            </div>

                                            {/* Dev Resolution Time */}
                                            <div style={{
                                                background: 'rgba(14, 165, 233, 0.1)',
                                                borderRadius: 12,
                                                padding: '12px 16px',
                                                border: '1px solid rgba(14, 165, 233, 0.2)'
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    marginBottom: 8
                                                }}>
                                                    <div style={{ 
                                                        fontWeight: 600, 
                                                        color: '#1e293b', 
                                                        fontSize: 13 
                                                    }}>
                                                        Dev Resolution Time
                                                    </div>
                                                    <ExclamationCircleOutlined style={{ color: '#0ea5e9', fontSize: 16 }} />
                                                </div>
                                                <div style={{ 
                                                    fontWeight: 800, 
                                                    color: '#0ea5e9', 
                                                    fontSize: 20,
                                                    textAlign: 'center'
                                                }}>
                                                    {formatMinutes(teamAvgs[team].resolutionTimeDev)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover effect indicator */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: teamColors[idx % teamColors.length],
                                            opacity: 0.6
                                        }} />
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {/* Charts */}
                <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                    <Col xs={24} lg={12}>
                        <Card
                            title="Resolution Time Ratio"
                            style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
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
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>

                {/* Table */}
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 18 }}>Resolution Time Details</span>
                            <Badge count={filteredCards.length} style={{ backgroundColor: '#2563eb' }} />
                        </div>
                    }
                    style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                >
                    <TableResolutionTime 
                        filteredCards={filteredCards}
                        loading={loading}
                        error={error}
                    />
                </Card>
            </div>
        </div>
    );
};

export default DevResolutionTime;