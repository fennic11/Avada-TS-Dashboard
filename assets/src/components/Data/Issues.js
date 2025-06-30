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
  Button,
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
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);

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
    handleGetData(startDate, endDate);
  }, [startDate, endDate]);

  const handleGetData = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const cards = await getCardsByBoardWithDateFilter(start, end);
      if (cards) {
        setFilteredCards(cards);

        // Categorize cards
        const now = new Date();
        const categorized = {
          pending: [],
          devFixing: [],
          customerConfirmation: [],
          done: [],
          other: []
        };

        cards.forEach(card => {
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

  // Unique status/app for filter dropdowns
  const statusOptions = Object.values(STATUS_MAP).map(s => s.label);
  const appOptions = Array.from(new Set(allCards.flatMap(card => (card.labels || []).filter(l => l.name.startsWith('App:')).map(l => l.name))));

 

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

  // Hàm lấy dữ liệu Issues theo App
  const getIssuesByAppData = () => {
    const appMap = {};
    filteredCards.forEach(card => {
      const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
      if (appLabels.length === 0) {
        appMap['No App'] = (appMap['No App'] || 0) + 1;
      } else {
        appLabels.forEach(l => {
          appMap[l.name] = (appMap[l.name] || 0) + 1;
        });
      }
    });
    return Object.entries(appMap)
      .map(([app, count]) => ({ app, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
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

  // Filter cards by selected shift
  const getFilteredCardsByShift = () => {
    if (!selectedShift) return filteredCards;
    return filteredCards.filter(card => {
      if (!card.due) return false;
      const createDate = new Date(card.due);
      createDate.setDate(createDate.getDate() - 2);
      const shift = getShift(createDate.toISOString());
      return shift === selectedShift;
    });
  };

  // Update filteredCards when selectedShift changes
  useEffect(() => {
    if (selectedShift) {
      const filtered = getFilteredCardsByShift();
      setFilteredCards(filtered);
    } else {
      handleGetData(startDate, endDate);
    }
  }, [selectedShift]);

  // Add function to compute app stats for the table
  const getAppStatsTableData = () => {
    // Get all app names from filteredCards
    const appNames = Array.from(new Set(filteredCards.flatMap(card => (card.labels || []).filter(l => l.name.startsWith('App:')).map(l => l.name))));
    // If a card has no app label, group as 'No App'
    if (filteredCards.some(card => !(card.labels || []).some(l => l.name.startsWith('App:')))) {
      appNames.push('No App');
    }
    // Build stats for each app
    const stats = appNames.map(appName => {
      // Cards of this app
      const cardsOfApp = filteredCards.filter(card => {
        const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
        if (appLabels.length === 0) return appName === 'No App';
        return appLabels.some(l => l.name === appName);
      });
      const issuesCount = cardsOfApp.length;
      // Bug Level 2 cards of this app
      const bugLevel2Count = cardsOfApp.filter(card => (card.labels || []).some(l => l.name === 'Bug: level 2')).length;
      // Tỉ lệ bug/ tổng số card của app
      const bugPercent = issuesCount > 0 ? ((bugLevel2Count / issuesCount) * 100).toFixed(1) : '0.0';
      return {
        app: appName,
        issuesCount,
        bugPercent,
        bugLevel2Count
      };
    });
    // Sort descending by issuesCount
    return stats.sort((a, b) => b.issuesCount - a.issuesCount);
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
                setStatusFilter('');
                setAppFilter('');
                setSelectedDay(null);
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
              </Grid>
            </Paper>
          </Grid>

          {/* Active Filters */}
          {(statusFilter || appFilter || selectedDay) && (
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
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Issues by Shift
          {selectedShift && (
            <Chip
              label={`Filtering: ${selectedShift}`}
              onDelete={() => setSelectedShift(null)}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart 
            data={getIssuesByShiftData()} 
            margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
            onClick={state => {
              if (state && state.activeLabel) {
                setSelectedShift(state.activeLabel === selectedShift ? null : state.activeLabel);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="shift" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#ff9800" name="Issues" cursor="pointer">
              {getIssuesByShiftData().map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.shift === selectedShift ? '#f57c00' : '#ff9800'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
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
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: 340 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Issues by App</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={getIssuesByAppData()} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="app" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#1976d2" name="Issues" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Bug Level 2 by App Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
          Bugs by App
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
          Bugs by Day
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

      {/* App Stats Table */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>App Issue & Bug Level 2 Ratio</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            background: '#f8fafc',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px 0 #e0e7ef',
            marginBottom: 0
          }}>
            <thead>
              <tr style={{ background: '#e3e8ee' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 15, color: '#1a237e', borderBottom: '2px solid #e0e7ef' }}>App</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 15, color: '#1a237e', borderBottom: '2px solid #e0e7ef' }}>Tổng số issues</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 15, color: '#d32f2f', borderBottom: '2px solid #e0e7ef' }}>Bug</th>
              </tr>
            </thead>
            <tbody>
              {getAppStatsTableData().map((row, idx) => (
                <tr
                  key={row.app}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : '#f1f5f9',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#e3e8ee'}
                  onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f1f5f9'}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1976d2', borderBottom: '1px solid #e0e7ef', borderLeft: idx === 0 ? 'none' : undefined }}>{row.app}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: '#334155', borderBottom: '1px solid #e0e7ef' }}>{row.issuesCount}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#d32f2f', borderBottom: '1px solid #e0e7ef' }}>{row.bugPercent}% <span style={{ color: '#64748b', fontWeight: 400 }}>({row.bugLevel2Count})</span></td>
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