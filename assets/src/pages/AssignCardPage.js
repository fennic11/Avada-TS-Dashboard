import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  OpenInNew as OpenInNewIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import assignCard from '../api/assignCard';
import members from '../data/members.json';

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

  // Create member map for ID to fullName conversion
  const memberMap = members.reduce((acc, member) => {
    acc[member.id] = member.fullName;
    return acc;
  }, {});

  // Get unique values for filters
  const shifts = [...new Set(data.map(item => item.shift))].sort();
  const memberIds = [...new Set(data.map(item => item.memberId))].sort();
  const dates = [...new Set(data.map(item => item.createdAt))].sort().reverse();

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

  const handleSubmitRequest = async (recordId, cardIndex, currentStatus) => {
    if (currentStatus === 'submitted') {
      console.log('Card already submitted');
      return;
    }

    const cardKey = `${recordId}-${cardIndex}`;
    setSubmittingCards(prev => new Set(prev).add(cardKey));
    setSubmitError('');

    try {
      const response = await assignCard.updateCardStatus(recordId, cardIndex, 'submitted');
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update local data
      setData(prevData => 
        prevData.map(record => {
          if (record._id === recordId) {
            const updatedCards = [...record.cards];
            updatedCards[cardIndex] = { ...updatedCards[cardIndex], status: 'submitted' };
            return { ...record, cards: updatedCards };
          }
          return record;
        })
      );

      console.log('Card status updated successfully');
    } catch (error) {
      console.error('Error updating card status:', error);
      setSubmitError('Có lỗi khi submit request');
    } finally {
      setSubmittingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardKey);
        return newSet;
      });
    }
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

  const formatDate = (dateString) => {
    return dayjs(dateString).format('DD/MM/YYYY');
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
                          const isSubmitted = card.status === 'submitted';
                          
                          return (
                            <Box key={cardIndex} sx={{ 
                              p: 1, 
                              background: isSubmitted ? '#e8f5e8' : '#f8fafc', 
                              borderRadius: 1,
                              border: `1px solid ${isSubmitted ? '#4caf50' : '#e2e8f0'}`,
                              position: 'relative'
                            }}>
                              {/* Status indicator */}
                              {isSubmitted && (
                                <Box sx={{
                                  position: 'absolute',
                                  top: -1,
                                  right: -1,
                                  width: 0,
                                  height: 0,
                                  borderLeft: '8px solid transparent',
                                  borderRight: '8px solid transparent',
                                  borderBottom: '8px solid #4caf50'
                                }} />
                              )}
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                                  {card.cardName}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Tooltip title="Open Card">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => window.open(card.cardUrl, '_blank')}
                                    >
                                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={isSubmitted ? "Already Submitted" : "Submit Request"}>
                                    <IconButton 
                                      size="small"
                                      disabled={isSubmitting || isSubmitted}
                                      onClick={() => handleSubmitRequest(record._id, cardIndex, card.status)}
                                      sx={{
                                        color: isSubmitted ? '#4caf50' : '#1976d2',
                                        '&:hover': {
                                          background: isSubmitted ? 'transparent' : '#e3f2fd'
                                        }
                                      }}
                                    >
                                      {isSubmitting ? (
                                        <CircularProgress size={16} />
                                      ) : (
                                        <SendIcon sx={{ fontSize: 16 }} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                
                                {/* Status chip */}
                                <Chip 
                                  label={isSubmitted ? "Submitted" : "Pending"} 
                                  size="small" 
                                  color={isSubmitted ? "success" : "default"}
                                  variant={isSubmitted ? "filled" : "outlined"}
                                  sx={{ fontSize: '0.65rem' }}
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
      </Box>
    </LocalizationProvider>
  );
};

export default AssignCardPage;