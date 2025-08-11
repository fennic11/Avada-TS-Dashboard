import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Row, Col, Button, Select, DatePicker, Modal, Spin, Tag, Space, Divider, Progress, Statistic, Alert, Badge, Checkbox } from 'antd';
import { getDevFixingCards } from '../../api/trelloApi';
import appData from '../../data/app.json';
import { ReloadOutlined, BugOutlined, TeamOutlined, AppstoreOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import CardDetailModal from '../CardDetailModal';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const teamColors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#7b1fa2', '#388e3c'];

// Animation variants
const boxVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: 'spring', stiffness: 80 } })
};

const metricVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.08, type: 'spring', stiffness: 80 } })
};

export default function DevFixingDashboard() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [selectedApp, setSelectedApp] = useState('Tất cả');
  const [selectedTeam, setSelectedTeam] = useState('Tất cả');
  const [dateRange, setDateRange] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cardDetailModalOpen, setCardDetailModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    pending: true,
    done: false
  });

  // List IDs for different statuses
  const LIST_IDS = {
    pending: '63c7b1a68e5576001577d65c', // Waiting to fix (from dev)
    done: '663ae7d6feac5f2f8d7a1c86'     // Fix done from dev
  };

  // Map app name to product_team
  const appToTeam = {};
  const teamSet = new Set();
  appData.forEach(app => {
    appToTeam[app.app_name.toLowerCase().trim()] = app.product_team;
    if (app.product_team) teamSet.add(app.product_team);
  });
  const allTeams = ['Tất cả', ...Array.from(teamSet)];

  // Extract Slack link function
  function extractSlackLink(description) {
    if (!description) return null;
    let decodedDescription = description;
    try {
      decodedDescription = decodeURIComponent(description);
    } catch (e) {}
    const slackRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?slack\.com\/[\w\-\/?#&=.%]+/g;
    const matches = decodedDescription.match(slackRegex);
    if (matches && matches.length > 0) {
      let cleanUrl = matches[0];
      cleanUrl = cleanUrl.replace(/[)\]%].*$/, '');
      return cleanUrl;
    }
    return null;
  }

  // Calculate days pending
  function calculateDaysPending(card) {
    const now = new Date();
    const createDate = card.createDate ? new Date(card.createDate) : null;
    if (!createDate) return 0;
    return Math.ceil((now - createDate) / (1000 * 60 * 60 * 24));
  }

  const processCards = (cards) => {
    return cards.map(card => {
      const appLabel = card.labels.find(label => label.name.includes('App:'));
      const createAction = card.actions?.find(action => action.type === 'createCard');
      let createDate = createAction?.date ? new Date(createAction.date) : null;
      if (!createDate && card.due) {
        const dueDate = new Date(card.due);
        createDate = new Date(dueDate.getTime() - (2 * 24 * 60 * 60 * 1000));
      }
      let appKey = '';
      if (appLabel) {
        appKey = appLabel.name.replace('App:', '').trim().toLowerCase();
      } else if (card.name) {
        appKey = card.name.trim().toLowerCase();
      }
      const productTeam = appToTeam[appKey] || null;
      const slackLink = extractSlackLink(card.desc || '');
      const daysPending = calculateDaysPending(card);
      
      return {
        ...card,
        app: appLabel ? appLabel.name : 'Không có app',
        createDate: createDate,
        appKey: appKey,
        productTeam: productTeam,
        slackLink: slackLink,
        daysPending: daysPending
      };
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let allCards = [];
      
      // Fetch pending cards if checkbox is checked
      if (filterOptions.pending) {
        const pendingData = await getDevFixingCards(LIST_IDS.pending);
        const mappedPendingCards = processCards(pendingData);
        allCards = [...allCards, ...mappedPendingCards];
      }
      
      // Fetch done cards if checkbox is checked
      if (filterOptions.done) {
        const doneData = await getDevFixingCards(LIST_IDS.done);
        const mappedDoneCards = processCards(doneData);
        allCards = [...allCards, ...mappedDoneCards];
      }
      
      // If no checkboxes are selected, default to pending
      if (!filterOptions.pending && !filterOptions.done) {
        const pendingData = await getDevFixingCards(LIST_IDS.pending);
        const mappedPendingCards = processCards(pendingData);
        allCards = mappedPendingCards;
      }
      
      setCards(allCards);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterOptions.pending, filterOptions.done]);

  // Filter logic
  let filteredCards = cards;
  if (selectedApp !== 'Tất cả') {
    filteredCards = filteredCards.filter(card => card.app === selectedApp);
  }
  if (selectedTeam !== 'Tất cả') {
    filteredCards = filteredCards.filter(card => card.productTeam === selectedTeam);
  }
  if (dateRange && dateRange.length === 2) {
    const [start, end] = dateRange;
    filteredCards = filteredCards.filter(card => {
      if (!card.createDate) return false;
      return card.createDate >= start.startOf('day').toDate() && card.createDate <= end.endOf('day').toDate();
    });
  }

  // Calculate metrics
  const totalBugs = filteredCards.length;
  const avgWaitTime = filteredCards.length > 0 
    ? (filteredCards.reduce((sum, card) => sum + card.daysPending, 0) / filteredCards.length).toFixed(1)
    : 0;
  const todayBugs = cards.filter(card => {
    const today = new Date();
    const createDate = card.createDate;
    return createDate && today.toDateString() === createDate.toDateString();
  }).length;

  // Team statistics
  const teamStats = cards.reduce((acc, card) => {
    if (!card.productTeam) return acc;
    if (!acc[card.productTeam]) {
      acc[card.productTeam] = {
        total: 0,
        avgWaitTime: 0,
        totalWaitTime: 0
      };
    }
    acc[card.productTeam].total += 1;
    acc[card.productTeam].totalWaitTime += card.daysPending;
    acc[card.productTeam].avgWaitTime = (acc[card.productTeam].totalWaitTime / acc[card.productTeam].total).toFixed(1);
    return acc;
  }, {});

  // App statistics
  const appStats = filteredCards.reduce((acc, card) => {
    if (!acc[card.app]) {
      acc[card.app] = {
        total: 0,
        avgWaitTime: 0,
        totalWaitTime: 0
      };
    }
    acc[card.app].total += 1;
    acc[card.app].totalWaitTime += card.daysPending;
    acc[card.app].avgWaitTime = (acc[card.app].totalWaitTime / acc[card.app].total).toFixed(1);
    return acc;
  }, {});

  // Chart data
  const teamChartData = Object.entries(teamStats).map(([team, stats]) => ({
    name: team,
    bugs: stats.total,
    avgWait: parseFloat(stats.avgWaitTime)
  }));

  const appChartData = Object.entries(appStats)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)
    .map(([app, stats]) => ({
      name: app,
      bugs: stats.total,
      avgWait: parseFloat(stats.avgWaitTime)
    }));

  // Table columns
  const columns = [
    {
      title: 'Bug Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a 
          style={{ fontWeight: 500, color: '#2563eb' }}
          onClick={() => { setSelectedCardId(record.id); setCardDetailModalOpen(true); }}
        >
          {text}
        </a>
      )
    },
    {
      title: 'App',
      dataIndex: 'app',
      key: 'app',
      render: (app) => <Tag color="blue">{app}</Tag>
    },
    {
      title: 'Team',
      dataIndex: 'productTeam',
      key: 'productTeam',
      render: (team) => team ? <Tag color="geekblue">{team}</Tag> : <Tag>Không có</Tag>
    },

    {
      title: 'Due Date',
      dataIndex: 'due',
      key: 'due',
      render: (due) => {
        if (!due) return <span style={{ color: '#94a3b8' }}>Không có</span>;
        const dueDate = new Date(due);
        const isOverdue = new Date() > dueDate;
        return (
          <span style={{ 
            color: isOverdue ? '#e53935' : '#64748b',
            fontWeight: isOverdue ? 600 : 400
          }}>
            {dueDate.toLocaleDateString('vi-VN')}
          </span>
        );
      }
    },
    {
      title: 'Slack Link',
      dataIndex: 'slackLink',
      key: 'slackLink',
      render: (link) => link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0ea5e9', fontWeight: 600, textDecoration: 'underline' }}
        >
          Mở Slack
        </a>
      ) : (
        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có</span>
      )
    }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f5f5f5', padding: 0 }}>
      <div style={{ maxWidth: '100%', margin: '0 auto', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1e293b', marginBottom: 8 }}>
            <BugOutlined style={{ marginRight: 12, color: '#2563eb' }} />
            Bugs Management Dashboard
          </Title>
          <Text type="secondary">Monitor and control bugs across teams and apps</Text>
        </div>

        {/* Key Metrics with animation */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          {[{
            title: 'Total Bugs',
            value: totalBugs,
            valueStyle: { color: '#e53935', fontSize: 28, fontWeight: 700 },
            prefix: <BugOutlined style={{ marginRight: 8 }} />,
            suffix: <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>+{todayBugs} today</div>
          }, {
            title: 'Active Teams',
            value: Object.keys(teamStats).length,
            valueStyle: { color: '#2e7d32', fontSize: 28, fontWeight: 700 },
            prefix: <TeamOutlined style={{ marginRight: 8 }} />
          }, {
            title: 'Active Apps',
            value: Object.keys(appStats).length,
            valueStyle: { color: '#9c27b0', fontSize: 28, fontWeight: 700 },
            prefix: <AppstoreOutlined style={{ marginRight: 8 }} />
          }].map((item, i) => (
            <Col xs={24} sm={12} md={8} key={item.title}>
              <motion.div
                custom={i}
                initial="hidden"
                animate="visible"
                variants={metricVariants}
                whileHover={{ scale: 1.04, boxShadow: '0 4px 24px #e5393533' }}
                style={{ borderRadius: 8 }}
              >
                <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Statistic
                    title={item.title}
                    value={item.value}
                    valueStyle={item.valueStyle}
                    prefix={item.prefix}
                    suffix={item.suffix}
                  />
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* Filters */}
        <Card style={{ borderRadius: 8, marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
                allowClear
                format="YYYY-MM-DD"
                placeholder={["Start date", "End date"]}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                value={selectedTeam}
                onChange={setSelectedTeam}
                style={{ width: '100%' }}
                placeholder="Select Team"
                allowClear
              >
                {allTeams.map(team => (
                  <Select.Option key={team} value={team}>{team}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                value={selectedApp}
                onChange={setSelectedApp}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="children"
                placeholder="Select App"
                allowClear
              >
                <Select.Option value="Tất cả">All Apps</Select.Option>
                {[...new Set(cards.map(card => card.app))].map(app => (
                  <Select.Option key={app} value={app}>{app}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchData}
                style={{ width: '100%' }}
              >
                Refresh Data
              </Button>
            </Col>
          </Row>
          
          {/* Checkbox Filters */}
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <Space>
                <Checkbox
                  checked={filterOptions.pending}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, pending: e.target.checked }))}
                >
                  Pending
                </Checkbox>
                <Checkbox
                  checked={filterOptions.done}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, done: e.target.checked }))}
                >
                  Done
                </Checkbox>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Team Overview with animation */}
        <Card
          title="Team Overview"
          style={{ borderRadius: 8, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <Row gutter={[16, 16]}>
            <AnimatePresence>
              {Object.entries(teamStats).map(([team, stats], idx) => (
                <Col xs={24} sm={12} md={8} lg={6} key={team}>
                  <motion.div
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={boxVariants}
                    whileHover={{ scale: 1.06, boxShadow: `0 8px 32px ${teamColors[idx % teamColors.length]}33` }}
                    style={{ borderRadius: 8 }}
                  >
                    <Card
                      size="small"
                      style={{
                        borderRadius: 8,
                        border: `1px solid ${teamColors[idx % teamColors.length]}33`,
                        background: `${teamColors[idx % teamColors.length]}08`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setSelectedTeam(selectedTeam === team ? 'Tất cả' : team)}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: teamColors[idx % teamColors.length], 
                          fontSize: 14, 
                          marginBottom: 8 
                        }}>
                          {team}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 20, color: '#1e293b', marginBottom: 4 }}>
                          {stats.total} bugs
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          {totalBugs > 0 ? ((stats.total / totalBugs) * 100).toFixed(1) : 0}% of total
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </AnimatePresence>
          </Row>
        </Card>

        {/* App Overview with animation */}
        <Card
          title="App Overview"
          style={{ borderRadius: 8, marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <Row gutter={[16, 16]}>
            <AnimatePresence>
              {Object.entries(appStats)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([app, stats], idx) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={app}>
                    <motion.div
                      custom={idx}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={boxVariants}
                      whileHover={{ scale: 1.06, boxShadow: `0 8px 32px ${teamColors[idx % teamColors.length]}33` }}
                      style={{ borderRadius: 8 }}
                    >
                      <Card
                        size="small"
                        style={{
                          borderRadius: 8,
                          border: `1px solid ${teamColors[idx % teamColors.length]}33`,
                          background: `${teamColors[idx % teamColors.length]}08`,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setSelectedApp(selectedApp === app ? 'Tất cả' : app)}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: teamColors[idx % teamColors.length], 
                            fontSize: 14, 
                            marginBottom: 8 
                          }}>
                            {app}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 20, color: '#1e293b', marginBottom: 4 }}>
                            {stats.total} bugs
                          </div>
                          <div style={{ color: '#64748b', fontSize: 12 }}>
                            {totalBugs > 0 ? ((stats.total / totalBugs) * 100).toFixed(1) : 0}% of total
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
            </AnimatePresence>
          </Row>
        </Card>

        {/* Charts Section (PieChart) */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} lg={12}>
            <Card
              title="Team Bug Distribution"
              style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={teamChartData}
                    dataKey="bugs"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {teamChartData.map((entry, idx) => (
                      <Cell key={`cell-team-${idx}`} fill={teamColors[idx % teamColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} bugs`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title="App Bug Distribution"
              style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={appChartData}
                    dataKey="bugs"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {appChartData.map((entry, idx) => (
                      <Cell key={`cell-app-${idx}`} fill={teamColors[idx % teamColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} bugs`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Bugs Table */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Pending Bugs List</span>
              <Badge count={filteredCards.length} style={{ backgroundColor: '#2563eb' }} />
            </div>
          }
          style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <Spin spinning={loading} tip="Loading...">
            <Table
              columns={columns}
              dataSource={filteredCards.map(card => ({ ...card, key: card.id }))}
              pagination={{ pageSize: 15 }}
              locale={{ emptyText: 'No pending bugs found' }}
              style={{ width: '100%' }}
              scroll={{ x: 1000 }}
              size="middle"
            />
          </Spin>
        </Card>

        {/* Card Detail Modal */}
        <CardDetailModal
          open={cardDetailModalOpen}
          onClose={() => setCardDetailModalOpen(false)}
          cardId={selectedCardId}
        />
      </div>
    </div>
  );
}
