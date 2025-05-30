import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Grid,
  Chip,
  TextField,
  Divider,
  Card,
  CardContent,
  List,
  Button
} from '@mui/material';
import members from '../../data/members.json';
import listsId from '../../data/listsId.json';
import { getCardsByBoardWithDateFilter } from '../../api/trelloApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CardDetailModal from '../CardDetailModal';

const STATUS_MAP = {
  pending: { label: 'Pending', color: '#ff9800' },
  devFixing: { label: 'Dev Fixing', color: '#ffb74d' },
  customerConfirmation: { label: 'Waiting Confirm', color: '#9c27b0' },
  done: { label: 'Done', color: '#4caf50' },
  other: { label: 'Other', color: '#90a4ae' },
};

const Issues = () => {
  const [selectedMember, setSelectedMember] = useState('');
  const [tsMembers, setTsMembers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categorizedCards, setCategorizedCards] = useState({
    pending: [],
    devFixing: [],
    customerConfirmation: [],
    done: [],
    other: []
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [didAutoFetch, setDidAutoFetch] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get list IDs from listsId.json
  const getListIdByName = (name) => {
    const list = listsId.find(list => list.name === name);
    return list ? list.id : null;
  };

  // Function to get date string in YYYY-MM-DDTHH:mm format
  const getFormattedDateTime = (date, hour = 0, minute = 0) => {
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm'
  };

  // Function to set default dates (7 ngày trước ngày hôm qua -> ngày hôm qua)
  const setDefaultDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date(yesterday);
    lastWeek.setDate(yesterday.getDate() - 7);
    setEndDate(getFormattedDateTime(yesterday, 23, 59));
    setStartDate(getFormattedDateTime(lastWeek, 0, 0));
  };

  useEffect(() => {
    // Filter members with TS and TS-lead roles
    const filteredMembers = members.filter(member => 
      member.role === 'TS' || member.role === 'TS-lead'
    );
    setTsMembers(filteredMembers);
    setDefaultDates();
  }, []);

  useEffect(() => {
    if (startDate && endDate && !didAutoFetch) {
      handleGetData();
      setDidAutoFetch(true);
    }
  }, [startDate, endDate]);

  const handleGetData = async () => {
    if (!startDate && !endDate) {
      alert('Please select at least one date');
      return;
    }

    setLoading(true);
    try {
      const cards = await getCardsByBoardWithDateFilter(startDate, endDate);
      console.log(cards.length);
      if (cards) {
        // Filter cards by selected member if any
        const filteredCards = selectedMember 
          ? cards.filter(card => card.idMembers && card.idMembers.includes(selectedMember))
          : cards;
        setFilteredCards(filteredCards);

        // Categorize cards
        const now = new Date();
        const categorized = {
          pending: [],
          devFixing: [],
          customerConfirmation: [],
          done: [],
          other: []
        };

        filteredCards.forEach(card => {
          // Pending: card ở Update workflow required or Waiting for access (SLA: 2 days)
          if (card.idList === getListIdByName('Update workflow required or Waiting for access (SLA: 2 days)')) {
            categorized.pending.push(card);
          }
          // Pending: card ở New Issues bị quá due date
          else if (card.idList === getListIdByName('New Issues') && card.due && new Date(card.due) < now) {
            categorized.pending.push(card);
          }
          else if (card.idList === getListIdByName('Waiting to fix (from dev)')) {
            categorized.devFixing.push(card);
          } else if (card.idList === getListIdByName('Waiting for Customer\'s Confirmation (SLA: 2 days)')) {
            categorized.customerConfirmation.push(card);
          }
          // Done: card ở các list Done, Done-T5-2025, Fix done from dev
          else if ([
            getListIdByName('Done'),
            getListIdByName('Done-T5-2025'),
            getListIdByName('Fix done from dev')
          ].includes(card.idList)) {
            categorized.done.push(card);
          } else {
            categorized.other.push(card);
          }
        });

        setCategorizedCards(categorized);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
    setLoading(false);
  };

  // Effect to filter cards when member selection changes
  useEffect(() => {
    if (filteredCards.length > 0) {
      const filteredByMember = selectedMember 
        ? filteredCards.filter(card => card.idMembers && card.idMembers.includes(selectedMember))
        : filteredCards;
      setFilteredCards(filteredByMember);
    }
  }, [selectedMember]);

  const handleMemberChange = (event) => {
    setSelectedMember(event.target.value);
  };

  // Prepare data for charts
  const totalCards = filteredCards.length;
  const allCards = Object.values(categorizedCards).flat();

  // Pie chart data by status
  const pieData = Object.entries(STATUS_MAP).map(([key, { label, color }]) => ({
    name: label,
    value: categorizedCards[key]?.length || 0,
    color,
  }));

  // Bar chart data by assignee
  const assigneeMap = {};
  allCards.forEach(card => {
    (card.idMembers || []).forEach(id => {
      if (!assigneeMap[id]) assigneeMap[id] = { name: members.find(m => m.id === id)?.fullName || id };
      const statusKey = Object.keys(STATUS_MAP).find(k => categorizedCards[k]?.includes(card));
      if (statusKey) assigneeMap[id][STATUS_MAP[statusKey].label] = (assigneeMap[id][STATUS_MAP[statusKey].label] || 0) + 1;
    });
  });
  const barData = Object.values(assigneeMap);

  // Filtered issues for table
  const filteredIssues = allCards.filter(card => {
    const memberOk = !selectedMember || (card.idMembers && card.idMembers.includes(selectedMember));
    const statusOk = !statusFilter || Object.keys(STATUS_MAP).find(k => STATUS_MAP[k].label === statusFilter && categorizedCards[k]?.includes(card));
    const appOk = !appFilter || (card.labels && card.labels.some(l => l.name.includes(appFilter)));
    return memberOk && statusOk && appOk;
  });

  // Unique status/app for filter dropdowns
  const statusOptions = Object.values(STATUS_MAP).map(s => s.label);
  const appOptions = Array.from(new Set(allCards.flatMap(card => (card.labels || []).filter(l => l.name.startsWith('App:')).map(l => l.name))));

  // Thêm hàm lấy tên list từ id
  const getListNameById = (id) => listsId.find(list => list.id === id)?.name || id;

  const renderCategorySection = (title, cards, color) => {
    // Calculate total cards across all categories
    const totalCards = Object.values(categorizedCards).reduce((sum, arr) => sum + arr.length, 0);
    // Calculate percentage
    const percentage = totalCards > 0 ? ((cards.length / totalCards) * 100).toFixed(1) : 0;

    return (
      <Paper 
        elevation={3}
        sx={{ 
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: `linear-gradient(to right, #ffffff, ${color}10)`,
          border: `1px solid ${color}30`
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              color: color,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {title}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            backgroundColor: `${color}15`,
            padding: '8px 16px',
            borderRadius: 2
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                color: color
              }}
            >
              {cards.length}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: color,
                fontWeight: 500
              }}
            >
              ({percentage}%)
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {cards.length > 0 ? (
          <List>
            {cards.map((card) => (
              <Card key={card.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        {card.name}
                      </Typography>
                    </Grid>
                    {card.desc && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          {card.desc}
                        </Typography>
                      </Grid>
                    )}
                    {card.due && (
                      <Grid item xs={12}>
                        <Chip 
                          label={`Due: ${new Date(card.due).toLocaleDateString()}`}
                          color={card.dueComplete ? "success" : "warning"}
                          size="small"
                        />
                      </Grid>
                    )}
                    {card.labels && card.labels.length > 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {card.labels.map((label) => (
                            <Chip
                              key={label.id}
                              label={label.name}
                              size="small"
                              sx={{ 
                                backgroundColor: label.color,
                                color: 'white'
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No cards in this category</Typography>
        )}
      </Paper>
    );
  };

  const handleRowClick = (card) => {
    setSelectedCardId(card.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCardId(null);
  };

  // Hàm lấy create date = due - 2 ngày
  const getCreateDate = (card) => {
    if (card.due) {
      const dueDate = new Date(card.due);
      dueDate.setDate(dueDate.getDate() - 2);
      return dueDate.toISOString().slice(0, 10);
    }
    return null;
  };

  // Group issues by create date
  const getIssuesByDayData = () => {
    const dayMap = {};
    filteredCards.forEach(card => {
      const date = getCreateDate(card);
      if (date) {
        if (!dayMap[date]) dayMap[date] = 0;
        dayMap[date]++;
      }
    });
    return Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Hàm xác định ca trực từ giờ
  const getShift = (dateString) => {
    if (!dateString) return null;
    const hour = new Date(dateString).getHours();
    if (hour >= 0 && hour < 4) return 'Ca 1 (0-3h59)';
    if (hour >= 4 && hour < 8) return 'Ca 2 (4-7h59)';
    if (hour >= 8 && hour < 12) return 'Ca 3 (8-11h59)';
    if (hour >= 12 && hour < 16) return 'Ca 4 (12-15h59)';
    if (hour >= 16 && hour < 18) return 'Ca 5.1 (16-17h59)';
    if (hour >= 18 && hour < 20) return 'Ca 5.2 (18-19h59)';
    if (hour >= 20 && hour < 24) return 'Ca 6 (20-23h59)';
    return null;
  };

  // Group issues by shift
  const getIssuesByShiftData = () => {
    const shiftMap = {
      'Ca 1 (0-3h59)': 0,
      'Ca 2 (4-7h59)': 0,
      'Ca 3 (8-11h59)': 0,
      'Ca 4 (12-15h59)': 0,
      'Ca 5.1 (16-17h59)': 0,
      'Ca 5.2 (18-19h59)': 0,
      'Ca 6 (20-23h59)': 0,
    };
    filteredCards.forEach(card => {
      if (card.due) {
        const createDate = new Date(card.due);
        createDate.setDate(createDate.getDate() - 2);
        const shift = getShift(createDate.toISOString());
        if (shift) shiftMap[shift]++;
      }
    });
    return Object.entries(shiftMap).map(([shift, count]) => ({ shift, count }));
  };

  return (
    <Box sx={{
      p: { xs: 1, sm: 2, md: 4 },
      maxWidth: '1800px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e3e8ee 100%)',
      borderRadius: 3,
      boxShadow: '0 4px 32px 0 rgba(30, 41, 59, 0.07)',
      minHeight: '100vh',
      border: '1px solid #e0e7ef'
    }}>
      {/* Date Filter Section */}
      <Paper elevation={3} sx={{ p: 2, mb: 2, borderRadius: 2, background: 'white', boxShadow: '0 2px 8px 0 #e0e7ef' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, fontSize: 18 }}>Date Filter</Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="datetime-local"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                background: '#f6f8fa',
                borderRadius: 1.5,
                '& .MuiOutlinedInput-root': {
                  fontSize: 15,
                  background: '#f6f8fa',
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: '#e0e7ef' },
                  '&:hover fieldset': { borderColor: '#1976d2' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                },
                '& .MuiInputLabel-root': {
                  color: '#1976d2',
                  fontWeight: 500,
                  fontSize: 15
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="datetime-local"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                background: '#f6f8fa',
                borderRadius: 1.5,
                '& .MuiOutlinedInput-root': {
                  fontSize: 15,
                  background: '#f6f8fa',
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: '#e0e7ef' },
                  '&:hover fieldset': { borderColor: '#1976d2' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                },
                '& .MuiInputLabel-root': {
                  color: '#1976d2',
                  fontWeight: 500,
                  fontSize: 15
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleGetData}
              disabled={loading}
              sx={{ height: 40, fontSize: 15, backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' }, borderRadius: 1.5, boxShadow: '0 2px 8px 0 #e0e7ef' }}
            >
              {loading ? 'Loading...' : 'Get Data'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters Section */}
      <Paper elevation={3} sx={{ p: 2, mb: 2, borderRadius: 2, background: 'white', boxShadow: '0 2px 8px 0 #e0e7ef' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, fontSize: 18 }}>Filters</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small" sx={{
              background: '#f6f8fa',
              borderRadius: 1.5,
              '& .MuiOutlinedInput-root': {
                fontSize: 15,
                background: '#f6f8fa',
                borderRadius: 1.5,
                '& fieldset': { borderColor: '#e0e7ef' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
              },
              '& .MuiInputLabel-root': {
                color: '#1976d2',
                fontWeight: 500,
                fontSize: 15
              }
            }}>
              <InputLabel>Assignee</InputLabel>
              <Select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} label="Assignee"
                sx={{
                  fontSize: 15,
                  background: '#f6f8fa',
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e7ef' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2', borderWidth: 2 }
                }}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {tsMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.fullName}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small" sx={{
              background: '#f6f8fa',
              borderRadius: 1.5,
              '& .MuiOutlinedInput-root': {
                fontSize: 15,
                background: '#f6f8fa',
                borderRadius: 1.5,
                '& fieldset': { borderColor: '#e0e7ef' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
              },
              '& .MuiInputLabel-root': {
                color: '#1976d2',
                fontWeight: 500,
                fontSize: 15
              }
            }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status"
                sx={{
                  fontSize: 15,
                  background: '#f6f8fa',
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e7ef' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2', borderWidth: 2 }
                }}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small" sx={{
              background: '#f6f8fa',
              borderRadius: 1.5,
              '& .MuiOutlinedInput-root': {
                fontSize: 15,
                background: '#f6f8fa',
                borderRadius: 1.5,
                '& fieldset': { borderColor: '#e0e7ef' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
              },
              '& .MuiInputLabel-root': {
                color: '#1976d2',
                fontWeight: 500,
                fontSize: 15
              }
            }}>
              <InputLabel>App</InputLabel>
              <Select value={appFilter} onChange={e => setAppFilter(e.target.value)} label="App"
                sx={{
                  fontSize: 15,
                  background: '#f6f8fa',
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e7ef' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2', borderWidth: 2 }
                }}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {appOptions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Status Boxes */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[ // 2 dòng, mỗi dòng 3 box
          [
            { key: 'total-cards', label: 'Total Cards', color: '#1976d2', value: totalCards },
            ...['pending', 'devFixing', 'customerConfirmation'].map(key => ({
              key,
              label: STATUS_MAP[key].label,
              color: STATUS_MAP[key].color,
              value: categorizedCards[key]?.length || 0,
              percent: totalCards > 0 ? ((categorizedCards[key]?.length || 0) / totalCards * 100).toFixed(1) : null
            }))
          ],
          [
            ...['done', 'other'].map(key => ({
              key,
              label: STATUS_MAP[key].label,
              color: STATUS_MAP[key].color,
              value: categorizedCards[key]?.length || 0,
              percent: totalCards > 0 ? ((categorizedCards[key]?.length || 0) / totalCards * 100).toFixed(1) : null
            }))
          ]
        ].map((row, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {row.map(box => (
              <Grid item xs={12} sm={6} md={4} key={box.key}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 1.5, background: box.key === 'total-cards' ? '#1976d210' : `${box.color}10`, border: `1px solid ${box.key === 'total-cards' ? '#1976d230' : box.color + '30'}`, minHeight: 90, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="h5" sx={{ color: box.color, fontWeight: 700, fontSize: 26 }}>{box.value}</Typography>
                  <Typography variant="subtitle2" sx={{ color: box.color, fontWeight: 500, fontSize: 15 }}>{box.label}</Typography>
                  {box.key !== 'total-cards' && box.percent !== null && (
                    <Typography variant="body2" sx={{ color: box.color, fontWeight: 400, fontSize: 13 }}>{box.percent}%</Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </React.Fragment>
        ))}
      </Grid>

      {/* Issues by Day Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Issues by Day</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={getIssuesByDayData()} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#1976d2" name="Issues" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Issues by Shift Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Issues by Shift</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={getIssuesByShiftData()} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="shift" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#ff9800" name="Issues" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: 340 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Issues by Assignee</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                {statusOptions.map((s, idx) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={Object.values(STATUS_MAP)[idx].color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: 340 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Issues by Status</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Issues Table */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Issues</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Title</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Assignee</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, textAlign: 'left' }}>List</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map(card => (
                <tr
                  key={card.id}
                  style={{
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  onClick={() => handleRowClick(card)}
                >
                  <td style={{ padding: 8 }}>{card.name}</td>
                  <td style={{ padding: 8 }}>{(card.idMembers || []).map(id => members.find(m => m.id === id)?.fullName).join(', ')}</td>
                  <td style={{ padding: 8 }}>
                    {(() => {
                      const statusKey = Object.keys(STATUS_MAP).find(k => categorizedCards[k]?.includes(card));
                      const status = STATUS_MAP[statusKey];
                      return status ? <Chip label={status.label} size="small" sx={{ background: status.color + '22', color: status.color, fontWeight: 600 }} /> : null;
                    })()}
                  </td>
                  <td style={{ padding: 8 }}>{getListNameById(card.idList)}</td>
                  <td style={{ padding: 8 }}>{card.dateLastActivity ? new Date(card.dateLastActivity).toLocaleDateString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Card Detail Modal */}
      <CardDetailModal
        open={isModalOpen}
        onClose={handleCloseModal}
        cardId={selectedCardId}
      />
    </Box>
  );
};

export default Issues;