import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Select, MenuItem, InputLabel, FormControl, CircularProgress, Chip
} from '@mui/material';
import { getCardsByList } from '../../api/trelloApi';
import memberList from '../../data/members.json';
import listsId from '../../data/listsId.json';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#B455B6', '#FF6666', '#26A69A', '#FFA726'];

const IssueSummary = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const [selectedApp, setSelectedApp] = useState('Tất cả');
  const [chartType, setChartType] = useState('pie');

  const formatDate = (str) => {
    if (!str) return '';
    const d = new Date(str);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getOverdueDays = (due) => {
    if (!due) return null;
    const now = new Date();
    const dueDate = new Date(due);
    if (dueDate >= now) return null;
    const diff = now - dueDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getAgentName = (card) => {
    const agent = memberList.find(m => card.idMembers?.includes(m.id));
    return agent ? agent.name : 'CS';
  };

  const getChartDataByStatus = (status) => {
    const dataMap = {};
    issues.forEach(card => {
      if (card.status === status) {
        const agent = getAgentName(card);
        dataMap[agent] = (dataMap[agent] || 0) + 1;
      }
    });
    return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const allResults = [];

        const getListIdByName = (name) =>
          listsId.find(l => l.name === name)?.id;

        const getAllCardsFromLists = async (listNames, filterFn = null, status) => {
          const cards = [];
          for (let name of listNames) {
            const listId = getListIdByName(name);
            if (!listId) continue;
            const listCards = await getCardsByList(listId);
            listCards.forEach(card => {
              if (!filterFn || filterFn(card)) {
                cards.push({ ...card, status });
              }
            });
          }
          return cards;
        };

        const isNewIssuesExpired = (card) => {
          if (!card.due) return false;
          const due = new Date(card.due);
          const created = new Date(due.getTime() - 2 * 24 * 60 * 60 * 1000);
          return now - created > 2 * 24 * 60 * 60 * 1000;
        };

        // Fetch all lists in parallel
        const [pendingCards, expiredNewCards, waitingCards, doingCards, doneCards] = await Promise.all([
          // Pending cards
          getAllCardsFromLists(
            ['Update workflow required or Waiting for access (SLA: 2 days)'],
            null,
            'Pending'
          ),
          // Expired new issues
          getAllCardsFromLists(
            ['New Issues'],
            isNewIssuesExpired,
            'Pending'
          ),
          // Waiting for confirmation
          getAllCardsFromLists(
            ["Waiting for Customer's Confirmation (SLA: 2 days)"],
            null,
            'Waiting for Customer Confirmation'
          ),
          // Doing cards
          getAllCardsFromLists(
            ['Doing (Inshift)'],
            null,
            'Doing'
          ),
          // Done cards
          getAllCardsFromLists(
            listsId.filter(l => l.name.startsWith('Done')).map(l => l.name),
            null,
            'Done'
          )
        ]);

        // Combine all results
        setIssues([
          ...pendingCards,
          ...expiredNewCards,
          ...waitingCards,
          ...doingCards,
          ...doneCards
        ]);

      } catch (err) {
        console.error('Lỗi khi tải issue:', err);
        // TODO: Add error notification for user
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalIssues = issues.length;
  const allStatuses = ['Pending', 'Doing', 'Waiting for Customer Confirmation', 'Done'];

  const allApps = Array.from(new Set(
    issues.flatMap(card =>
      card.labels?.filter(l => l.name.startsWith('App:')).map(l => l.name)
    )
  )).filter(Boolean);

  const totalByStatus = Object.fromEntries(
    allStatuses.map(status => [status, issues.filter(i => i.status === status).length])
  );

  const filtered = issues.filter(card => {
    const matchAgent = selectedAgent === 'Tất cả' || getAgentName(card) === selectedAgent;
    const matchStatus = card.status === selectedStatus;
    const cardApp = card.labels?.find(l => l.name.startsWith('App:'))?.name || 'Không có';
    const matchApp = selectedApp === 'Tất cả' || cardApp === selectedApp;
    return matchAgent && matchStatus && matchApp;
  });

  const filteredCount = filtered.length;
  const totalFilteredStatus = totalByStatus[selectedStatus] || 0;

  const appBoxColor = (i) => COLORS[i % COLORS.length];

  // Sort apps by number of issues descending
  const appStats = allApps.map(app => {
    const count = issues.filter(card =>
      card.labels?.some(label => label.name === app)
    ).length;
    const percent = totalIssues > 0 ? ((count / totalIssues) * 100).toFixed(1) : 0;
    return { app, count, percent };
  }).sort((a, b) => b.count - a.count);

  return (
    <Box 
      sx={{ 
        p: 4,
        maxWidth: '1800px',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)'
      }}
    >
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4,
          fontWeight: 700,
          color: '#1e293b',
          fontSize: { xs: '1.5rem', md: '2rem' }
        }}
      >
        Issues Dashboard
      </Typography>

      {/* Filters Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl 
            sx={{ 
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#ffffff',
                '&:hover fieldset': {
                  borderColor: '#3b82f6'
                }
              }
            }}
          >
            <InputLabel id="agent-label">Chọn Agent</InputLabel>
            <Select
              labelId="agent-label"
              value={selectedAgent}
              label="Chọn Agent"
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <MenuItem value="Tất cả">Tất cả</MenuItem>
              {memberList.map(m => (
                <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>
              ))}
              <MenuItem value="CS">CS</MenuItem>
            </Select>
          </FormControl>

          <FormControl 
            sx={{ 
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#ffffff',
                '&:hover fieldset': {
                  borderColor: '#3b82f6'
                }
              }
            }}
          >
            <InputLabel id="status-label">Trạng thái</InputLabel>
            <Select
              labelId="status-label"
              value={selectedStatus}
              label="Trạng thái"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {allStatuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl 
            sx={{ 
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#ffffff',
                '&:hover fieldset': {
                  borderColor: '#3b82f6'
                }
              }
            }}
          >
            <InputLabel id="app-label">Chọn App</InputLabel>
            <Select
              labelId="app-label"
              value={selectedApp}
              label="Chọn App"
              onChange={(e) => setSelectedApp(e.target.value)}
            >
              <MenuItem value="Tất cả">Tất cả</MenuItem>
              {allApps.map(app => (
                <MenuItem key={app} value={app}>{app}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl 
            sx={{ 
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#ffffff',
                '&:hover fieldset': {
                  borderColor: '#3b82f6'
                }
              }
            }}
          >
            <InputLabel id="chart-label">Loại biểu đồ</InputLabel>
            <Select
              labelId="chart-label"
              value={chartType}
              label="Loại biểu đồ"
              onChange={(e) => setChartType(e.target.value)}
            >
              <MenuItem value="pie">🥧 Biểu đồ tròn</MenuItem>
              <MenuItem value="bar">📊 Biểu đồ cột</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Status Summary */}
        <Box 
          sx={{ 
            mt: 3,
            display: 'flex', 
            gap: 3, 
            flexWrap: 'wrap',
            borderTop: '1px solid #e2e8f0',
            pt: 3
          }}
        >
          {allStatuses.map(status => {
            const count = totalByStatus[status];
            const percent = totalIssues > 0 ? (count / totalIssues * 100).toFixed(1) : 0;
            return (
              <Box 
                key={status}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: status === selectedStatus ? '#f0f9ff' : 'transparent',
                  border: '1px solid #e2e8f0',
                  minWidth: '200px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#f0f9ff',
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => setSelectedStatus(status)}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#64748b',
                    mb: 1
                  }}
                >
                  {status}
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#1e293b'
                  }}
                >
                  {count} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>({percent}%)</span>
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* App Distribution */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3,
            fontWeight: 600,
            color: '#1e293b'
          }}
        >
          📱 Phân bổ theo App
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {appStats.map((appStat, i) => (
            <Box
              key={appStat.app}
              onClick={() => setSelectedApp(appStat.app)}
              sx={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                p: 2,
                borderRadius: 2,
                minWidth: 200,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  backgroundColor: appBoxColor(i)
                },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                },
                ...(selectedApp === appStat.app && {
                  backgroundColor: '#f8fafc',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                })
              }}
            >
              <Typography 
                sx={{ 
                  fontWeight: 600,
                  color: '#1e293b',
                  mb: 1
                }}
              >
                {appStat.app}
              </Typography>
              <Typography 
                sx={{ 
                  color: '#64748b',
                  fontSize: '0.9rem'
                }}
              >
                {appStat.count} cards ({appStat.percent}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Filter Results */}
      <Typography 
        sx={{ 
          mb: 3,
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <span style={{ color: '#3b82f6', fontSize: '1.2rem' }}>🎯</span>
        {selectedStatus} – {filteredCount} cards ({totalFilteredStatus > 0 ? ((filteredCount / totalFilteredStatus) * 100).toFixed(1) : 0}%)
      </Typography>

      {loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '200px'
          }}
        >
          <CircularProgress sx={{ color: '#3b82f6' }} />
        </Box>
      ) : (
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0'
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Tên</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>App</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Agent</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Due</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Trễ (ngày)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...filtered]
                  .sort((a, b) => new Date(a.due || 0) - new Date(b.due || 0))
                  .map((card) => {
                    const overdue = getOverdueDays(card.due);
                    const agent = getAgentName(card);
                    const statusColor = card.status === 'Done'
                      ? '#10b981'
                      : card.status === 'Waiting for Customer Confirmation'
                        ? '#f59e0b'
                        : card.status === 'Doing'
                          ? '#3b82f6'
                          : '#ef4444';
                    const app = card.labels?.find(l => l.name.startsWith('App:'))?.name || 'Không có';

                    return (
                      <TableRow 
                        key={card.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#f8fafc'
                          }
                        }}
                      >
                        <TableCell>
                          <a 
                            href={card.shortUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontWeight: 500,
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {card.name}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={card.status} 
                            sx={{ 
                              backgroundColor: statusColor,
                              color: 'white',
                              fontWeight: 500
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{app}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{agent}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{formatDate(card.due)}</TableCell>
                        <TableCell>
                          {overdue !== null ? (
                            <Typography 
                              sx={{ 
                                color: '#ef4444',
                                fontWeight: 500
                              }}
                            >
                              {overdue} ngày
                            </Typography>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Charts Section */}
      <Box sx={{ mt: 6 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            mb: 4,
            fontWeight: 600,
            color: '#1e293b'
          }}
        >
          📊 Biểu đồ trạng thái theo Agent
        </Typography>
        {allStatuses.map((status) => {
          const data = getChartDataByStatus(status);
          return (
            <Paper
              key={status}
              elevation={0}
              sx={{ 
                mb: 4,
                p: 3,
                borderRadius: 3,
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3,
                  fontWeight: 600,
                  color: '#1e293b'
                }}
              >
                {status}
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {data.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        allowDecimals={false}
                        tick={{ fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="value"
                          position="top"
                          style={{
                            fill: '#64748b',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        />
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default IssueSummary;