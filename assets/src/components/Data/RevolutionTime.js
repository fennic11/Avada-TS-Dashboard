// File: ResolutionTimeList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { getResolutionTimes } from "../../api/cardsApi";
import members from "../../data/members.json";
import appData from "../../data/app.json";
import {
    DatePicker, Button, Select, Row, Col, Card, Typography, 
    Table, Tag, Space, Spin, Badge, Modal
} from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { 
    ReloadOutlined, TeamOutlined,
    TrophyOutlined, FireOutlined, StarOutlined
} from '@ant-design/icons';
import HeatmapOfWeek from '../Heatmap/HeatmapOfWeek';
import CardDetailModal from '../CardDetailModal';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const memberMap = members.reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
}, {});

const memberIds = members.map((m) => m.id);

// Tạo map từ label_trello/app_name sang product_team và group_ts
const appLabelToTeam = {};
const appLabelToGroup = {};
appData.forEach(app => {
    if (app.label_trello) {
        appLabelToTeam[app.label_trello] = app.product_team;
        appLabelToGroup[app.label_trello] = app.group_ts;
    }
    if (app.app_name) {
        appLabelToTeam[app.app_name] = app.product_team;
        appLabelToGroup[app.app_name] = app.group_ts;
    }
});

const productTeams = Array.from(new Set(appData.map(app => app.product_team))).filter(Boolean);
const tsGroups = Array.from(new Set(appData.map(app => app.group_ts))).filter(Boolean);

const TIME_GROUPS = [
    { label: "<1h", min: 0, max: 60 },
    { label: "1–4h", min: 60, max: 240 },
    { label: "4–8h", min: 240, max: 480 },
    { label: "8–12h", min: 480, max: 720 },
    { label: "12–24h", min: 720, max: 1440 },
    { label: ">24h", min: 1440, max: Infinity },
];

