import React, { useState, useEffect } from 'react';
import { getDevResolutionTimes } from '../api/devCardsApi';
import { DatePicker, Button, Table, Alert, Spin, Space, Select, Row, Col, Card, Statistic, Typography } from 'antd';
import dayjs from 'dayjs';
import appData from '../data/app.json';
import members from '../data/members.json';

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

const columns = [
    {
        title: 'Card Name',
        dataIndex: 'cardName',
        key: 'cardName',
    },
    {
        title: 'Resolution Time',
        dataIndex: 'resolutionTime',
        key: 'resolutionTime',
        render: (v) => formatMinutes(Number(v)),
    },
    {
        title: 'First Action Time',
        dataIndex: 'firstActionTime',
        key: 'firstActionTime',
        render: (v) => formatMinutes(Number(v)),
    },
    {
        title: 'Resolution Time Dev',
        dataIndex: 'resolutionTimeDev',
        key: 'resolutionTimeDev',
        render: (v) => formatMinutes(Number(v)),
    },
];

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
                {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
                <Spin spinning={loading} tip="Đang tải...">
                    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px 0 rgba(30,41,59,0.06)', padding: 16 }}>
                        <Table
                            columns={columns}
                            dataSource={filteredCards.map(card => ({ ...card, key: card.cardId }))}
                            pagination={{ pageSize: 20 }}
                            locale={{ emptyText: 'Không có dữ liệu' }}
                            style={{ width: '100%' }}
                        />
                    </div>
                </Spin>
            </div>
        </div>
    );
};

export default DevResolutionTime;