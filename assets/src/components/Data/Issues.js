import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Select, MenuItem, InputLabel, FormControl, CircularProgress, Chip, Avatar,
  AvatarGroup, Tooltip
} from '@mui/material';
import { getCardsByList } from '../../api/trelloApi';
import memberList from '../../data/members.json';
import listsId from '../../data/listsId.json';
import CardDetailModal from '../CardDetailModal';

import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#FFB1B1', '#FFD6A5', '#EDEDFF', '#9CFFA4'];
const STATUS_COLORS = {
  'Pending': '#FFB1B1',
  'Doing': '#FFD6A5',
  'Waiting Confirm': '#EDEDFF',
  'Done': '#9CFFA4'
};

const IssueSummary = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedApp, setSelectedApp] = useState('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 days');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    return agent ? agent.fullName : 'CS';
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

  const getAppFromLabels = (labels) => {
    if (!labels || !labels.length) return 'Other';
    const appLabels = labels.filter(label => label.name.startsWith('App:'));
    if (appLabels.length === 0) return 'Other';
    return appLabels.map(label => label.name.replace('App:', '').trim()).join(', ') || 'Other';
  };

  const getUniqueApps = () => {
    const apps = new Set();
    issues.forEach(issue => {
      const appLabels = issue.labels?.filter(label => label.name.startsWith('App:')) || [];
      if (appLabels.length > 0) {
        appLabels.forEach(label => {
          apps.add(label.name.replace('App:', '').trim());
        });
      } else {
        apps.add('Other');
      }
    });
    return Array.from(apps).sort();
  };

  const getAssigneeInfo = (memberIds = []) => {
    if (!memberIds.length) return [];
    return memberIds.map(id => {
      const member = memberList.find(m => m.id === id);
      return member || { fullName: 'Unknown', avatarUrl: null, initials: '?' };
    });
  };

  const getAssigneeInitials = (name) => {
    if (!name) return '?';
    const member = memberList.find(m => m.fullName === name);
    return member?.initials || name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
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
                cards.push({ 
                  ...card, 
                  status,
                  app: getAppFromLabels(card.labels)
                });
              }
            });
          }
          return cards;
        };

        // Get cards from New Issues list
        const newIssuesListId = getListIdByName('New Issues');
        if (newIssuesListId) {
          const newIssuesCards = await getCardsByList(newIssuesListId);
          newIssuesCards.forEach(card => {
            const overdueDays = getOverdueDays(card.due);
            if (overdueDays !== null) {
              allResults.push({ ...card, status: 'Pending' });
            }
          });
        }

        // Get cards from Update workflow required or Waiting for access
        const waitingAccessListId = getListIdByName('Update workflow required or Waiting for access (SLA: 2 days)');
        if (waitingAccessListId) {
          const waitingAccessCards = await getCardsByList(waitingAccessListId);
          waitingAccessCards.forEach(card => {
            allResults.push({ ...card, status: 'Pending' });
          });
        }

        // Get cards from other lists
        const [doingCards, waitingCards, doneCards] = await Promise.all([
          getAllCardsFromLists(['Doing (Inshift)'], null, 'Doing'),
          getAllCardsFromLists(["Waiting for Customer's Confirmation (SLA: 2 days)"], null, 'Waiting Confirm'),
          getAllCardsFromLists(['Done'], null, 'Done')
        ]);

        setIssues([...allResults, ...doingCards, ...waitingCards, ...doneCards]);
      } catch (err) {
        console.error('Error loading issues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredIssues = () => {
    return issues.filter(issue => {
      if (selectedAgent !== 'All') {
        const assignees = getAssigneeInfo(issue.idMembers);
        if (!assignees.some(a => a.fullName === selectedAgent)) return false;
      }
      if (selectedStatus !== 'All' && issue.status !== selectedStatus) return false;
      if (selectedApp !== 'All' && issue.app !== selectedApp) return false;
      return true;
    });
  };

  const getStatusCount = (status) => {
    return getFilteredIssues().filter(issue => issue.status === status).length;
  };

  const statusSummary = [
    { status: 'Pending', count: getStatusCount('Pending') },
    { status: 'Doing', count: getStatusCount('Doing') },
    { status: 'Waiting Confirm', count: getStatusCount('Waiting Confirm') },
    { status: 'Done', count: getStatusCount('Done') }
  ];

  const getIssuesByAssignee = () => {
    const assigneeData = {};
    const filteredIssues = getFilteredIssues();
    
    // Initialize data for TS members only
    memberList
      .filter(member => member.role === 'TS')
      .forEach(member => {
        assigneeData[member.fullName] = {
          name: member.fullName,
          Pending: 0,
          Doing: 0,
          'Waiting Confirm': 0,
          Done: 0
        };
      });

    // Count issues for each TS member
    filteredIssues.forEach(issue => {
      const assignees = getAssigneeInfo(issue.idMembers);
      assignees.forEach(assignee => {
        if (assigneeData[assignee.fullName]) {
          assigneeData[assignee.fullName][issue.status]++;
        }
      });
    });

    // Convert to array and sort by name
    return Object.values(assigneeData).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getStatusData = () => {
    return statusSummary.map(({ status, count }) => ({
      name: status,
      value: count
    }));
  };

  return (
    <Box sx={{ p: 4, maxWidth: '1800px', margin: '0 auto' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Issue Dashboard
      </Typography>

      {/* Status Summary Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 3, 
        mb: 4 
      }}>
        {loading ? (
          Array(4).fill(0).map((_, index) => (
            <Paper
              key={index}
              sx={{
                p: 3,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '120px'
              }}
            >
              <CircularProgress size={40} />
            </Paper>
          ))
        ) : (
          statusSummary.map(({ status, count }) => (
            <Paper
              key={status}
              sx={{
                p: 3,
                borderRadius: 2,
                backgroundColor: STATUS_COLORS[status],
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {count}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {status}
              </Typography>
            </Paper>
          ))
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 3, 
        mb: 4 
      }}>
        {loading ? (
          Array(4).fill(0).map((_, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '56px'
              }}
            >
              <CircularProgress size={24} />
            </Paper>
          ))
        ) : (
          <>
            <FormControl fullWidth>
              <InputLabel>Assignee</InputLabel>
              <Select
                value={selectedAgent}
                label="Assignee"
                onChange={(e) => setSelectedAgent(e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '1rem',
                    padding: '12px 14px'
                  }
                }}
              >
                <MenuItem value="All">All</MenuItem>
                {memberList
                  .filter(member => member.role === 'TS')
                  .map(member => (
                    <MenuItem key={member.id} value={member.fullName}>{member.fullName}</MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '1rem',
                    padding: '12px 14px'
                  }
                }}
              >
                <MenuItem value="All">All</MenuItem>
                {Object.keys(STATUS_COLORS).map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>App</InputLabel>
              <Select
                value={selectedApp}
                label="App"
                onChange={(e) => setSelectedApp(e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '1rem',
                    padding: '12px 14px'
                  }
                }}
              >
                <MenuItem value="All">All</MenuItem>
                {getUniqueApps().map(app => (
                  <MenuItem key={app} value={app}>{app}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedTimeRange}
                label="Time Range"
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                disabled
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '1rem',
                    padding: '12px 14px',
                    color: 'text.disabled'
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                <MenuItem value="Last 30 days">Last 30 days</MenuItem>
                <MenuItem value="Last 7 days">Last 7 days</MenuItem>
                <MenuItem value="Last 24 hours">Last 24 hours</MenuItem>
              </Select>
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute', 
                  right: 8, 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                Coming Soon
              </Typography>
            </FormControl>
          </>
        )}
      </Box>

      {/* Charts */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: 4, 
        mb: 4 
      }}>
        {loading ? (
          Array(2).fill(0).map((_, index) => (
            <Paper
              key={index}
              sx={{
                p: 3,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px'
              }}
            >
              <CircularProgress size={60} />
            </Paper>
          ))
        ) : (
          <>
            {/* Issues by Assignee Chart */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Issues by Assignee</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart 
                    data={getIssuesByAssignee()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis />
                    <RechartsTooltip />
                    {Object.keys(STATUS_COLORS).map((status, index) => (
                      <Bar
                        key={status}
                        dataKey={status}
                        stackId="a"
                        fill={COLORS[index]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Issues by Status Chart */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Issues by Status</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      wrapperStyle={{ paddingBottom: '20px' }}
                    />
                    <Pie
                      data={getStatusData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {getStatusData().map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </>
        )}
      </Box>

      {/* Issues Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          Issues {!loading && `(${getFilteredIssues().length})`}
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>App</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredIssues().map(issue => {
                  const assignees = getAssigneeInfo(issue.idMembers);
                  
                  return (
                    <TableRow 
                      key={issue.id}
                      onClick={() => handleCardClick(issue)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>
                        {issue.name}
                      </TableCell>
                      <TableCell>
                        {assignees.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AvatarGroup 
                              max={3}
                              sx={{
                                '& .MuiAvatar-root': {
                                  width: 28,
                                  height: 28,
                                  fontSize: '0.875rem',
                                  border: '2px solid #fff'
                                }
                              }}
                            >
                              {assignees.map((assignee, index) => (
                                <Tooltip key={index} title={assignee.fullName}>
                                  <Avatar
                                    src={assignee.avatarUrl}
                                    alt={assignee.fullName}
                                    sx={{
                                      bgcolor: !assignee.avatarUrl ? `hsl(${(index * 60) % 360}, 70%, 50%)` : undefined
                                    }}
                                  >
                                    {getAssigneeInitials(assignee.fullName)}
                                  </Avatar>
                                </Tooltip>
                              ))}
                            </AvatarGroup>
                            <Typography variant="body2" color="text.secondary">
                              {assignees.length === 1 
                                ? assignees[0].fullName 
                                : `${assignees[0].fullName} +${assignees.length - 1}`
                              }
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(getAppFromLabels(issue.labels) || 'Other').split(', ').map((app, index) => (
                            <Chip
                              key={index}
                              label={app}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                                color: 'text.primary',
                                fontWeight: 500,
                                '&:not(:last-child)': {
                                  marginRight: 0.5
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={issue.status}
                          sx={{
                            backgroundColor: STATUS_COLORS[issue.status],
                            color: '#000',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(issue.dateLastActivity).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal 
          open={isModalOpen}
          onClose={handleCloseModal}
          card={selectedCard}
        />
      )}
    </Box>
  );
};

export default IssueSummary;