function formatMinutes(mins) {
    if (!mins || isNaN(mins)) return '—';
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} h`;
    const days = Math.floor(mins / 1440);
    const hours = ((mins % 1440) / 60).toFixed(1);
    return hours > 0 ? `${days} ngày ${hours} h` : `${days} ngày`;
}

function safeFormatDate(dateValue) {
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "—";
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

        const date = new Date(card.createdAt).toISOString().split('T')[0];

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

function getCardGroup(card) {
    let group = null;
    if (card.labels && card.labels.length > 0) {
        group = card.labels.map(l => appLabelToGroup[l]).find(Boolean);
    }
    if (!group && card.appName) {
        group = appLabelToGroup[card.appName];
    }
    if (!group && card.cardName) {
        group = appLabelToGroup[card.cardName];
    }
    return group;
}

function getCardApps(card) {
    const apps = [];
    if (card.labels && card.labels.length > 0) {
        card.labels.forEach(label => {
            if (label.startsWith("App:")) {
                apps.push(label);
            }
        });
    }
    return apps;
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

const teamColors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#7b1fa2', '#388e3c'];

const ResolutionTimeList = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [selectedCard, setSelectedCard] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [chartDetailModal, setChartDetailModal] = useState(false);
    const [selectedChartData, setSelectedChartData] = useState(null);
    const [selectedChartTitle, setSelectedChartTitle] = useState("");
    const [selectedHeatmapField, setSelectedHeatmapField] = useState("resolutionTime");
    const [heatmapFilter, setHeatmapFilter] = useState(null);
    const [cardDetailModalOpen, setCardDetailModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);

    const [selectedApp, setSelectedApp] = useState("");
    const [selectedMember, setSelectedMember] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [dateRange, setDateRange] = useState([
        dayjs().subtract(7, 'day'),
        dayjs()
    ]);

    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const startDate = dateRange[0].format('YYYY-MM-DD');
            const endDate = dateRange[1].format('YYYY-MM-DD');
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
    }, [dateRange]);

    // Initial data fetch
    useEffect(() => {
        if (isInitialLoad) {
            fetchData();
            setIsInitialLoad(false);
        }
    }, [isInitialLoad, fetchData]);

    // Update filtered data when filters change
    useEffect(() => {
        // Don't update if heatmap filter is active
        if (heatmapFilter) return;
        
        let filtered = data.filter((card) => {
            const hasApp = selectedApp ? card.labels?.some(l => l === selectedApp) : true;
            const hasMember = selectedMember ? card.members?.includes(selectedMember) : true;
            const hasTeam = selectedTeam ? getCardTeam(card) === selectedTeam : true;
            const hasGroup = selectedGroup ? getCardGroup(card) === selectedGroup : true;
            
            return hasApp && hasMember && hasTeam && hasGroup;
        });

        // Filter out cards that don't have any TS members
        filtered = filtered.filter(card => 
            !selectedMember ? true : card.members?.some(id => {
                const member = members.find(m => m.id === id);
                return member && member.role === 'TS';
            })
        );

        setFilteredData(filtered);
    }, [data, selectedApp, selectedMember, selectedTeam, selectedGroup, heatmapFilter]);

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

    const CHART_TITLES = {
        resolutionTime: "Resolution Time",
        firstActionTime: "First Action Time",
        resolutionTimeTS: "TS Done Issues Time"
    };

    const handleRowClick = (card) => {
        setSelectedCardId(card.cardId);
        setCardDetailModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedCard(null);
    };

    const handleChartClick = (chartData, title) => {
        setSelectedChartData(chartData);
        setSelectedChartTitle(title);
        setChartDetailModal(true);
    };

    const handleCloseChartModal = () => {
        setChartDetailModal(false);
        setSelectedChartData(null);
        setSelectedChartTitle("");
    };

    const handleHeatmapCellClick = (filter) => {
        setHeatmapFilter(filter);
        
        // Filter cards based on heatmap cell click
        const { weekday, hour } = filter;
        
        // Convert weekday index (0=Mon, 6=Sun) to actual day names
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedDay = dayNames[weekday];
        
        // Filter cards that were created on the selected day and hour
        const filteredByHeatmap = data.filter(card => {
            const cardDate = new Date(card.createdAt);
            const cardDay = cardDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const cardHour = cardDate.getHours();
            
            // Convert to Monday-first index (0=Mon, 6=Sun)
            const mondayFirstIndex = [1,2,3,4,5,6,0].indexOf(cardDay);
            
            return mondayFirstIndex === weekday && cardHour === hour;
        });
        
        // Update filtered data to show only cards from selected heatmap cell
        setFilteredData(filteredByHeatmap);
    };

    // Table columns
    const columns = [
        {
            title: 'Card',
            dataIndex: 'cardName',
            key: 'cardName',
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{text}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                        {safeFormatDate(record.createdAt)}
                    </div>
                </div>
            )
        },
        {
            title: 'App',
            dataIndex: 'labels',
            key: 'app',
            render: (labels) => {
                const apps = labels?.filter(l => l.startsWith("App:")) || [];
                return (
                    <Space wrap>
                        {apps.map(app => (
                            <Tag key={app} color="blue">{app}</Tag>
                        ))}
                    </Space>
                );
            }
        },
        {
            title: 'Team',
            key: 'team',
            render: (_, record) => {
                const team = getCardTeam(record);
                const group = getCardGroup(record);
                return (
                    <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{team || '—'}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{group || '—'}</div>
                    </div>
                );
            }
        },
        {
            title: 'Members',
            dataIndex: 'members',
            key: 'members',
            render: (members) => {
                const memberNames = members?.map(id => memberMap[id]).filter(Boolean) || [];
                return (
                    <Space wrap>
                        {memberNames.map(name => (
                            <Tag key={name} color="green">{name}</Tag>
                        ))}
                    </Space>
                );
            }
        },
        {
            title: 'Resolution Time',
            dataIndex: 'resolutionTime',
            key: 'resolutionTime',
            sorter: true,
            render: (value) => (
                <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                    {formatMinutes(value)}
                </div>
            )
        },
        {
            title: 'First Action Time',
            dataIndex: 'firstActionTime',
            key: 'firstActionTime',
            sorter: true,
            render: (value) => (
                <div style={{ fontWeight: 600, color: '#6366f1' }}>
                    {formatMinutes(value)}
                </div>
            )
        },
        {
            title: 'TS Done Time',
            dataIndex: 'resolutionTimeTS',
            key: 'resolutionTimeTS',
            sorter: true,
            render: (value) => (
                <div style={{ fontWeight: 600, color: '#0ea5e9' }}>
                    {formatMinutes(value)}
                </div>
            )
        },
        {
            title: 'Link',
            key: 'link',
            render: (_, record) => (
                <a href={record.cardUrl} target="_blank" rel="noopener noreferrer">
                    <Button type="link" size="small">Trello</Button>
                </a>
            )
        }
    ];

    // Tạo dữ liệu cho biểu đồ số lượng card theo ngày
    function groupCardsByDate(cards) {
        const map = new Map();

        cards.forEach(card => {
            const date = dayjs(card.createdAt).format('YYYY-MM-DD');
            if (!map.has(date)) {
                map.set(date, 0);
            }
            map.set(date, map.get(date) + 1);
        });

        return Array.from(map.entries())
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .map(([date, count]) => ({
                date: dayjs(date).format('MM/DD'),
                count
            }));
    }

    return (
        <div style={{ width: '100%', minHeight: '100vh', background: '#f5f5f5', padding: 0 }}>
            <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px' }}>
                
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <Title level={2} style={{ color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
                        <TeamOutlined style={{ marginRight: 12, color: '#2563eb' }} />
                        TS Resolution Time Dashboard
                    </Title>
                    <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                        Monitor TS team performance and resolution times
                    </Text>
                </div>

                {/* Filters */}
                <Card style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={12} md={6}>
                            <RangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                format="YYYY-MM-DD"
                                allowClear
                                style={{ width: '100%' }}
                                placeholder={["Start date", "End date"]}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                allowClear
                                placeholder="Select App"
                                style={{ width: '100%' }}
                                value={selectedApp}
                                onChange={val => setSelectedApp(val)}
                            >
                                <Select.Option value="">All Apps</Select.Option>
                                {appOptions.map(app => (
                                    <Select.Option key={app} value={app}>{app}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                allowClear
                                placeholder="Select Team"
                                style={{ width: '100%' }}
                                value={selectedTeam}
                                onChange={val => setSelectedTeam(val)}
                            >
                                <Select.Option value="">All Teams</Select.Option>
                                {productTeams.map(team => (
                                    <Select.Option key={team} value={team}>{team}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Select
                                allowClear
                                placeholder="Select TS Group"
                                style={{ width: '100%' }}
                                value={selectedGroup}
                                onChange={val => setSelectedGroup(val)}
                            >
                                <Select.Option value="">All Groups</Select.Option>
                                {tsGroups.map(group => (
                                    <Select.Option key={group} value={group}>{group}</Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Select
                                allowClear
                                showSearch
                                placeholder="Select TS Member"
                                style={{ width: '100%' }}
                                value={selectedMember}
                                onChange={val => setSelectedMember(val)}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                <Select.Option value="">All Members</Select.Option>
                                {members
                                    .filter(member => member.role === 'TS')
                                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                                    .map(m => (
                                        <Select.Option key={m.id} value={m.id}>
                                            {m.fullName}
                                        </Select.Option>
                                    ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={handleFetchData}
                                loading={loading}
                                style={{ width: '100%', fontWeight: 600 }}
                            >
                                Refresh Data
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <>
                        {/* Key Metrics */}
                        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                            <Col xs={24} sm={12} md={6}>
                                <Card style={{ 
                                    borderRadius: 12, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Total Cards</div>
                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                                                {filteredData.length.toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            width: 24, 
                                            height: 24, 
                                            borderRadius: '50%', 
                                            background: '#2563eb20',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            color: '#2563eb',
                                            fontWeight: 600
                                        }}>
                                            i
                                        </div>
                                    </div>
                                    <div 
                                        style={{ 
                                            height: 120, 
                                            marginTop: 16, 
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => handleChartClick(groupCardsByDate(filteredData), "Daily Cards Trend")}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={groupCardsByDate(filteredData)}>
                                                <defs>
                                                    <linearGradient id="totalCardsGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                                                    </linearGradient>
                                                </defs>
                                                <RechartsTooltip 
                                                    formatter={(value, name) => [value, 'Cards']}
                                                    labelFormatter={(label) => `Date: ${label}`}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #d9d9d9',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                    }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="count" 
                                                    stroke="#2563eb" 
                                                    fill="url(#totalCardsGradient)"
                                                    strokeWidth={2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>

                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card style={{ 
                                    borderRadius: 12, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>AVG Resolution Time</div>
                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                                                {formatMinutes(averages.resolutionTime)}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            width: 24, 
                                            height: 24, 
                                            borderRadius: '50%', 
                                            background: '#3b82f620',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            color: '#3b82f6',
                                            fontWeight: 600
                                        }}>
                                            i
                                        </div>
                                    </div>
                                    <div 
                                        style={{ 
                                            height: 120, 
                                            marginTop: 16, 
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => handleChartClick(chartsData.resolutionTime, "Resolution Time Distribution")}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartsData.resolutionTime}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip 
                                                    formatter={(value, name) => [value, 'Cards']}
                                                    labelFormatter={(label) => `Time Group: ${label}`}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #d9d9d9',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                    }}
                                                />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card style={{ 
                                    borderRadius: 12, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>AVG First Action Time</div>
                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                                                {formatMinutes(averages.firstActionTime)}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            width: 24, 
                                            height: 24, 
                                            borderRadius: '50%', 
                                            background: '#6366f120',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            color: '#6366f1',
                                            fontWeight: 600
                                        }}>
                                            i
                                        </div>
                                    </div>
                                    <div 
                                        style={{ 
                                            height: 120, 
                                            marginTop: 16, 
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => handleChartClick(chartsData.firstActionTime, "First Action Time Distribution")}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartsData.firstActionTime}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip 
                                                    formatter={(value, name) => [value, 'Cards']}
                                                    labelFormatter={(label) => `Time Group: ${label}`}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #d9d9d9',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                    }}
                                                />
                                                <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card style={{ 
                                    borderRadius: 12, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>AVG TS Done Time</div>
                                            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                                                {formatMinutes(averages.resolutionTimeTS)}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            width: 24, 
                                            height: 24, 
                                            borderRadius: '50%', 
                                            background: '#0ea5e920',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            color: '#0ea5e9',
                                            fontWeight: 600
                                        }}>
                                            i
                                        </div>
                                    </div>
                                    <div 
                                        style={{ 
                                            height: 120, 
                                            marginTop: 16, 
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => handleChartClick(chartsData.resolutionTimeTS, "TS Done Time Distribution")}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartsData.resolutionTimeTS}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip 
                                                    formatter={(value, name) => [value, 'Cards']}
                                                    labelFormatter={(label) => `Time Group: ${label}`}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #d9d9d9',
                                                        borderRadius: '6px',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                    }}
                                                />
                                                <Bar dataKey="count" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                </Card>
                            </Col>
                        </Row>

                        {/* Heatmap Section */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>Resolution Time Heatmap</span>
                                    <Select
                                        value={selectedHeatmapField}
                                        onChange={setSelectedHeatmapField}
                                        style={{ width: 200 }}
                                        size="small"
                                    >
                                        <Select.Option value="resolutionTime">Resolution Time</Select.Option>
                                        <Select.Option value="firstActionTime">First Action Time</Select.Option>
                                        <Select.Option value="resolutionTimeTS">TS Done Time</Select.Option>
                                    </Select>
                                    {heatmapFilter && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Filtered: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][heatmapFilter.weekday]} {heatmapFilter.hour}:00
                                            </Text>
                                            <Button 
                                                size="small" 
                                                onClick={() => {
                                                    setHeatmapFilter(null);
                                                    setFilteredData(data.filter((card) => {
                                                        const hasApp = selectedApp ? card.labels?.some(l => l === selectedApp) : true;
                                                        const hasMember = selectedMember ? card.members?.includes(selectedMember) : true;
                                                        const hasTeam = selectedTeam ? getCardTeam(card) === selectedTeam : true;
                                                        const hasGroup = selectedGroup ? getCardGroup(card) === selectedGroup : true;
                                                        return hasApp && hasMember && hasTeam && hasGroup;
                                                    }));
                                                }}
                                            >
                                                Clear Filter
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            }
                            style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        >
                            <HeatmapOfWeek 
                                cards={filteredData}
                                field={selectedHeatmapField}
                                onCellClick={handleHeatmapCellClick}
                                heatmapFilter={heatmapFilter}
                            />
                        </Card>

                        {/* TS Team Analysis */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>TS Team Analysis</span>
                                    <Badge count={timeAndCountData.member.resolutionTime.length} style={{ backgroundColor: '#2563eb' }} />
                                </div>
                            }
                            style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        >
                            <Row gutter={[24, 24]}>
                                {Object.entries(timeAndCountData.member).map(([key, data]) => (
                                    <Col xs={24} lg={8} key={`member-chart-${key}`}>
                                        <Card
                                            title={CHART_TITLES[key]}
                                            size="small"
                                            style={{ borderRadius: 12 }}
                                        >
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart
                                                    layout="vertical"
                                                    data={data.sort((a, b) => b.time - a.time)}
                                                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                                >
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="name" type="category" width={100} />
                                                    <RechartsTooltip />
                                                    <Bar dataKey="time" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>

                        {/* App Analysis */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>App Analysis</span>
                                    <Badge count={timeAndCountData.app.resolutionTime.length} style={{ backgroundColor: '#2563eb' }} />
                                </div>
                            }
                            style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        >
                            <Row gutter={[24, 24]}>
                                {Object.entries(timeAndCountData.app).map(([key, data]) => (
                                    <Col xs={24} lg={8} key={`app-chart-${key}`}>
                                        <Card
                                            title={CHART_TITLES[key]}
                                            size="small"
                                            style={{ borderRadius: 12 }}
                                        >
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart
                                                    layout="vertical"
                                                    data={data.sort((a, b) => b.time - a.time)}
                                                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                                >
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="name" type="category" width={100} />
                                                    <RechartsTooltip />
                                                    <Bar dataKey="time" fill="#10b981" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card>

                        {/* TS Team Leaderboard */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <TrophyOutlined style={{ color: '#f59e0b' }} />
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>TS Team Leaderboard</span>
                                </div>
                            }
                            style={{ borderRadius: 16, marginBottom: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        >
                            <AgentLeaderboard data={filteredData} />
                        </Card>

                        {/* Data Table */}
                        <Card
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>Resolution Time Details</span>
                                    <Badge count={filteredData.length} style={{ backgroundColor: '#2563eb' }} />
                                </div>
                            }
                            style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        >
                            <Table
                                columns={columns}
                                dataSource={sortedData}
                                rowKey="cardUrl"
                                pagination={{
                                    pageSize: 20,
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
                                }}
                                onChange={(pagination, filters, sorter) => {
                                    if (sorter.field) {
                                        handleSort(sorter.field);
                                    }
                                }}
                                onRow={(record) => ({
                                    onClick: () => handleRowClick(record),
                                    style: { cursor: 'pointer' }
                                })}
                            />
                        </Card>
                    </>
                )}

                {/* Chart Detail Modal */}
                <Modal
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 18 }}>{selectedChartTitle}</span>
                        </div>
                    }
                    open={chartDetailModal}
                    onCancel={handleCloseChartModal}
                    footer={null}
                    width={800}
                    style={{ top: 20 }}
                >
                    {selectedChartData && (
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <Text type="secondary">
                                    Click vào biểu đồ để xem chi tiết phân bố thời gian
                                </Text>
                            </div>
                            
                            <div style={{ height: 400, marginBottom: 24 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={selectedChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <RechartsTooltip 
                                            formatter={(value, name) => [value, 'Cards']}
                                            labelStyle={{ fontWeight: 600 }}
                                        />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                                <Title level={5} style={{ marginBottom: 16 }}>Chi tiết phân bố:</Title>
                                <Row gutter={[16, 8]}>
                                    {selectedChartData.map((item, index) => (
                                        <Col xs={12} sm={8} md={6} key={index}>
                                            <div style={{ 
                                                background: 'white', 
                                                padding: 12, 
                                                borderRadius: 6,
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                                                    {item.count} cards
                                                </div>
                                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                                    {((item.count / selectedChartData.reduce((sum, i) => sum + i.count, 0)) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Card Detail Modal */}
                <CardDetailModal
                    open={cardDetailModalOpen}
                    onClose={() => {
                        setCardDetailModalOpen(false);
                        setSelectedCardId(null);
                    }}
                    cardId={selectedCardId}
                />
            </div>
        </div>
    );
};

const AgentLeaderboard = ({ data }) => {
    const leaderboard = calculateAgentLeaderboard(data);

    if (leaderboard.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">No data available for TS Team Leaderboard</Text>
            </div>
        );
    }

    const columns = [
        {
            title: 'Rank',
            key: 'rank',
            width: 80,
            render: (_, record, index) => {
                let color = 'default';
                let icon = null;
                
                if (index === 0) {
                    color = 'gold';
                    icon = <TrophyOutlined />;
                } else if (index === 1) {
                    color = 'silver';
                    icon = <StarOutlined />;
                } else if (index === 2) {
                    color = 'bronze';
                    icon = <FireOutlined />;
                }

                return (
                    <Badge
                        count={index + 1}
                        color={color}
                        style={{ backgroundColor: color === 'gold' ? '#f59e0b' : color === 'silver' ? '#94a3b8' : '#cd7f32' }}
                        icon={icon}
                    />
                );
            }
        },
        {
            title: 'Member',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Total Cards',
            dataIndex: 'cardCount',
            key: 'cardCount',
            render: (value) => <Tag color="blue">{value}</Tag>
        },
        {
            title: 'Avg Resolution Time',
            dataIndex: 'avgResolutionTime',
            key: 'avgResolutionTime',
            render: (value) => (
                <Text style={{ color: '#3b82f6', fontWeight: 600 }}>
                    {formatMinutes(value)}
                </Text>
            )
        },
        {
            title: 'Avg First Action Time',
            dataIndex: 'avgFirstActionTime',
            key: 'avgFirstActionTime',
            render: (value) => (
                <Text style={{ color: '#6366f1', fontWeight: 600 }}>
                    {formatMinutes(value)}
                </Text>
            )
        },
        {
            title: 'Avg TS Done Time',
            dataIndex: 'avgResolutionTimeTS',
            key: 'avgResolutionTimeTS',
            render: (value) => (
                <Text style={{ color: '#0ea5e9', fontWeight: 600 }}>
                    {formatMinutes(value)}
                </Text>
            )
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={leaderboard}
            rowKey="name"
            pagination={false}
            size="small"
        />
    );
};

export default ResolutionTimeList;
