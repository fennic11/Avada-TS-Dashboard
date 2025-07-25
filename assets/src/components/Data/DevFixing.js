import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Row, Col, Button, Select, DatePicker, Modal, Spin, Tag, Space, Divider, Progress } from 'antd';
import { getDevFixingCards } from '../../api/trelloApi';
import appData from '../../data/app.json';
import { ReloadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const teamColors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#7b1fa2', '#388e3c'];

export default function DevFixingDashboard() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [selectedApp, setSelectedApp] = useState('Tất cả');
  const [selectedTeam, setSelectedTeam] = useState('Tất cả');
  const [dateRange, setDateRange] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Map app name to product_team
  const appToTeam = {};
  const teamSet = new Set();
  appData.forEach(app => {
    appToTeam[app.app_name.toLowerCase().trim()] = app.product_team;
    if (app.product_team) teamSet.add(app.product_team);
  });
  const allTeams = ['Tất cả', ...Array.from(teamSet)];

  // Thêm hàm extractSlackLink
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
      // Lấy Slack link từ desc
      const slackLink = extractSlackLink(card.desc || '');
      return {
        ...card,
        app: appLabel ? appLabel.name : 'Không có app',
        createDate: createDate,
        appKey: appKey,
        productTeam: productTeam,
        slackLink: slackLink
      };
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const pendingData = await getDevFixingCards('63c7b1a68e5576001577d65c');
      const mappedPendingCards = processCards(pendingData);
      setCards(mappedPendingCards);
    } catch (error) {
      // eslint-disable-next-line
      console.error('Lỗi khi lấy dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Thống kê team
  const teamStats = cards.reduce((acc, card) => {
    if (!card.productTeam) return acc;
    acc[card.productTeam] = (acc[card.productTeam] || 0) + 1;
    return acc;
  }, {});
  const teamAppStats = cards.reduce((acc, card) => {
    if (!card.productTeam || !card.app) return acc;
    if (!acc[card.productTeam]) {
      acc[card.productTeam] = { cardCount: 0, apps: new Set() };
    }
    acc[card.productTeam].cardCount += 1;
    acc[card.productTeam].apps.add(card.app);
    return acc;
  }, {});
  const teamChartDataWithApps = Object.entries(teamAppStats).map(([team, data]) => ({
    team,
    count: data.cardCount,
    appCount: data.apps.size
  }));

  // Thống kê app
  const appStats = filteredCards.reduce((acc, card) => {
    acc[card.app] = (acc[card.app] || 0) + 1;
    return acc;
  }, {});
  const totalCards = filteredCards.length;
  const top3Apps = Object.entries(appStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([app]) => app);

  // Table columns
  const columns = [
    {
      title: 'Card',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <a style={{ fontWeight: 500 }} onClick={() => { setSelectedCard(record); setModalOpen(true); }}>{text}</a>
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
      title: 'Due',
      dataIndex: 'due',
      key: 'due',
      render: (due) => due ? new Date(due).toLocaleString('vi-VN') : 'Không có'
    },
    {
      title: 'Create Date',
      dataIndex: 'createDate',
      key: 'createDate',
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : 'Không có'
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
    <div style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc 0%,#e0e7ef 100%)', padding: 0 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '56px 20px 40px 20px' }}>
        {/* Label cho page */}
        <div style={{ fontWeight: 900, fontSize: 38, color: '#2563eb', marginBottom: 36, letterSpacing: 1, textAlign: 'center' }}>
          DEV Pending Cards
        </div>
        {/* Filter box lớn */}
        <Card style={{ borderRadius: 24, boxShadow: '0 8px 32px 0 rgba(30,41,59,0.10)', marginBottom: 48, background: '#fff' }} bodyStyle={{ padding: 36 }}>
          <Row gutter={[24, 24]} align="middle" justify="center">
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%', borderRadius: 12, fontSize: 18, height: 48 }}
                allowClear
                format="YYYY-MM-DD"
                size="large"
                placeholder={["Start date", "End date"]}
              />
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                value={selectedTeam}
                onChange={setSelectedTeam}
                style={{ width: '100%', borderRadius: 12, fontSize: 18, height: 48 }}
                size="large"
              >
                {allTeams.map(team => (
                  <Select.Option key={team} value={team}>{team}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                value={selectedApp}
                onChange={setSelectedApp}
                style={{ width: '100%', borderRadius: 12, fontSize: 18, height: 48 }}
                showSearch
                optionFilterProp="children"
                size="large"
              >
                <Select.Option value="Tất cả">Tất cả</Select.Option>
                {[...new Set(cards.map(card => card.app))].map(app => (
                  <Select.Option key={app} value={app}>{app}</Select.Option>
                ))}
              </Select>
            </Col>
            {/* Bỏ button làm mới */}
          </Row>
        </Card>
        <Row gutter={[40, 40]} align="top" justify="space-between" style={{ marginBottom: 48, flexWrap: 'wrap' }}>
          {/* Box team bên trái */}
          <Col xs={24} md={16} lg={17}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center', minHeight: 140 }}>
              {teamChartDataWithApps.sort((a, b) => b.count - a.count).slice(0, 5).map((entry, idx) => (
                <div
                  key={entry.team}
                  style={{
                    minWidth: 130,
                    maxWidth: 170,
                    padding: 28,
                    borderRadius: 22,
                    background: teamColors[idx % teamColors.length] + '10',
                    border: `2.5px solid ${teamColors[idx % teamColors.length]}33`,
                    boxShadow: '0 6px 24px rgba(30,41,59,0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: 12,
                    ...(selectedTeam === entry.team ? {
                      borderColor: teamColors[idx % teamColors.length],
                      background: teamColors[idx % teamColors.length] + '22',
                      boxShadow: `0 8px 32px ${teamColors[idx % teamColors.length]}22`,
                    } : {}),
                  }}
                  onClick={() => setSelectedTeam(selectedTeam === entry.team ? 'Tất cả' : entry.team)}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: teamColors[idx % teamColors.length], marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, color: teamColors[idx % teamColors.length], fontSize: 18, textAlign: 'center' }}>{entry.team}</div>
                  <div style={{ fontWeight: 800, color: '#222', marginTop: 4, fontSize: 24 }}>{entry.count}/{entry.appCount}</div>
                  <div style={{ color: '#666', fontWeight: 500, textAlign: 'center', fontSize: 14, marginTop: 2 }}>cards/apps</div>
                </div>
              ))}
            </div>
          </Col>
          {/* Filter + tiêu đề bên phải */}
          <Col xs={24} md={8} lg={7}>
            {/* Bỏ filter card cũ, chỉ giữ box team/app/bảng */}
          </Col>
        </Row>
        {/* Tổng số cards */}
        <div style={{ fontWeight: 800, fontSize: 26, color: '#2563eb', marginBottom: 24, letterSpacing: 1 }}>
          Tổng số cards: {totalCards}
        </div>
        {/* Box từng app */}
        <div
          style={{
            display: 'flex',
            gap: 44,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 56,
            justifyContent: 'flex-start',
          }}
        >
          {Object.entries(appStats)
            .sort(([, a], [, b]) => b - a)
            .map(([app, count], idx) => {
              const percent = totalCards > 0 ? (count / totalCards) * 100 : 0;
              const isTopApp = top3Apps.includes(app);
              const isSelected = selectedApp === app;
              return (
                <div
                  key={app}
                  style={{
                    width: 220,
                    height: 220,
                    minWidth: 200,
                    minHeight: 200,
                    maxWidth: 260,
                    maxHeight: 260,
                    padding: 32,
                    borderRadius: 24,
                    background: isTopApp ? '#ffeaea' : (isTopApp ? '#f0f9ff' : '#fff'),
                    border: isTopApp ? '3px solid #e53935' : (isSelected ? '3px solid #2563eb' : '2.5px solid #e0e7ef'),
                    boxShadow: isSelected ? '0 12px 40px #2563eb22' : '0 6px 24px rgba(30,41,59,0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: 32,
                    textAlign: 'center',
                  }}
                  onClick={() => setSelectedApp(selectedApp === app ? 'Tất cả' : app)}
                >
                  <div style={{ fontWeight: 600, color: isTopApp ? '#e53935' : (isTopApp ? '#0ea5e9' : '#2563eb'), fontSize: 17, marginBottom: 12 }}>{app}</div>
                  <div style={{ fontWeight: 800, color: '#222', fontSize: 24 }}>{count} cards</div>
                  <div style={{ width: '92%', margin: '18px auto 0 auto' }}>
                    <Progress percent={Math.round(percent)} size="small" showInfo={false} strokeColor={isTopApp ? '#e53935' : '#2563eb'} />
                  </div>
                  <div style={{ color: isTopApp ? '#e53935' : '#64748b', fontWeight: 500, fontSize: 18, marginTop: 16 }}>{percent.toFixed(1)}%</div>
                  {isSelected && <div style={{ color: isTopApp ? '#e53935' : '#2563eb', fontWeight: 700, fontSize: 16, marginTop: 10 }}>Đã chọn</div>}
                </div>
              );
            })}
        </div>
        <Divider style={{ margin: '48px 0 32px 0', borderRadius: 8, border: '2px solid #e0e7ef' }} />
        <Card style={{ borderRadius: 24, boxShadow: '0 8px 32px 0 rgba(30,41,59,0.10)' }} bodyStyle={{ padding: 32 }}>
          <Spin spinning={loading} tip="Đang tải...">
            <Table
              columns={columns}
              dataSource={filteredCards.map(card => ({ ...card, key: card.id }))}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'Không có dữ liệu' }}
              style={{ width: '100%' }}
              scroll={{ x: 900 }}
              rowClassName={() => 'ant-table-row-hover'}
              bordered
              size="large"
              tableLayout="auto"
            />
          </Spin>
        </Card>
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={700}
          title={selectedCard ? selectedCard.name : ''}
          bodyStyle={{ padding: 36, borderRadius: 18 }}
          style={{ borderRadius: 18 }}
        >
          {selectedCard && (
            <div style={{ fontSize: 18, lineHeight: 1.7 }}>
              <p><b>App:</b> {selectedCard.app}</p>
              <p><b>Team:</b> {selectedCard.productTeam}</p>
              <p><b>Due:</b> {selectedCard.due ? new Date(selectedCard.due).toLocaleString('vi-VN') : 'Không có'}</p>
              <p><b>Ngày tạo:</b> {selectedCard.createDate ? new Date(selectedCard.createDate).toLocaleString('vi-VN') : 'Không có'}</p>
              <p><b>Slack Link:</b> {selectedCard.slackLink ? <a href={selectedCard.slackLink} target="_blank" rel="noopener noreferrer">Mở Slack</a> : 'Không có'}</p>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
