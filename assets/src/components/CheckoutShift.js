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
  Avatar,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { getBoardActionsByMemberAndDate } from '../api/trelloApi';
import { getCurrentUser } from '../api/usersApi';
import { calculateResolutionTime } from '../utils/resolutionTime';
import CardDetailModal from './CardDetailModal';

const CheckoutShift = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedShift, setSelectedShift] = useState('');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [cardResolutionDetails, setCardResolutionDetails] = useState([]);
  const [averageResolutionTime, setAverageResolutionTime] = useState(0);
  const [selectedActionType, setSelectedActionType] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);

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
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (!selectedShift) {
        setSelectedShift(getDefaultShift(now.getHours()));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedShift]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      // Tính thời gian bắt đầu và kết thúc ca trực
      let startDate = selectedDate.hour(shift.startHour).minute(0).second(0).millisecond(0);
      let endDate;
      if (shift.endHour === 0) {
        endDate = selectedDate.add(1, 'day').hour(shift.endHour).minute(0).second(0).millisecond(0);
      } else {
        endDate = selectedDate.hour(shift.endHour).minute(0).second(0).millisecond(0);
      }
      // Điều chỉnh since sớm hơn 10 phút, before muộn hơn 30 phút
      const since = startDate.subtract(10, 'minute').toISOString();
      const before = endDate.add(30, 'minute').toISOString();
      console.log('since', since);
      console.log('before', before);
      const actionsData = await getBoardActionsByMemberAndDate(since, before);
      console.log('Fetched actionsData:', actionsData);
      setActions(actionsData || []);
    } catch (err) {
      setError('Có lỗi khi tải dữ liệu actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedShift && currentUser?.trelloId) {
      fetchActions();
    }
  }, [selectedDate, selectedShift, currentUser]);

  // Update card resolution details when actions change
  useEffect(() => {
    if (!actions.length || !currentUser?.trelloId) {
      setCardResolutionDetails([]);
      setAverageResolutionTime(0);
      return;
    }

    // 1. Card đã complete bởi current user
    const completedCardIds = new Set();
    actions.forEach(action => {
      if (
        action.type === 'updateCard' &&
        action.data?.card?.dueComplete === true &&
        action.data?.card?.id &&
        action.idMemberCreator === currentUser?.trelloId // Chỉ tính card mà current user complete
      ) {
        completedCardIds.add(action.data.card.id);
      }
    });
    console.log('completedCardIds by current user', completedCardIds.size, completedCardIds);

    const cardDetails = [];
    let totalResolutionTime = 0;
    let cardCount = 0;
    
    if (completedCardIds.size > 0) {
      completedCardIds.forEach(cardId => {
        const cardActionList = actions.filter(action => action.data?.card?.id === cardId);
        const resolution = calculateResolutionTime(cardActionList);
        console.log(`Resolution for card ${cardId}:`, resolution);
        if (resolution && resolution.TSResolutionTime) {
          totalResolutionTime += resolution.TSResolutionTime;
          cardCount++;
          // Get card name from actions
          const cardAction = cardActionList.find(action => action.data?.card?.name);
          const cardName = cardAction?.data?.card?.name || `Card ${cardId.slice(-8)}`;
          cardDetails.push({
            id: cardId,
            name: cardName,
            resolutionTime: Math.round(resolution.TSResolutionTime * 100) / 100,
            totalTime: Math.round(resolution.resolutionTime * 100) / 100,
            firstActionTime: Math.round(resolution.firstActionTime * 100) / 100
          });

        }
      });
    }
    
    const average = cardCount > 0 ? Math.round((totalResolutionTime / cardCount) * 100) / 100 : 0;
    setAverageResolutionTime(average);
    setCardResolutionDetails(cardDetails);
  }, [actions, currentUser?.trelloId]);

  const getShiftName = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    return shift ? shift.name : '';
  };

  const getActionCounts = () => {
    if (!actions.length) return {};
    const actionCounts = {
      resolutionTime: 0,
      addMemberToCard: 0,
      completeCard: 0,
      moveToDone: 0,
      removeMemberFromCard: 0,
      updateCard: 0,
      commentCard: 0,
      moveToDoing: 0,
      moveToWaitingToFix: 0,
      moveToFixDoneFromDev: 0,
      moveToUpdateWorkflowOrWaitingAccess: 0,
    };
    
    // Filter actions for only the current user as member being added
    const filteredActions = actions.filter(action => {
      // For addMemberToCard, only count if currentUser is the member being added
      if (action.type === 'addMemberToCard') {
        return action.data?.idMember === currentUser?.trelloId;
      }
      // For other actions, only count if currentUser is the creator
      return action.idMemberCreator === currentUser?.trelloId;
    });

    filteredActions.forEach(action => {
      if (action.type === 'updateCard') actionCounts.updateCard++;
      if (action.type === 'commentCard') actionCounts.commentCard++;
      if (action.type === 'removeMemberFromCard') {
        // Only count if current user is the one being removed AND they are the creator of the action
        if (action.data?.idMember === currentUser?.trelloId && action.idMemberCreator === currentUser?.trelloId) {
          actionCounts.removeMemberFromCard++;
        }
      }
      if (action.type === 'updateCard' && action.data?.card?.dueComplete === true) actionCounts.completeCard++;
      if (action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done')) actionCounts.moveToDone++;
      if (action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing')) actionCounts.moveToDoing++;
      if (action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix')) actionCounts.moveToWaitingToFix++;
      if (action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev')) actionCounts.moveToFixDoneFromDev++;
      if (action.type === 'updateCard' && action.data?.listAfter?.name && (action.data.listAfter.name.toLowerCase().includes('update workflow required') || action.data.listAfter.name.toLowerCase().includes('waiting for access'))) actionCounts.moveToUpdateWorkflowOrWaitingAccess++;
    });
    
    // Đếm số card khác nhau mà user được add vào
    const addedCardIds = new Set();
    filteredActions.forEach(action => {
      if (
        action.type === 'addMemberToCard' &&
        action.data?.idMember === currentUser?.trelloId &&
        action.data?.card?.id
      ) {
        addedCardIds.add(action.data.card.id);
      }
    });
    actionCounts.addMemberToCard = addedCardIds.size;
    
    // Add resolution time from state
    actionCounts.resolutionTime = averageResolutionTime;
    
    return actionCounts;
  };

  const actionCounts = getActionCounts();

  // Get filtered actions based on selected action type
  const getFilteredActions = () => {
    if (!selectedActionType || !actions.length || !currentUser?.trelloId) {
      return [];
    }

    // Filter actions for only the current user
    const userActions = actions.filter(action => {
      // For addMemberToCard, only count if currentUser is the member being added
      if (action.type === 'addMemberToCard') {
        return action.data?.idMember === currentUser?.trelloId;
      }
      // For other actions, only count if currentUser is the creator
      return action.idMemberCreator === currentUser?.trelloId;
    });

    // Filter by action type
    return userActions.filter(action => {
      switch (selectedActionType) {
        case 'updateCard':
          return action.type === 'updateCard';
        case 'commentCard':
          return action.type === 'commentCard';
        case 'addMemberToCard':
          return action.type === 'addMemberToCard' && action.data?.idMember === currentUser?.trelloId;
        case 'removeMemberFromCard':
          return action.type === 'removeMemberFromCard' && action.data?.idMember === currentUser?.trelloId && action.idMemberCreator === currentUser?.trelloId;
        case 'completeCard':
          return action.type === 'updateCard' && action.data?.card?.dueComplete === true;
        case 'moveToDone':
          return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done');
        case 'moveToDoing':
          return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing');
        case 'moveToWaitingToFix':
          return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix');
        case 'moveToFixDoneFromDev':
          return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev');
        case 'moveToUpdateWorkflowOrWaitingAccess':
          return action.type === 'updateCard' && action.data?.listAfter?.name && (action.data.listAfter.name.toLowerCase().includes('update workflow required') || action.data.listAfter.name.toLowerCase().includes('waiting for access'));
        default:
          return false;
      }
    });
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Helper functions for icons and labels
  function getActionIcon(type) {
    switch (type) {
      case 'updateCard': return '📝';
      case 'commentCard': return '💬';
      case 'addMemberToCard': return '👤';
      case 'removeMemberFromCard': return '❌';
      case 'completeCard': return '✅';
      case 'moveToDone': return '➡️';
      case 'moveToDoing': return '🔄';
      case 'moveToWaitingToFix': return '⏳';
      case 'moveToFixDoneFromDev': return '🔧';
      case 'assigned': return '📌';
      case 'resolutionTime': return '⏱️';
      default: return '📄';
    }
  }
  function getActionLabel(type) {
    switch (type) {
      case 'resolutionTime': return 'Avg Resolution Time';
      case 'updateCard': return 'Update Card';
      case 'commentCard': return 'Comment Card';
      case 'addMemberToCard': return 'Assigned';
      case 'removeMemberFromCard': return 'Assign card again';
      case 'completeCard': return 'Complete card';
      case 'moveToDone': return 'Move Card to Done';
      case 'moveToDoing': return 'Move Card to Doing';
      case 'moveToWaitingToFix': return 'Move Card to Waiting to fix';
      case 'moveToFixDoneFromDev': return 'Move Card to Fix done from dev';
      case 'moveToUpdateWorkflowOrWaitingAccess': return 'Move to Update workflow/Waiting for access';
      default: return type;
    }
  }

  function getActionMeta(type) {
    switch (type) {
      case 'resolutionTime':
        return { icon: '⏱️', chipLabel: 'TIME', chipBg: '#fce4ec', chipColor: '#c2185b', bgColor: '#fce4ec', color: '#c2185b' };
      case 'updateCard':
        return { icon: '📝', chipLabel: 'UPDATE', chipBg: '#e3f0ff', chipColor: '#1976d2', bgColor: '#e3f0ff', color: '#1976d2' };
      case 'commentCard':
        return { icon: '💬', chipLabel: 'COMMENT', chipBg: '#e3e9f7', chipColor: '#64748b', bgColor: '#e3e9f7', color: '#64748b' };
      case 'addMemberToCard':
        return { icon: '👤', chipLabel: 'MEMBER', chipBg: '#e3f7e3', chipColor: '#2e7d32', bgColor: '#e3f7e3', color: '#2e7d32' };
      case 'removeMemberFromCard':
        return { icon: '❌', chipLabel: 'MEMBER', chipBg: '#ffe3e3', chipColor: '#d32f2f', bgColor: '#ffe3e3', color: '#d32f2f' };
      case 'completeCard':
        return { icon: '✅', chipLabel: 'COMPLETE', chipBg: '#e3f7e3', chipColor: '#2e7d32', bgColor: '#e3f7e3', color: '#2e7d32' };
      case 'moveToDone':
        return { icon: '➡️', chipLabel: 'DONE', chipBg: '#e3f7e3', chipColor: '#2e7d32', bgColor: '#e3f7e3', color: '#2e7d32' };
      case 'moveToDoing':
        return { icon: '🔄', chipLabel: 'DOING', chipBg: '#fff7e3', chipColor: '#f9a825', bgColor: '#fff7e3', color: '#f9a825' };
      case 'moveToWaitingToFix':
        return { icon: '⏳', chipLabel: 'DEV', chipBg: '#fff7e3', chipColor: '#f9a825', bgColor: '#fff7e3', color: '#f9a825' };
      case 'moveToFixDoneFromDev':
        return { icon: '🔧', chipLabel: 'DEV', chipBg: '#ede7f6', chipColor: '#7c4dff', bgColor: '#ede7f6', color: '#7c4dff' };
      case 'moveToUpdateWorkflowOrWaitingAccess':
        return { icon: '⚙️', chipLabel: 'PERMISSION', chipBg: '#fff3e0', chipColor: '#f57c00', bgColor: '#fff3e0', color: '#f57c00' };
      case 'assigned':
        return { icon: '📌', chipLabel: 'TAG', chipBg: '#e3e9f7', chipColor: '#1976d2', bgColor: '#e3e9f7', color: '#1976d2' };
      default:
        return { icon: '📄', chipLabel: 'OTHER', chipBg: '#f3f4f6', chipColor: '#64748b', bgColor: '#f3f4f6', color: '#64748b' };
    }
  }

  return (
    <Box sx={{ p: 3, background: '#f8fafc', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        {/* Current Time */}
        <Grid item xs={12} md={3}>
          <Paper sx={{
            p: 3,
            borderRadius: 3,
            minHeight: 200,
            maxHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #1B263B 0%, #06038D 100%)',
            color: 'white',
            mb: 0
          }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>Current Time</Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, mt: 1 }}>
              {formatDate(currentTime)}
            </Typography>
          </Paper>
        </Grid>

        {/* Shift Filters - now full width */}
        <Grid item xs={12} md={9}>
          <Paper sx={{
            p: 3,
            borderRadius: 3,
            minHeight: 200,
            maxHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Shift Filters</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Working Day"
                    value={selectedDate}
                    sx={{
                      width: '100%',
                    }}
                    onChange={newValue => setSelectedDate(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        sx={{
                          borderRadius: 2,
                          background: '#fff',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            height: 56,
                            minHeight: 56,
                            maxHeight: 56,
                            display: 'flex',
                            alignItems: 'center',
                          },
                          '& .MuiInputBase-input': {
                            height: 'auto',
                            padding: '16.5px 14px',
                          }
                        }}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small"
                  sx={{
                    borderRadius: 2,
                    background: '#fff',
                  }}
                >
                  <InputLabel>Shift Time</InputLabel>
                  <Select
                    value={selectedShift}
                    label="Shift Time"
                    onChange={e => setSelectedShift(e.target.value)}
                    sx={{
                      borderRadius: 2,
                      height: 56,
                      minHeight: 56,
                      maxHeight: 56,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {shifts.map(shift => (
                      <MenuItem key={shift.id} value={shift.id}>{shift.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            {/* Box dưới: Current Shift + User */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: '#f1f7ff',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="ACTIVE" color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Typography sx={{ fontWeight: 600 }}>
                  Current Shift: {getShiftName(selectedShift)}
                </Typography>
              </Box>
              {currentUser && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#e3e9f7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="18" height="18" fill="#1976d2" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
                    </svg>
                  </Box>
                  <Typography sx={{ fontWeight: 500 }}>{currentUser.fullName || currentUser.name}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Action Summary */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Action Summary</Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
            <CircularProgress size={32} sx={{ color: '#06038D' }} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {Object.entries(actionCounts).map(([key, value]) => {
              const actionMeta = getActionMeta(key);
              // Format resolution time with hours unit
              const displayValue = key === 'resolutionTime' 
                ? `${value} mins` 
                : value;
              
              return (
                <Grid item xs={12} sm={6} md={3} lg={2} key={key}>
                  <Paper 
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      height: 190,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ...(selectedActionType === key && {
                        border: '2px solid #1976d2',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                        transform: 'translateY(-2px)'
                      }),
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={() => setSelectedActionType(selectedActionType === key ? null : key)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      {/* Icon box */}
                      <Box sx={{
                        background: actionMeta.bgColor,
                        color: actionMeta.color,
                        borderRadius: 2,
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        mr: 1
                      }}>
                        {actionMeta.icon}
                      </Box>
                      {/* Label chip */}
                      <Box sx={{
                        background: actionMeta.chipBg,
                        color: actionMeta.chipColor,
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.2,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        minWidth: 48,
                        textAlign: 'center',
                        alignSelf: 'flex-start'
                      }}>{actionMeta.chipLabel}</Box>
                    </Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 16, mb: 0.5 }}>{getActionLabel(key)}</Typography>
                    <Typography sx={{ 
                      fontWeight: 800, 
                      fontSize: key === 'resolutionTime' ? 24 : 28, 
                      color: '#111827',
                      lineHeight: 1.2
                    }}>
                      {displayValue}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Action Details */}
      {selectedActionType && getFilteredActions().length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {getActionLabel(selectedActionType)} Details ({getFilteredActions().length} actions)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedActionType(null)}
              sx={{ fontWeight: 600 }}
            >
              Close
            </Button>
          </Box>
          <Grid container spacing={2}>
            {getFilteredActions().map((action, index) => (
              <Grid item xs={12} md={6} lg={4} key={`${action.id}-${index}`}>
                <Paper sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #f1f5f9',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                    borderColor: '#1976d2'
                  }
                }}
                onClick={() => {
                  if (action.data?.card?.id) {
                    setSelectedCardId(action.data.card.id);
                    setIsCardDetailModalOpen(true);
                  }
                }}
                >
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 1,
                        color: '#1e293b',
                        lineHeight: 1.4
                      }}
                    >
                      {action.data?.card?.name || `Card ${action.data?.card?.id?.slice(-8) || 'Unknown'}`}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        background: '#f8fafc',
                        borderRadius: 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#e3e9f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12
                          }}>
                            🕐
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>
                            Time
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          {dayjs(action.date).format('HH:mm DD/MM')}
                        </Typography>
                      </Box>
                      
                      {action.data?.listBefore && action.data?.listAfter && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1,
                          background: '#f8fafc',
                          borderRadius: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#fff7e3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12
                            }}>
                              ➡️
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>
                              Move
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                            {action.data.listBefore.name} → {action.data.listAfter.name}
                          </Typography>
                        </Box>
                      )}
                      
                      {action.data?.text && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          p: 1,
                          background: '#f8fafc',
                          borderRadius: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#e3f7e3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12
                            }}>
                              💬
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>
                              Comment
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#059669', maxWidth: '60%', textAlign: 'right' }}>
                            {action.data.text.length > 50 ? `${action.data.text.substring(0, 50)}...` : action.data.text}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    mt: 2, 
                    pt: 2, 
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Chip 
                      label={getActionLabel(selectedActionType).toUpperCase()} 
                      size="small" 
                      sx={{ 
                        background: getActionMeta(selectedActionType).chipBg, 
                        color: getActionMeta(selectedActionType).chipColor,
                        fontWeight: 600,
                        fontSize: 11
                      }} 
                    />
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                      ID: {action.id?.slice(-8) || 'Unknown'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Card Resolution Details - only show when no action type is selected */}
      {!selectedActionType && cardResolutionDetails.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Card Resolution Details ({cardResolutionDetails.length} cards)
          </Typography>
          <Grid container spacing={2}>
            {cardResolutionDetails.map((card) => (
              <Grid item xs={12} md={6} lg={4} key={card.id}>
                <Paper sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #f1f5f9',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  <Box>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 1,
                        color: '#1e293b',
                        lineHeight: 1.4
                      }}
                    >
                      {card.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        background: '#f8fafc',
                        borderRadius: 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#e3f7e3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12
                          }}>
                            ⏱️
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>
                            TS Resolution
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#059669' }}>
                          {card.resolutionTime} mins
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        background: '#f8fafc',
                        borderRadius: 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#fff7e3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12
                          }}>
                            📅
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>
                            Total Time
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                          {card.totalTime} mins
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        background: '#f8fafc',
                        borderRadius: 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#e3e9f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12
                          }}>
                            🚀
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>
                            First Action
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          {card.firstActionTime} mins
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    mt: 2, 
                    pt: 2, 
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Chip 
                      label="RESOLVED" 
                      size="small" 
                      sx={{ 
                        background: '#e3f7e3', 
                        color: '#059669',
                        fontWeight: 600,
                        fontSize: 11
                      }} 
                    />
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                      ID: {card.id.slice(-8)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        open={isCardDetailModalOpen}
        onClose={() => {
          setIsCardDetailModalOpen(false);
          setSelectedCardId(null);
        }}
        cardId={selectedCardId}
      />
    </Box>
  );
};

export default CheckoutShift;