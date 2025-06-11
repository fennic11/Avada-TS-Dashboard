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
  Button,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import members from '../../data/members.json';
import listsId from '../../data/listsId.json';
import { getCardsByBoardWithDateFilter } from '../../api/trelloApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import CardDetailModal from '../CardDetailModal';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

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
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enableGetActions, setEnableGetActions] = useState(false);
  const [categorizedCards, setCategorizedCards] = useState({
    pending: [],
    devFixing: [],
    customerConfirmation: [],
    done: [],
    other: []
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [startDate, setStartDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [removeActions, setRemoveActions] = useState([]);
  const [selectedLeaveMember, setSelectedLeaveMember] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [sortByCreatedAt, setSortByCreatedAt] = useState('desc');

  // Hàm lấy create date = due - 2 ngày (đã convert về GMT+7)
  const getCreateDate = (card) => {
    if (card.due) {
      // Convert due sang giờ Việt Nam (GMT+7) rồi trừ 2 ngày
      const dueVN = dayjs(card.due).tz('Asia/Ho_Chi_Minh');
      const createVN = dueVN.subtract(2, 'day');
      return createVN.toISOString();
    }
    return null;
  };

  // Get list IDs from listsId.json
  const getListIdByName = (name) => {
    const list = listsId.find(list => list.name === name);
    return list ? list.id : null;
  };

  useEffect(() => {
    // Filter members with TS and TS-lead roles
    const filteredMembers = members.filter(member => 
      member.role === 'TS' || member.role === 'TS-lead'
    );
    setTsMembers(filteredMembers);
    handleGetData(startDate, endDate);
  }, [startDate, endDate]);

  const handleGetData = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const cards = await getCardsByBoardWithDateFilter(start, end, enableGetActions);
      if (cards) {
        // Filter cards by selected member if any
        const filteredCards = selectedMember 
          ? cards.filter(card => card.idMembers && card.idMembers.includes(selectedMember))
          : cards;
        setFilteredCards(filteredCards);

        if (enableGetActions) { 
          // Merge all actions from cards (nếu có)
          const allActions = cards.flatMap(card => Array.isArray(card.actions) ? card.actions : []);
          console.log("allActions:", allActions);
          const removeActionsData = getRemoveMemberActions(allActions);
          console.log("removeActionsData:", removeActionsData);
          setRemoveActions(removeActionsData);
        }

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
    const dayOk = !selectedDay || (getCreateDate(card) && dayjs(getCreateDate(card)).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD') === selectedDay);
    return memberOk && statusOk && appOk && dayOk;
  });

  // Sort filteredIssues by createdAt if needed
  const sortedIssues = React.useMemo(() => {
    if (!sortByCreatedAt) return filteredIssues;
    return [...filteredIssues].sort((a, b) => {
      const aDate = getCreateDate(a) ? dayjs(getCreateDate(a)).tz('Asia/Ho_Chi_Minh').valueOf() : 0;
      const bDate = getCreateDate(b) ? dayjs(getCreateDate(b)).tz('Asia/Ho_Chi_Minh').valueOf() : 0;
      return sortByCreatedAt === 'asc' ? aDate - bDate : bDate - aDate;
    });
  }, [filteredIssues, sortByCreatedAt]);

  // Unique status/app for filter dropdowns
  const statusOptions = Object.values(STATUS_MAP).map(s => s.label);
  const appOptions = Array.from(new Set(allCards.flatMap(card => (card.labels || []).filter(l => l.name.startsWith('App:')).map(l => l.name))));

  // Thêm hàm lấy tên list từ id
  const getListNameById = (id) => listsId.find(list => list.id === id)?.name || id;

  // Hàm lấy tên từ id
  const getMemberName = (id) => {
    const member = members.find(m => m.id === id);
    return member ? member.fullName : id;
  };

  // Hàm lọc action tự remove chính mình khỏi card
  const getRemoveMemberActions = (actions) => {
    return actions.filter(
      action =>
        action.type === 'removeMemberFromCard' &&
        action.idMemberCreator === action.data.member.id
    );
  };

  // Hàm tính số lần mỗi TS member tự rời khỏi card
  const getTSMemberLeaveStats = () => {
    const stats = {};
    tsMembers.forEach(member => {
      stats[member.fullName] = removeActions.filter(action => {
        const isMember = action.idMemberCreator === member.id;
        if (!isMember) return false;
        if (!selectedDay) return true;
        // Lọc theo ngày nếu có filter ngày
        const actionDate = dayjs(action.date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
        return actionDate === selectedDay;
      }).length;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  };

  // Hàm tính tỉ lệ card có label Bug: level 2
  const getBugLevel2Ratio = () => {
    const totalCards = filteredCards.length;
    if (totalCards === 0) return { count: 0, ratio: 0 };
    
    const bugLevel2Cards = filteredCards.filter(card => 
      card.labels && card.labels.some(label => label.name === 'Bug: level 2')
    ).length;
    
    const ratio = (bugLevel2Cards / totalCards * 100).toFixed(1);
    return { count: bugLevel2Cards, ratio };
  };

  // Hàm lấy dữ liệu Bug Level 2 theo app
  const getBugLevel2ByAppData = () => {
    // Lọc các card có label 'Bug: level 2'
    const bugCards = filteredCards.filter(card => 
      card.labels && card.labels.some(label => label.name === 'Bug: level 2')
    );
    // Đếm theo app
    const appMap = {};
    bugCards.forEach(card => {
      const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
      if (appLabels.length === 0) {
        appMap['No App'] = (appMap['No App'] || 0) + 1;
      } else {
        appLabels.forEach(l => {
          appMap[l.name] = (appMap[l.name] || 0) + 1;
        });
      }
    });
    return Object.entries(appMap).map(([app, count]) => ({ app, count }));
  };

  // Hàm lấy dữ liệu Bug Level 2 theo ngày
  const getBugLevel2ByDayData = () => {
    const dayMap = {};
    filteredCards.forEach(card => {
      if (card.labels && card.labels.some(label => label.name === 'Bug: level 2')) {
        const date = getCreateDate(card)
          ? dayjs(getCreateDate(card)).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')
          : null;
        if (date) {
          if (!dayMap[date]) dayMap[date] = 0;
          dayMap[date]++;
        }
      }
    });
    return Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

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

  // Group issues by create date (theo ngày, không theo giờ)
  const getIssuesByDayData = () => {
    const dayMap = {};
    filteredCards.forEach(card => {
      const date = getCreateDate(card)
        ? dayjs(getCreateDate(card)).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')
        : null;
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

  // Hàm xử lý click vào cột trong biểu đồ
  const handleBarClick = (data) => {
    if (selectedLeaveMember === data.name) {
      // Nếu click vào cột đang được chọn thì bỏ chọn
      setSelectedLeaveMember(null);
      setFilteredCards(filteredCards);
    } else {
      // Nếu click vào cột mới thì filter theo member đó
      setSelectedLeaveMember(data.name);
      const member = tsMembers.find(m => m.fullName === data.name);
      if (member) {
        const filtered = filteredCards.filter(card => 
          card.actions?.some(action => 
            action.type === 'removeMemberFromCard' && 
            action.idMemberCreator === member.id &&
            action.idMemberCreator === action.data.member.id
          )
        );
        setFilteredCards(filtered);
      }
    }
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
      {/* Filters Section */}
      <Paper elevation={3} sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2, 
        background: 'white', 
        boxShadow: '0 2px 8px 0 #e0e7ef',
        transition: 'all 0.3s ease'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2.5
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: 18,
            color: '#1a237e',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setSelectedMember('');
                setStatusFilter('');
                setAppFilter('');
                setSelectedDay(null);
                setSelectedLeaveMember(null);
                handleGetData(startDate, endDate);
              }}
              sx={{
                textTransform: 'none',
                color: '#64748b',
                borderColor: '#e2e8f0',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(25,118,210,0.04)'
                }
              }}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Date Range Section */}
          <Grid item xs={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                background: '#f8fafc',
                borderRadius: 1.5,
                border: '1px solid #e2e8f0'
              }}
            >
              <Typography variant="subtitle2" sx={{ 
                mb: 1.5, 
                color: '#64748b',
                fontWeight: 600
              }}>
                Date Range
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: 14,
                        background: 'white',
                        '& fieldset': { 
                          borderColor: '#e2e8f0',
                          transition: 'all 0.2s ease'
                        },
                        '&:hover fieldset': { 
                          borderColor: '#1976d2',
                          boxShadow: '0 0 0 2px rgba(25,118,210,0.1)'
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#1976d2', 
                          borderWidth: 2,
                          boxShadow: '0 0 0 3px rgba(25,118,210,0.1)'
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: '#64748b',
                        fontSize: 14,
                        '&.Mui-focused': {
                          color: '#1976d2'
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="End date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: 14,
                        background: 'white',
                        '& fieldset': { 
                          borderColor: '#e2e8f0',
                          transition: 'all 0.2s ease'
                        },
                        '&:hover fieldset': { 
                          borderColor: '#1976d2',
                          boxShadow: '0 0 0 2px rgba(25,118,210,0.1)'
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#1976d2', 
                          borderWidth: 2,
                          boxShadow: '0 0 0 3px rgba(25,118,210,0.1)'
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: '#64748b',
                        fontSize: 14,
                        '&.Mui-focused': {
                          color: '#1976d2'
                        }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Main Filters Section */}
          <Grid item xs={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                background: '#f8fafc',
                borderRadius: 1.5,
                border: '1px solid #e2e8f0'
              }}
            >
              <Typography variant="subtitle2" sx={{ 
                mb: 1.5, 
                color: '#64748b',
                fontWeight: 600
              }}>
                Card Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: 14,
                      background: 'white',
                      '& fieldset': { 
                        borderColor: '#e2e8f0',
                        transition: 'all 0.2s ease'
                      },
                      '&:hover fieldset': { 
                        borderColor: '#1976d2',
                        boxShadow: '0 0 0 2px rgba(25,118,210,0.1)'
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: '#1976d2', 
                        borderWidth: 2,
                        boxShadow: '0 0 0 3px rgba(25,118,210,0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#64748b',
                      fontSize: 14,
                      '&.Mui-focused': {
                        color: '#1976d2'
                      }
                    }
                  }}>
                    <InputLabel>Assignee</InputLabel>
                    <Select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} label="Assignee">
                      <MenuItem value=""><em>All</em></MenuItem>
                      {tsMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.fullName}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: 14,
                      background: 'white',
                      '& fieldset': { 
                        borderColor: '#e2e8f0',
                        transition: 'all 0.2s ease'
                      },
                      '&:hover fieldset': { 
                        borderColor: '#1976d2',
                        boxShadow: '0 0 0 2px rgba(25,118,210,0.1)'
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: '#1976d2', 
                        borderWidth: 2,
                        boxShadow: '0 0 0 3px rgba(25,118,210,0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#64748b',
                      fontSize: 14,
                      '&.Mui-focused': {
                        color: '#1976d2'
                      }
                    }
                  }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
                      <MenuItem value=""><em>All</em></MenuItem>
                      {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: 14,
                      background: 'white',
                      '& fieldset': { 
                        borderColor: '#e2e8f0',
                        transition: 'all 0.2s ease'
                      },
                      '&:hover fieldset': { 
                        borderColor: '#1976d2',
                        boxShadow: '0 0 0 2px rgba(25,118,210,0.1)'
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: '#1976d2', 
                        borderWidth: 2,
                        boxShadow: '0 0 0 3px rgba(25,118,210,0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#64748b',
                      fontSize: 14,
                      '&.Mui-focused': {
                        color: '#1976d2'
                      }
                    }
                  }}>
                    <InputLabel>App</InputLabel>
                    <Select value={appFilter} onChange={e => setAppFilter(e.target.value)} label="App">
                      <MenuItem value=""><em>All</em></MenuItem>
                      {appOptions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={enableGetActions}
                        onChange={(e) => setEnableGetActions(e.target.checked)}
                        sx={{
                          color: '#64748b',
                          '&.Mui-checked': {
                            color: '#1976d2',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(25,118,210,0.04)',
                          },
                          transition: 'all 0.2s ease'
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ 
                        fontSize: 14,
                        color: '#64748b',
                        fontWeight: 500,
                        transition: 'all 0.2s ease'
                      }}>
                        Get Card Actions
                      </Typography>
                    }
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'white',
                      borderRadius: 1.5,
                      padding: '0 16px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#1976d2',
                        '& .MuiTypography-root': {
                          color: '#1976d2'
                        }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Active Filters */}
          {(selectedMember || statusFilter || appFilter || selectedDay || selectedLeaveMember) && (
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b' }}>
                  Active Filters:
                </Typography>
                {selectedMember && (
                  <Chip
                    label={`Assignee: ${getMemberName(selectedMember)}`}
                    onDelete={() => setSelectedMember('')}
                    size="small"
                    sx={{ 
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      '& .MuiChip-deleteIcon': {
                        color: '#1976d2',
                        '&:hover': { color: '#1565c0' }
                      }
                    }}
                  />
                )}
                {statusFilter && (
                  <Chip
                    label={`Status: ${statusFilter}`}
                    onDelete={() => setStatusFilter('')}
                    size="small"
                    sx={{ 
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      '& .MuiChip-deleteIcon': {
                        color: '#1976d2',
                        '&:hover': { color: '#1565c0' }
                      }
                    }}
                  />
                )}
                {appFilter && (
                  <Chip
                    label={`App: ${appFilter}`}
                    onDelete={() => setAppFilter('')}
                    size="small"
                    sx={{ 
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      '& .MuiChip-deleteIcon': {
                        color: '#1976d2',
                        '&:hover': { color: '#1565c0' }
                      }
                    }}
                  />
                )}
                {selectedDay && (
                  <Chip
                    label={`Date: ${selectedDay}`}
                    onDelete={() => setSelectedDay(null)}
                    size="small"
                    sx={{ 
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      '& .MuiChip-deleteIcon': {
                        color: '#1976d2',
                        '&:hover': { color: '#1565c0' }
                      }
                    }}
                  />
                )}
                {selectedLeaveMember && (
                  <Chip
                    label={`TS Member: ${selectedLeaveMember}`}
                    onDelete={() => setSelectedLeaveMember(null)}
                    size="small"
                    sx={{ 
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      '& .MuiChip-deleteIcon': {
                        color: '#1976d2',
                        '&:hover': { color: '#1565c0' }
                      }
                    }}
                  />
                )}
              </Box>
            </Grid>
          )}
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
            })),
            {
              key: 'bug-level2',
              label: 'Bug Level 2',
              color: '#d32f2f',
              value: getBugLevel2Ratio().count,
              percent: getBugLevel2Ratio().ratio
            }
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
                <Paper elevation={0} sx={{ 
                  p: 2, 
                  borderRadius: 1.5, 
                  background: box.key === 'total-cards' ? '#1976d210' : `${box.color}10`, 
                  border: `1px solid ${box.key === 'total-cards' ? '#1976d230' : box.color + '30'}`, 
                  minHeight: 90, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-start', 
                  justifyContent: 'center', 
                  height: '100%' 
                }}>
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
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Issues by Day
          {selectedDay && (
            <Chip
              label={`Filtering: ${selectedDay}`}
              onDelete={() => setSelectedDay(null)}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart 
            data={getIssuesByDayData()} 
            margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
            onClick={state => {
              if (state && state.activeLabel) {
                setSelectedDay(state.activeLabel);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#1976d2" name="Issues">
              {getIssuesByDayData().map((entry, idx) => (
                <Cell 
                  key={`cell-${idx}`}
                  fill={selectedDay === entry.date ? '#1565c0' : '#1976d2'}
                  cursor="pointer"
                />
              ))}
            </Bar>
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

      {/* Bug Level 2 by App Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
          Bug Level 2 Cards by App
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getBugLevel2ByAppData()} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="app" interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#d32f2f" name="Bug Level 2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Bug Level 2 by Day Line Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
          Bug Level 2 Cards by Day
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={getBugLevel2ByDayData()} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Line type="monotone" dataKey="count" stroke="#d32f2f" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Bug Level 2" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* TS Member Leave Chart */}
      {enableGetActions && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            TS Members Card Leave Count
            {selectedLeaveMember && (
              <Chip 
                label={`Filtering: ${selectedLeaveMember}`}
                onDelete={() => {
                  setSelectedLeaveMember(null);
                  handleGetData(startDate, endDate);
                }}
                color="primary"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={getTSMemberLeaveStats()} 
              margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip />
              <Bar 
                dataKey="count" 
                fill="#ff9800"
                name="Times Left Card"
                radius={[0, 4, 4, 0]}
                onClick={handleBarClick}
                cursor="pointer"
              >
                {getTSMemberLeaveStats().map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.name === selectedLeaveMember 
                        ? '#f57c00' // Màu đậm hơn khi được chọn
                        : entry.count > 0 
                          ? '#ff9800' 
                          : '#e0e0e0'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

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
                <th 
                  style={{ padding: 8, textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortByCreatedAt(sortByCreatedAt === 'desc' ? 'asc' : 'desc')}
                >
                  Created At
                  <span style={{ marginLeft: 4, fontSize: 13, color: '#1976d2', verticalAlign: 'middle' }}>
                    {sortByCreatedAt === 'asc' && '▲'}
                    {sortByCreatedAt === 'desc' && '▼'}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedIssues.map(card => (
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
                  <td style={{ padding: 8 }}>{getCreateDate(card) ? dayjs(getCreateDate(card)).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Bảng Remove Member Actions */}
      {enableGetActions && removeActions && removeActions.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Remove Member Actions</Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Người xóa</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Người bị xóa</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Card</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {removeActions.map(action => (
                  <tr key={action.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{getMemberName(action.idMemberCreator)}</td>
                    <td style={{ padding: 8 }}>{getMemberName(action.data.member.id)}</td>
                    <td style={{ padding: 8 }}>
                      <a 
                        href={`https://trello.com/c/${action.data.card.shortLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#1976d2',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {action.data.card.name}
                      </a>
                    </td>
                    <td style={{ padding: 8 }}>{dayjs(action.date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}

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