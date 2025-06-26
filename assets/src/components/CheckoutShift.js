import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { getBoardActionsByMemberAndDate } from '../api/trelloApi';
import { getCurrentUser } from '../api/usersApi';

const CheckoutShift = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedShift, setSelectedShift] = useState('');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Định nghĩa các ca trực
  const shifts = [
    { id: 'shift1', name: 'Ca 1 (0:00 - 4:00)', startHour: 0, endHour: 4 },
    { id: 'shift2', name: 'Ca 2 (4:00 - 8:00)', startHour: 4, endHour: 8 },
    { id: 'shift3', name: 'Ca 3 (8:00 - 12:00)', startHour: 8, endHour: 12 },
    { id: 'shift4', name: 'Ca 4 (12:00 - 16:00)', startHour: 12, endHour: 16 },
    { id: 'shift5.1', name: 'Ca 5.1 (16:00 - 18:00)', startHour: 16, endHour: 18 },
    { id: 'shift5.2', name: 'Ca 5.2 (18:00 - 20:00)', startHour: 18, endHour: 20 },
    { id: 'shift6', name: 'Ca 6 (20:00 - 0:00)', startHour: 20, endHour: 0 }
  ];

  // Xác định ca trực mặc định dựa trên giờ hiện tại
  const getDefaultShift = (hour) => {
    if (hour >= 0 && hour < 4) return 'shift1';
    if (hour >= 4 && hour < 8) return 'shift2';
    if (hour >= 8 && hour < 12) return 'shift3';
    if (hour >= 12 && hour < 16) return 'shift4';
    if (hour >= 16 && hour < 18) return 'shift5.1';
    if (hour >= 18 && hour < 20) return 'shift5.2';
    return 'shift6';
  };

  useEffect(() => {
    // Cập nhật thời gian mỗi giây
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Cập nhật ca trực mặc định nếu chưa được chọn
      if (!selectedShift) {
        setSelectedShift(getDefaultShift(now.getHours()));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedShift]);

  // Format thời gian
  const formatTime = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Format ngày
  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Lấy actions theo ngày và ca trực
  const fetchActions = async () => {
    if (!selectedDate || !selectedShift || !currentUser?.trelloId) {
      if (!currentUser?.trelloId) {
        setError('Không tìm thấy Trello ID của user. Vui lòng đăng nhập lại.');
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      const shift = shifts.find(s => s.id === selectedShift);
      if (!shift) return;

      // Tạo thời gian bắt đầu và kết thúc cho ca trực
      const startDate = selectedDate.hour(shift.startHour).minute(0).second(0).millisecond(0);

      let endDate;
      if (shift.endHour === 0) {
        // Ca đêm kết thúc vào ngày hôm sau
        endDate = selectedDate.add(1, 'day').hour(shift.endHour).minute(0).second(0).millisecond(0);
      } else {
        endDate = selectedDate.hour(shift.endHour).minute(0).second(0).millisecond(0);
      }

      const since = startDate.toISOString();
      const before = endDate.toISOString();

      console.log(`Fetching actions for shift: ${shift.name}`);
      console.log(`From: ${since} to: ${before}`);
      console.log(`For member: ${currentUser.trelloId} (${currentUser.fullName || currentUser.name})`);

      const actionsData = await getBoardActionsByMemberAndDate(since, before);
      
      // Filter actions by current user's trelloId
      const userActions = actionsData.filter(action => 
        action.idMemberCreator === currentUser.trelloId
      );
      
      console.log(`Found ${actionsData.length} total actions, ${userActions.length} for current user`);
      setActions(userActions || []);
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError('Có lỗi khi tải dữ liệu actions');
    } finally {
      setLoading(false);
    }
  };

  // Tự động fetch actions khi thay đổi ngày hoặc ca trực
  useEffect(() => {
    if (selectedDate && selectedShift && currentUser?.trelloId) {
      fetchActions();
    }
  }, [selectedDate, selectedShift, currentUser]);

  const getShiftName = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    return shift ? shift.name : '';
  };

  // Tính toán số lượng từng loại action
  const getActionCounts = () => {
    if (!actions.length) return {};

    const actionCounts = {
      createCard: 0,
      updateCard: 0,
      commentCard: 0,
      addMemberToCard: 0,
      removeMemberFromCard: 0,
      // Các loại action đặc biệt
      completeCard: 0,
      moveToDone: 0,
      moveToDoing: 0,
      moveToWaitingToFix: 0,
      moveToWaitingToFixFromDev: 0,
      moveToUpdateWorkflow: 0,
      moveToFixDoneFromDev: 0,
      leftCard: 0,
      assigned: 0
    };

    actions.forEach(action => {
      // Đếm các loại action cơ bản
      if (action.type === 'createCard') actionCounts.createCard++;
      if (action.type === 'updateCard') actionCounts.updateCard++;
      if (action.type === 'commentCard') actionCounts.commentCard++;
      if (action.type === 'addMemberToCard') actionCounts.addMemberToCard++;
      if (action.type === 'removeMemberFromCard') actionCounts.removeMemberFromCard++;

      // Đếm các loại action đặc biệt
      if (action.type === 'updateCard' && action.data?.card?.dueComplete === true) {
        actionCounts.completeCard++;
      }
      if (action.type === 'updateCard' && action.data?.listAfter?.name && 
          action.data.listAfter.name.toLowerCase().includes('done') && 
          !action.data.listAfter.name.toLowerCase().includes('fix done from dev')) {
        actionCounts.moveToDone++;
      }
      if (action.type === 'updateCard' && action.data?.listAfter?.name && 
          action.data.listAfter.name.toLowerCase().includes('doing')) {
        actionCounts.moveToDoing++;
      }
      if (action.type === 'updateCard' && action.data?.listAfter?.name && 
          action.data.listAfter.name.toLowerCase().includes('waiting to fix') &&
          !action.data.listAfter.name.toLowerCase().includes('from dev')) {
        actionCounts.moveToWaitingToFix++;
      }
      if (action.type === 'updateCard' && action.data?.listAfter?.name && 
          action.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)')) {
        actionCounts.moveToWaitingToFixFromDev++;
      }
      if (action.type === 'updateCard' && action.data?.listAfter?.name && 
          (action.data.listAfter.name.toLowerCase().includes('update workflow required') || 
           action.data.listAfter.name.toLowerCase().includes('waiting for access'))) {
        actionCounts.moveToUpdateWorkflow++;
      }
      if (action.type === 'updateCard' && action.data?.listAfter?.name && 
          action.data.listAfter.name.toLowerCase().includes('fix done from dev')) {
        actionCounts.moveToFixDoneFromDev++;
      }
      if (action.type === 'removeMemberFromCard' && action.idMemberCreator === action.data?.idMember) {
        actionCounts.leftCard++;
      }
      if (action.type === 'addMemberToCard' && action.data?.idMember) {
        actionCounts.assigned++;
      }
    });

    return actionCounts;
  };

  const actionCounts = getActionCounts();

  // Get current user when component mounts
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      console.log('Current user:', user);
    }
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ 
        p: 2, 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e3e9f7 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Top Row: Clock + Filter */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* Clock Section - Compact */}
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
              color: 'white',
              borderRadius: 2,
              boxShadow: '0 4px 16px rgba(6, 3, 141, 0.15)',
              flex: '0 0 auto',
              minWidth: { xs: '100%', sm: '200px', md: '250px' }
            }}
          >
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', opacity: 0.9 }}>
              Thời gian hiện tại
            </Typography>
            
            <Typography variant="h3" sx={{ 
              mb: 1, 
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              letterSpacing: 1
            }}>
              {formatTime(currentTime)}
            </Typography>
            
            <Typography variant="body2" sx={{ 
              opacity: 0.8,
              fontSize: '0.875rem',
              fontWeight: 500
            }}>
              {formatDate(currentTime)}
            </Typography>
          </Paper>

          {/* Filter Section - Compact */}
          <Paper elevation={3} sx={{ 
            p: 2, 
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            flex: 1,
            minWidth: { xs: '100%', sm: '300px' }
          }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              fontWeight: 'bold',
              color: '#1B263B',
              textAlign: 'center'
            }}>
              📅 Filter Actions
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Chọn ngày"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      fullWidth 
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          background: 'white',
                          '&:hover fieldset': {
                            borderColor: '#06038D'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#06038D',
                            borderWidth: 2
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#64748b',
                          fontSize: '0.875rem',
                          '&.Mui-focused': {
                            color: '#06038D'
                          }
                        }
                      }}
                    />
                  )}
                  format="DD/MM/YYYY"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{
                    color: '#64748b',
                    fontSize: '0.875rem',
                    '&.Mui-focused': {
                      color: '#06038D'
                    }
                  }}>
                    Ca trực
                  </InputLabel>
                  <Select
                    value={selectedShift}
                    label="Ca trực"
                    onChange={(e) => setSelectedShift(e.target.value)}
                    sx={{
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e2e8f0'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#06038D'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#06038D',
                        borderWidth: 2
                      }
                    }}
                  >
                    {shifts.map((shift) => (
                      <MenuItem key={shift.id} value={shift.id}>
                        {shift.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {selectedShift && (
              <Box sx={{ 
                mt: 2, 
                p: 1.5, 
                background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                borderRadius: 1.5,
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(6, 3, 141, 0.2)'
              }}>
                <Typography variant="body2" color="white" sx={{ fontWeight: 600, mb: 0.5 }}>
                  🕐 Ca trực hiện tại: {getShiftName(selectedShift)}
                </Typography>
                {currentUser && (
                  <Typography variant="caption" color="white" sx={{ opacity: 0.9 }}>
                    👤 User: {currentUser.fullName || currentUser.name || currentUser.email}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Actions Section - Full Width Below */}
        <Paper elevation={3} sx={{ 
          p: 2,
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {error && (
            <Alert severity="error" sx={{ 
              mb: 1.5,
              borderRadius: 1.5,
              py: 0.5,
              '& .MuiAlert-icon': {
                color: '#d32f2f'
              }
            }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              p: 2,
              flex: 1
            }}>
              <CircularProgress size={32} sx={{ color: '#06038D' }} />
            </Box>
          ) : actions.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              p: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="h5" sx={{ mb: 1, color: '#94a3b8' }}>
                📭
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Không có actions nào trong ca trực này
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Grid thống kê actions - No scroll needed */}
              <Grid container spacing={1.5} sx={{ flex: 1 }}>
                {Object.entries(actionCounts).map(([actionType, count]) => {
                  if (count === 0) return null;
                  
                  const getActionInfo = (type) => {
                    switch (type) {
                      case 'createCard': return { label: 'Tạo card mới', color: 'primary', icon: '➕' };
                      case 'updateCard': return { label: 'Cập nhật card', color: 'default', icon: '✏️' };
                      case 'commentCard': return { label: 'Bình luận', color: 'info', icon: '💬' };
                      case 'addMemberToCard': return { label: 'Thêm member', color: 'success', icon: '👤' };
                      case 'removeMemberFromCard': return { label: 'Xóa member', color: 'warning', icon: '❌' };
                      case 'completeCard': return { label: 'Hoàn thành card', color: 'success', icon: '✅' };
                      case 'moveToDone': return { label: 'Chuyển đến Done', color: 'success', icon: '🎯' };
                      case 'moveToDoing': return { label: 'Chuyển đến Doing', color: 'warning', icon: '🔄' };
                      case 'moveToWaitingToFix': return { label: 'Chuyển đến Waiting to fix', color: 'warning', icon: '⏳' };
                      case 'moveToWaitingToFixFromDev': return { label: 'Chuyển đến Waiting to fix (from dev)', color: 'secondary', icon: '🔧' };
                      case 'moveToUpdateWorkflow': return { label: 'Chuyển đến Update workflow', color: 'default', icon: '📋' };
                      case 'moveToFixDoneFromDev': return { label: 'Chuyển đến Fix done from dev', color: 'success', icon: '🔨' };
                      case 'leftCard': return { label: 'Rời khỏi card', color: 'error', icon: '🚪' };
                      case 'assigned': return { label: 'Được gán', color: 'info', icon: '📌' };
                      default: return { label: type, color: 'default', icon: '📄' };
                    }
                  };

                  const actionInfo = getActionInfo(actionType);
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={actionType}>
                      <Card sx={{
                        borderRadius: 1.5,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #f1f5f9',
                        transition: 'all 0.2s ease',
                        height: '100%',
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                          <Typography variant="h4" sx={{ mb: 1, fontSize: '2rem' }}>
                            {actionInfo.icon}
                          </Typography>
                          <Chip 
                            label={actionInfo.label} 
                            color={actionInfo.color} 
                            size="small" 
                            sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.75rem',
                              mb: 1
                            }}
                          />
                          <Typography variant="h4" sx={{ 
                            fontWeight: 'bold', 
                            color: '#06038D',
                            fontSize: '1.5rem'
                          }}>
                            {count}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default CheckoutShift;