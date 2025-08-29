import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  OpenInNew as OpenInNewIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import assignCard from '../api/assignCard';
import { sendMessageToChannel } from '../api/slackApi';
import members from '../data/members.json';
import { getCurrentUser } from '../api/usersApi';
import { ROLES } from '../utils/roles';

const AssignCardPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  
  // Filter states
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort states
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Submit request states
  const [submittingCards, setSubmittingCards] = useState(new Set());
  const [submitError, setSubmitError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [requestText, setRequestText] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Get current user and check if admin
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === ROLES.ADMIN;

  // Create member map for ID to fullName conversion
  const memberMap = members.reduce((acc, member) => {
    acc[member.id] = member.fullName;
    return acc;
  }, {});

  // Get unique values for filters
  const shifts = [...new Set(data.map(item => item.shift))].sort();
  const memberIds = [...new Set(data.map(item => item.memberId))].sort();
    const dates = [...new Set(data.map(item => item.createdAt))].sort().reverse();

  // Calculate assigner statistics (người assign)
  const assignerStats = useMemo(() => {
    const stats = {};
    
    data.forEach(record => {
      const assignerId = record.memberId; // Người assign
      const assignerName = memberMap[assignerId] || assignerId;
      
      if (!stats[assignerId]) {
        stats[assignerId] = {
          assignerId,
          assignerName,
          approvedCards: 0,
          requestedCards: 0
        };
      }
      
      // Đếm số card theo status
      record.cards.forEach(card => {
        if (card.status === 'approved') {
          stats[assignerId].approvedCards++;
        } else if (card.status === 'requested') {
          stats[assignerId].requestedCards++;
        }
      });
    });
    
    return Object.values(stats).sort((a, b) => (b.approvedCards + b.requestedCards) - (a.approvedCards + a.requestedCards));
  }, [data, memberMap]);

  const formatDate = (dateString) => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Calculate chart data for daily assign trends (only approved cards)
  const dailyAssignData = useMemo(() => {
    const dailyStats = {};
    
    data.forEach(record => {
      const date = record.createdAt;
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          approvedAssigns: 0
        };
      }
      
      record.cards.forEach(card => {
        if (card.status === 'approved') {
          dailyStats[date].approvedAssigns++;
        }
      });
    });
    
    return Object.values(dailyStats)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
        ...item,
        date: formatDate(item.date)
      }));
  }, [data]);

  // Calculate pie chart data for member assign distribution (only approved cards)
  const memberAssignData = useMemo(() => {
    const memberStats = {};
    
    data.forEach(record => {
      const assignerId = record.memberId;
      const assignerName = memberMap[assignerId] || assignerId;
      
      if (!memberStats[assignerId]) {
        memberStats[assignerId] = {
          name: assignerName,
          value: 0,
          memberId: assignerId
        };
      }
      
      record.cards.forEach(card => {
        if (card.status === 'approved') {
          memberStats[assignerId].value++;
        }
      });
    });
    
    return Object.values(memberStats)
      .filter(stat => stat.value > 0) // Only show members with approved cards
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 members
  }, [data, memberMap]);

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'];

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await assignCard.getAssignCards();
      if (response.error) {
        throw new Error(response.error);
      }
      setData(response);
      setFilteredData(response);
    } catch (err) {
      console.error('Error fetching assign card data:', err);
      setError('Có lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...data];

    // Apply filters
    if (selectedShift) {
      filtered = filtered.filter(item => item.shift === selectedShift);
    }
    if (selectedDate) {
      filtered = filtered.filter(item => item.createdAt === selectedDate.format('YYYY-MM-DD'));
    }
    if (selectedMember) {
      filtered = filtered.filter(item => item.memberId === selectedMember);
    }
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.cards.some(card => 
          card.cardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          card.cardUrl.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortField === 'cards') {
        aValue = aValue.length;
        bValue = bValue.length;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredData(filtered);
  }, [data, selectedShift, selectedDate, selectedMember, searchTerm, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSelectedShift('');
    setSelectedDate(null);
    setSelectedMember('');
    setSearchTerm('');
  };

  const handleOpenSubmitModal = (record, cardIndex, card) => {
    if (card.status === 'requested' || card.status === 'rejected') {
      console.log('Card already requested or rejected');
      return;
    }
    
    setSelectedCard({ record, cardIndex, card });
    setRequestText('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
    setRequestText('');
    setIsSubmittingModal(false);
  };

  const handleSubmitRequest = async () => {
    if (!selectedCard || !requestText.trim()) {
      return;
    }

    const { record, cardIndex } = selectedCard;
    const cardKey = `${record._id}-${cardIndex}`;
    setIsSubmittingModal(true);
    setSubmitError('');

    try {
      const response = await assignCard.updateCardStatus(record._id, cardIndex, 'requested');
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local data
      setData(prevData => 
        prevData.map(recordItem => {
          if (recordItem._id === record._id) {
            const updatedCards = [...recordItem.cards];
            updatedCards[cardIndex] = { 
              ...updatedCards[cardIndex], 
              status: 'requested',
              requestText: requestText
            };
            return { ...recordItem, cards: updatedCards };
          }
          return recordItem;
        })
      );

      // Send Slack message
      const slackMessage = createSlackMessage(selectedCard, requestText);
      await sendMessageToChannel(slackMessage, 'ASSIGN-CARD');

      console.log('Card status updated successfully and Slack message sent');
      handleCloseModal();
    } catch (error) {
      console.error('Error updating card status or sending Slack message:', error);
      setSubmitError('Có lỗi khi submit request');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleApproveCard = async (record, cardIndex) => {
    try {
      const response = await assignCard.updateCardStatus(record._id, cardIndex, 'approved');
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local data
      setData(prevData => 
        prevData.map(recordItem => {
          if (recordItem._id === record._id) {
            const updatedCards = [...recordItem.cards];
            updatedCards[cardIndex] = { 
              ...updatedCards[cardIndex], 
              status: 'approved'
            };
            return { ...recordItem, cards: updatedCards };
          }
          return recordItem;
        })
      );

      console.log('Card approved successfully');
    } catch (error) {
      console.error('Error approving card:', error);
      setSubmitError('Có lỗi khi approve card');
    }
  };

  const handleRejectCard = async (record, cardIndex) => {
    try {
      const response = await assignCard.updateCardStatus(record._id, cardIndex, 'rejected');
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local data
      setData(prevData => 
        prevData.map(recordItem => {
          if (recordItem._id === record._id) {
            const updatedCards = [...recordItem.cards];
            updatedCards[cardIndex] = { 
              ...updatedCards[cardIndex], 
              status: 'rejected'
            };
            return { ...recordItem, cards: updatedCards };
          }
          return recordItem;
        })
      );

      console.log('Card rejected successfully');
    } catch (error) {
      console.error('Error rejecting card:', error);
      setSubmitError('Có lỗi khi reject card');
    }
  };

  const createSlackMessage = (selectedCard, requestText) => {
    const { record, card } = selectedCard;
    const memberName = memberMap[record.memberId] || record.memberId;
    const assignedMemberName = memberMap[card.idMember] || card.idMember;
    
    return (
      `*📋 New Card Request Submitted* <@U08UGHSA1B3>\n` +
      `*Card:* ${card.cardName}\n` +
      `*Card URL:* ${card.cardUrl}\n` +
      `*Submitted by:* ${memberName}\n` +
      `*Assigned to:* ${assignedMemberName}\n` +
      `*Shift:* ${getShiftName(record.shift)}\n` +
      `*Date:* ${formatDate(record.createdAt)}\n` +
      `*Request Details:*\n${requestText}\n` +
      `-------------------------------------------------\n`
    );
  };

  const getShiftName = (shiftId) => {
    const shiftNames = {
      'shift1': 'Ca 1 (0:00 - 4:00)',
      'shift2': 'Ca 2 (4:00 - 8:00)',
      'shift3': 'Ca 3 (8:00 - 12:00)',
      'shift4': 'Ca 4 (12:00 - 16:00)',
      'shift5.1': 'Ca 5.1 (16:00 - 18:00)',
      'shift5.2': 'Ca 5.2 (18:00 - 20:00)',
      'shift6': 'Ca 6 (20:00 - 0:00)',
      'shift5': 'Ca 5 (16:00 - 20:00)',
      'shift4+5.1': 'Ca 4 + 5.1 (12:00 - 18:00)',
      'shift5.2+6': 'Ca 5.2 + 6 (18:00 - 0:00)'
    };
    return shiftNames[shiftId] || shiftId;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3, background: '#f8fafc', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
            📊 Assign Card Data
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quản lý và xem dữ liệu assign cards của TS team
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#e3f2fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ScheduleIcon sx={{ color: '#1976d2', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {data.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Records
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#e8f5e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PersonIcon sx={{ color: '#2e7d32', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {memberIds.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique Members
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#fff3e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarIcon sx={{ color: '#f57c00', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {dates.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Working Days
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#fce4ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FilterIcon sx={{ color: '#c2185b', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {filteredData.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Filtered Results
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assigner Statistics Table */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <PersonIcon sx={{ color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Assigner Statistics
            </Typography>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Assigner</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Approved</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Requested</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignerStats.map((stat, index) => {
                  return (
                    <TableRow key={stat.assignerId} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1976d2'
                          }}>
                            {index + 1}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {stat.assignerName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                              {stat.assignerId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={stat.approvedCards} 
                          size="small" 
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={stat.requestedCards} 
                          size="small" 
                          color="warning"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {assignerStats.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No assigner data available
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Daily Assign Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <ScheduleIcon sx={{ color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Daily Approved Cards Trend
                </Typography>
              </Box>
              
              {dailyAssignData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={dailyAssignData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip 
                      formatter={(value, name) => [value, 'Approved Cards']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="approvedAssigns" 
                      stroke="#4caf50" 
                      strokeWidth={3}
                      name="Approved Cards"
                      dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
                  <Typography variant="body2" color="text.secondary">
                    No data available for chart
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Member Assign Distribution Chart */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <PersonIcon sx={{ color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Member Approved Cards Distribution
                </Typography>
              </Box>
              
              {memberAssignData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={memberAssignData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {memberAssignData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name) => [value, 'Approved Cards']}
                      labelFormatter={(label) => `Member: ${label}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
                  <Typography variant="body2" color="text.secondary">
                    No data available for chart
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <FilterIcon sx={{ color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Filters & Search
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={clearFilters}
              sx={{ ml: 'auto' }}
            >
              Clear All
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Shift</InputLabel>
                <Select
                  value={selectedShift}
                  label="Shift"
                  onChange={(e) => setSelectedShift(e.target.value)}
                >
                  <MenuItem value="">All Shifts</MenuItem>
                  {shifts.map(shift => (
                    <MenuItem key={shift} value={shift}>
                      {getShiftName(shift)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={setSelectedDate}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                slotProps={{
                  textField: {
                    size: 'small'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Member</InputLabel>
                <Select
                  value={selectedMember}
                  label="Member"
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <MenuItem value="">All Members</MenuItem>
                  {memberIds.map(memberId => (
                    <MenuItem key={memberId} value={memberId}>
                      {memberMap[memberId] || memberId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search Cards"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by card name or URL..."
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError}
          </Alert>
        )}

        {/* Data Table */}
        <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Assign Card Records ({filteredData.length})
            </Typography>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchData} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f8fafc' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SortIcon sx={{ fontSize: 16 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Date
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Shift
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Member ID
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SortIcon sx={{ fontSize: 16 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Cards Count
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Cards
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((record, index) => (
                  <TableRow key={record._id || index} hover>
                    <TableCell>
                      <Chip 
                        label={formatDate(record.createdAt)} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getShiftName(record.shift)} 
                        size="small" 
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {memberMap[record.memberId] || 'Unknown Member'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {record.memberId}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={record.cards.length} 
                        size="small" 
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {record.cards.map((card, cardIndex) => {
                          const cardKey = `${record._id}-${cardIndex}`;
                          const isSubmitting = submittingCards.has(cardKey);
                          const isRequested = card.status === 'requested';
                          
                          return (
                            <Box key={cardIndex} sx={{ 
                              p: 1, 
                              background: '#f8fafc', 
                              borderRadius: 1,
                              border: '1px solid #e2e8f0'
                            }}>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                                  {card.cardName}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {/* Status Chip */}
                                  <Chip 
                                    label={card.status || 'pending'} 
                                    size="small" 
                                    color={card.status === 'requested' ? 'warning' : 
                                           card.status === 'approved' ? 'success' : 
                                           card.status === 'rejected' ? 'error' : 'default'}
                                    variant="outlined"
                                    sx={{ 
                                      fontSize: '0.7rem',
                                      height: '20px',
                                      '& .MuiChip-label': {
                                        px: 1
                                      }
                                    }}
                                  />
                                  <Tooltip title="Open Card">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => window.open(card.cardUrl, '_blank')}
                                    >
                                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  
                                  {/* Submit Request Button (for non-admin or pending cards) */}
                                  {(!isAdmin || card.status === 'pending') && (
                                    <Tooltip title={record.memberId !== currentUser?.trelloId ? "You can only submit requests for cards you assigned" : card.status === 'rejected' ? "Cannot submit request for rejected cards" : "Submit Request"}>
                                      <IconButton 
                                        size="small"
                                        onClick={() => handleOpenSubmitModal(record, cardIndex, card)}
                                        disabled={card.status === 'requested' || card.status === 'rejected' || record.memberId !== currentUser?.trelloId}
                                        sx={{
                                          color: (card.status === 'requested' || card.status === 'rejected' || record.memberId !== currentUser?.trelloId) ? '#ccc' : '#1976d2',
                                          '&:hover': {
                                            background: (card.status === 'requested' || card.status === 'rejected' || record.memberId !== currentUser?.trelloId) ? 'transparent' : '#e3f2fd'
                                          }
                                        }}
                                      >
                                        <SendIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  
                                  {/* Admin Buttons - luôn hiển thị đủ các button cho admin */}
                                  {isAdmin && (
                                    <>
                                      {/* Approve Button - luôn hiển thị */}
                                      <Tooltip title="Approve Card">
                                        <IconButton 
                                          size="small"
                                          onClick={() => handleApproveCard(record, cardIndex)}
                                          sx={{
                                            color: '#4caf50',
                                            '&:hover': {
                                              background: '#e8f5e8'
                                            }
                                          }}
                                        >
                                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                      
                                      {/* Reject Button - luôn hiển thị */}
                                      <Tooltip title="Reject Card">
                                        <IconButton 
                                          size="small"
                                          onClick={() => handleRejectCard(record, cardIndex)}
                                          sx={{
                                            color: '#f44336',
                                            '&:hover': {
                                              background: '#ffebee'
                                            }
                                          }}
                                        >
                                          <CancelIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                      
                                      {/* Request Button - luôn hiển thị */}
                                      <Tooltip title="Request Card">
                                        <IconButton 
                                          size="small"
                                          onClick={() => handleOpenSubmitModal(record, cardIndex, card)}
                                          sx={{
                                            color: '#ff9800',
                                            '&:hover': {
                                              background: '#fff3e0'
                                            }
                                          }}
                                        >
                                          <SendIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </Box>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Assigned to:
                                </Typography>
                                <Chip 
                                  label={memberMap[card.idMember] || card.idMember} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredData.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No data found matching your filters
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Submit Request Modal */}
        <Dialog 
          open={isModalOpen} 
          onClose={handleCloseModal}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ 
            background: '#f8fafc', 
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <SendIcon sx={{ color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Submit Request
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
            {selectedCard && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Card: {selectedCard.card.cardName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Assigned to: {memberMap[selectedCard.card.idMember] || selectedCard.card.idMember}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Shift: {getShiftName(selectedCard.record.shift)} | Date: {formatDate(selectedCard.record.createdAt)}
                </Typography>
              </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Request Details"
              placeholder="Please describe your request or provide additional information..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button 
              onClick={handleCloseModal}
              disabled={isSubmittingModal}
              sx={{ fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={handleSubmitRequest}
              disabled={!requestText.trim() || isSubmittingModal}
              startIcon={isSubmittingModal ? <CircularProgress size={16} /> : <SendIcon />}
              sx={{ fontWeight: 600 }}
            >
              {isSubmittingModal ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AssignCardPage;