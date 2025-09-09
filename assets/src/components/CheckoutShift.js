import React, { useState, useEffect, useMemo } from 'react';
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
import { getManyActionsOnBoard, getActionsByCard } from '../api/trelloApi';
import { getCurrentUser } from '../api/usersApi';
import { calculateResolutionTime } from '../utils/resolutionTime';
import CardDetailModal from './CardDetailModal';
import { sendMessageToChannel } from '../api/slackApi';
import { calculateDevResolutionTime } from '../utils/devResolutionTime';
import assignCard from '../api/assignCard';
import members from '../data/members.json';

const CheckoutShift = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedShift, setSelectedShift] = useState('');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedActionType, setSelectedActionType] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState('');
  const [avgResTime, setAvgResTime] = useState(0);
  const [resDetails, setResDetails] = useState([]);
  const [showResDetails, setShowResDetails] = useState(false);

  // Thêm state cho dev resolution time
  const [avgDevResTime, setAvgDevResTime] = useState(0);
  const [devResDetails, setDevResDetails] = useState([]);
  const [avgTSResTime, setAvgTSResTime] = useState(0);
  const [tsResDetails, setTsResDetails] = useState([]);

  // Định nghĩa các ca trực
  const shifts = [
    { id: 'shift1', name: 'Ca 1 (0:00 - 4:00)', startHour: 0, endHour: 4 },
    { id: 'shift2', name: 'Ca 2 (4:00 - 8:00)', startHour: 4, endHour: 8 },
    { id: 'shift3', name: 'Ca 3 (8:00 - 12:00)', startHour: 8, endHour: 12 },
    { id: 'shift4', name: 'Ca 4 (12:00 - 16:00)', startHour: 12, endHour: 16 },
    { id: 'shift5.1', name: 'Ca 5.1 (16:00 - 18:00)', startHour: 16, endHour: 18 },
    { id: 'shift5.2', name: 'Ca 5.2 (18:00 - 20:00)', startHour: 18, endHour: 20 },
    { id: 'shift6', name: 'Ca 6 (20:00 - 0:00)', startHour: 20, endHour: 0 },
    { id: 'shift5', name: 'Ca 5 (16:00 - 20:00)', startHour: 16, endHour: 20 },
    { id: 'shift4+5.1', name: 'Ca 4 + 5.1 (12:00 - 18:00)', startHour: 12, endHour: 18 },
    { id: 'shift5.2+6', name: 'Ca 5.2 + 6 (18:00 - 0:00)', startHour: 18, endHour: 0 }
  ];

  // Xác định ca trực mặc định dựa trên giờ hiện tại
  const getDefaultShift = (hour) => {
    if (hour >= 0 && hour < 4) return 'shift1';
    if (hour >= 4 && hour < 8) return 'shift2';
    if (hour >= 8 && hour < 12) return 'shift3';
    if (hour >= 12 && hour < 16) return 'shift4';
    if (hour >= 16 && hour < 18) return 'shift5.1';
    if (hour >= 18 && hour < 20) return 'shift5.2';
    if (hour >= 20 && hour < 24) return 'shift6';
    return 'shift1';
  };

  // Function để kiểm tra member có role là TS hay không
  const isTSMember = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member && member.role === 'TS';
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
        const endMinute = shift.endMinute || 0;
        endDate = selectedDate.hour(shift.endHour).minute(endMinute).second(0).millisecond(0);
      }
      // Điều chỉnh since sớm hơn 10 phút, before muộn hơn 30 phút
      const since = startDate.subtract(10, 'minute').toISOString();
      const before = endDate.add(30, 'minute').toISOString();
      const actionsData = await getManyActionsOnBoard(since, before);
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

  // Handler to calculate avg resolution time and submit data
  const handleCalculateAvgResolutionTime = async () => {
    if (!actions.length || !currentUser?.trelloId) return;
    setResLoading(true);
    setResError('');
    setShowResDetails(true);
    
    try {
      // 1. Submit assign card data first
      await handleSubmitToDatabase();
      
      // 2. Card đã complete bởi current user
      const completedCardIds = Array.from(new Set(actions.filter(action =>
        action.type === 'updateCard' &&
        action.data?.card?.dueComplete === true &&
        action.data?.card?.id &&
        action.idMemberCreator === currentUser?.trelloId
      ).map(action => action.data.card.id)));
    
      if (!completedCardIds.length) {
        setResDetails([]);
        setDevResDetails([]);
        setTsResDetails([]);
        setAvgResTime(0);
        setAvgDevResTime(0);
        setAvgTSResTime(0);
        setResLoading(false);
        return;
      }

      // 3. Lấy actions cho từng card
      const allCardActions = await Promise.all(
        completedCardIds.map(cardId => getActionsByCard(cardId).then(
          actions => ({ cardId, actions }),
          err => ({ cardId, actions: [] })
        ))
      );

      // 4. Phân loại card dev và card TS
      const devCards = [];
      const tsCards = [];

      allCardActions.forEach(({ cardId, actions }) => {
        // Kiểm tra xem card có ở cột "Waiting to fix (from dev)" không
        const isDevCard = actions.some(action => 
          action.type === 'updateCard' && 
          action.data?.listAfter?.name === 'Waiting to fix (from dev)'
        );

        // Get card name from actions
        const cardAction = actions.find(action => action.data?.card?.name);
        const cardName = cardAction?.data?.card?.name || `Card ${cardId.slice(-8)}`;

        if (isDevCard) {
          // Tính dev resolution time
          const devResolution = calculateDevResolutionTime(actions);
          if (devResolution && devResolution.resolutionTime) {
            devCards.push({
              id: cardId,
              name: cardName,
              resolutionTime: Math.round(devResolution.resolutionTime * 100) / 100,
              devResolutionTime: Math.round(devResolution.devResolutionTime * 100) / 100,
              firstActionTime: Math.round(devResolution.firstActionTime * 100) / 100,
              type: 'dev'
            });
          }
        } else {
          // Tính TS resolution time
          const tsResolution = calculateResolutionTime(actions);
          if (tsResolution && tsResolution.resolutionTime) {
            tsCards.push({
              id: cardId,
              name: cardName,
              resolutionTime: Math.round(tsResolution.resolutionTime * 100) / 100,
              totalTime: Math.round(tsResolution.resolutionTime * 100) / 100,
              firstActionTime: Math.round(tsResolution.firstActionTime * 100) / 100,
              type: 'ts'
            });
          }
        }
      });

      // 5. Tính resolution time trung bình cho từng loại
      const devTotal = devCards.reduce((sum, card) => sum + card.resolutionTime, 0);
      const tsTotal = tsCards.reduce((sum, card) => sum + card.resolutionTime, 0);
      
      const avgDev = devCards.length > 0 ? Math.round((devTotal / devCards.length) * 100) / 100 : 0;
      const avgTS = tsCards.length > 0 ? Math.round((tsTotal / tsCards.length) * 100) / 100 : 0;
      const avgTotal = (devCards.length + tsCards.length) > 0 ? 
        Math.round(((devTotal + tsTotal) / (devCards.length + tsCards.length)) * 100) / 100 : 0;

      // 6. Cập nhật state
      setDevResDetails(devCards);
      setTsResDetails(tsCards);
      setResDetails([...devCards, ...tsCards]); // Tất cả cards
      setAvgDevResTime(avgDev);
      setAvgTSResTime(avgTS);
      setAvgResTime(avgTotal);

      // 7. Tạo message Slack
      const slackMessage = messageSlackConvert({
        avgResolutionTime: avgTotal,
        avgDevResolutionTime: avgDev,
        avgTSResolutionTime: avgTS,
        devCardCount: devCards.length,
        tsCardCount: tsCards.length,
        completeCardCount: getFilteredActionsByType('completeCard').length,
        moveToDevCount: getFilteredActionsByType('moveToDev').length,
        moveToDoingCount: getFilteredActionsByType('moveToDoing').length,
        assignedCardCount: getFilteredActionsByType('assignedCard').length,
        memberName: currentUser?.fullName || currentUser?.name || '',
        currentShiftName: getShiftName(selectedShift),
        currentDate: dayjs(selectedDate).format('DD/MM/YYYY')
      });
      
      await sendMessageToChannel(slackMessage, 'ts-shift-report');
    } catch (err) {
      setResError('Có lỗi khi tính resolution time');
    } finally {
      setResLoading(false);
    }
  };

  const getShiftName = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    return shift ? shift.name : '';
  };

  // Calculate assign card count for display - chỉ count card assign cho TS khác
  const assignCardCount = useMemo(() => {
    if (!actions.length || !currentUser?.trelloId) return 0;
    
    // Lọc actions addMemberToCard mà current user là người tạo và assign cho TS khác
    const assignActions = actions.filter(action => 
      action.type === 'addMemberToCard' && 
      action.idMemberCreator === currentUser.trelloId &&
      action.data?.card?.id &&
      action.data?.idMember &&
      action.data.idMember !== currentUser.trelloId && // Không tính trường hợp tự add chính mình
      isTSMember(action.data.idMember) // Chỉ tính khi assign cho member có role là TS
    );
    
    // Đếm unique cards (không trùng lặp)
    const uniqueCardIds = new Set();
    assignActions.forEach(action => {
      uniqueCardIds.add(action.data.card.id);
    });
    
    return uniqueCardIds.size;
  }, [actions, currentUser]);

  // Memoize action counts to prevent infinite re-render
  const actionCounts = useMemo(() => {
    if (!actions.length) return {};
    const actionCounts = {
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
      if (action.type === 'addMemberToCard') {
        return action.data?.idMember === currentUser?.trelloId;
      }
      return action.idMemberCreator === currentUser?.trelloId;
    });
    filteredActions.forEach(action => {
      if (action.type === 'updateCard') actionCounts.updateCard++;
      if (action.type === 'commentCard') actionCounts.commentCard++;
      if (action.type === 'addMemberToCard') {
        // Count when current user adds another TS member to a card
        if (action.idMemberCreator === currentUser?.trelloId && 
            action.data?.idMember && 
            action.data.idMember !== currentUser?.trelloId &&
            isTSMember(action.data.idMember)) {
          actionCounts.removeMemberFromCard++;
        }
      }
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
    
    // Đếm số card khác nhau mà user đã complete (chỉ tính mỗi card một lần)
    const completedCardIds = new Set();
    filteredActions.forEach(action => {
      if (
        action.type === 'updateCard' &&
        action.data?.card?.dueComplete === true &&
        action.data?.card?.id
      ) {
        completedCardIds.add(action.data.card.id);
      }
    });
    actionCounts.completeCard = completedCardIds.size;
    
    return actionCounts;
  }, [actions, currentUser]);

  // Get filtered actions based on selected action type
  const getFilteredActions = () => {
    if (!selectedActionType || !actions.length || !currentUser?.trelloId) {
      return [];
    }

    // Filter actions for only the current user
    const userActions = actions.filter(action => {
      if (action.type === 'addMemberToCard') {
        return action.data?.idMember === currentUser?.trelloId;
      }
      return action.idMemberCreator === currentUser?.trelloId;
    });

    // Data-driven filter logic
    return userActions.filter(action => {
      if (selectedActionType === 'moveToDone') {
        return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done');
      }
      if (selectedActionType === 'moveToDoing') {
        return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing');
      }
      if (selectedActionType === 'moveToWaitingToFix') {
        return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix');
      }
      if (selectedActionType === 'moveToFixDoneFromDev') {
        return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev');
      }
      if (selectedActionType === 'moveToUpdateWorkflowOrWaitingAccess') {
        return action.type === 'updateCard' && action.data?.listAfter?.name && (
          action.data.listAfter.name.toLowerCase().includes('update workflow required') ||
          action.data.listAfter.name.toLowerCase().includes('waiting for access')
        );
      }
      if (selectedActionType === 'completeCard') {
        return action.type === 'updateCard' && action.data?.card?.dueComplete === true;
      }
      if (selectedActionType === 'commentCard') {
        return action.type === 'commentCard';
      }
      if (selectedActionType === 'addMemberToCard') {
        return action.type === 'addMemberToCard' && action.data?.idMember === currentUser?.trelloId;
      }
      if (selectedActionType === 'removeMemberFromCard') {
        return action.type === 'addMemberToCard' && 
               action.idMemberCreator === currentUser?.trelloId && 
               action.data?.idMember && 
               action.data.idMember !== currentUser?.trelloId &&
               isTSMember(action.data.idMember);
      }
      // Default: match by action.type
      return action.type === selectedActionType;
    });
  };

  // Memoize filtered actions to prevent infinite re-render
  const filteredActions = useMemo(() => getFilteredActions(), [selectedActionType, actions, currentUser]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  function getActionLabel(type) {
    switch (type) {
      case 'resolutionTime': return 'Avg Resolution Time';
      case 'updateCard': return 'Update Card';
      case 'commentCard': return 'Comment Card';
      case 'addMemberToCard': return 'Assigned';
      case 'removeMemberFromCard': return 'Assign TS to Card';
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
        return { icon: '👥', chipLabel: 'ASSIGN', chipBg: '#fff3e0', chipColor: '#f57c00', bgColor: '#fff3e0', color: '#f57c00' };
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

  // Thêm hàm formatMinutes
  function formatMinutes(mins) {
    if (typeof mins !== 'number' || isNaN(mins)) return '-';
    if (mins >= 60) {
      return `${(Math.round((mins / 60) * 100) / 100)} h`;
    }
    return `${mins} mins`;
  }

  // Hàm tạo message gửi Slack
  function messageSlackConvert({
    avgResolutionTime,
    avgDevResolutionTime,
    avgTSResolutionTime,
    devCardCount,
    tsCardCount,
    completeCardCount,
    moveToDevCount,
    moveToDoingCount,
    assignedCardCount,
    memberName,
    currentShiftName,
    currentDate
  }) {
    return (
      `*Báo cáo ca trực của ${memberName} <@U08UGHSA1B3> *\n` +
      `Ca trực: ${currentShiftName} | Ngày: ${currentDate}\n` +
      `- Resolution Time trung bình: ${avgResolutionTime} phút\n` +
      `- Dev Resolution Time trung bình: ${avgDevResolutionTime} phút (${devCardCount} cards)\n` +
      `- TS Resolution Time trung bình: ${avgTSResolutionTime} phút (${tsCardCount} cards)\n` +
      `- Số card hoàn thành: ${completeCardCount}\n` +
      `- Số lần kéo sang cột Dev: ${moveToDevCount}\n` +
      `- Số lần kéo sang cột Doing: ${moveToDoingCount}\n` +
      `- Số card được assign: ${assignedCardCount}\n` +
      '-------------------------------------------------\n'
    );
  }

  // Hàm submit data lên database (internal use)
  const handleSubmitToDatabase = async () => {
    if (!currentUser?.trelloId || !selectedDate || !selectedShift) {
      console.warn('Missing required data for submission');
      return false;
    }

    try {
      // Lọc các actions addMemberToCard mà current user là người tạo và assign cho TS khác
      const assignActions = actions.filter(action => 
        action.type === 'addMemberToCard' && 
        action.idMemberCreator === currentUser.trelloId &&
        action.data?.card?.id &&
        action.data?.idMember &&
        action.data.idMember !== currentUser.trelloId && // Không tính trường hợp tự add chính mình
        isTSMember(action.data.idMember) // Chỉ tính khi assign cho member có role là TS
      );

      if (assignActions.length === 0) {
        console.log('No assign card data to submit');
        return true; // Return true even if no data to submit
      }

      // Loại bỏ duplicate cards (cùng card được assign nhiều lần)
      const uniqueAssignActions = [];
      const seenCardIds = new Set();
      
      assignActions.forEach(action => {
        const cardId = action.data.card.id;
        if (!seenCardIds.has(cardId)) {
          seenCardIds.add(cardId);
          uniqueAssignActions.push(action);
        }
      });

      console.log(`Found ${assignActions.length} assign actions, ${uniqueAssignActions.length} unique cards`);

      // Tạo cấu trúc dữ liệu theo yêu cầu
      const submitData = {
        shift: selectedShift,
        createdAt: selectedDate.format('YYYY-MM-DD'),
        memberId: currentUser.trelloId,
        cards: uniqueAssignActions.map(action => ({
          cardUrl: action.data.card.url || `https://trello.com/c/${action.data.card.shortLink}`,
          cardName: action.data.card.name || `Card ${action.data.card.id.slice(-8)}`,
          idMember: action.data.idMember,
          status: "approved"
        }))
      };

      console.log('Submitting assign card data:', submitData);
      console.log('Cards to be submitted:');
      submitData.cards.forEach((card, index) => {
        console.log(`${index + 1}. ${card.cardName} -> ${card.idMember}`);
      });

      // Gọi API để submit data
      const response = await assignCard.createAssignCards(submitData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.message && response.message.includes('already exists')) {
        console.log('Assign card data already exists for this shift and date:', response);
        return true; // Vẫn return true vì không phải lỗi
      }

      console.log('Assign card data submitted successfully:', response);
      return true;

    } catch (error) {
      console.error('Error submitting assign card data:', error);
      throw error; // Re-throw để handle ở function gọi
    }
  };

  // Hàm filter action theo type (tối ưu, dùng lại cho các thống kê)
  function getFilteredActionsByType(type) {
    if (!actions.length || !currentUser?.trelloId) return [];
    switch (type) {
      case 'completeCard':
        // Chỉ trả về actions complete cho các card khác nhau (không trùng lặp)
        const completedCardIds = new Set();
        const uniqueCompleteActions = [];
        actions.forEach(action => {
          if (
            action.type === 'updateCard' && 
            action.data?.card?.dueComplete === true && 
            action.idMemberCreator === currentUser?.trelloId &&
            action.data?.card?.id &&
            !completedCardIds.has(action.data.card.id)
          ) {
            completedCardIds.add(action.data.card.id);
            uniqueCompleteActions.push(action);
          }
        });
        return uniqueCompleteActions;
      case 'moveToDev':
        return actions.filter(action => action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('dev') && action.idMemberCreator === currentUser?.trelloId);
      case 'moveToDoing':
        return actions.filter(action => action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing') && action.idMemberCreator === currentUser?.trelloId);
      case 'assignedCard':
        return actions.filter(action => action.type === 'addMemberToCard' && action.data?.idMember === currentUser?.trelloId);
      default:
        return [];
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
            {/* Box dưới: Current Shift + User + Submit Button */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: '#f1f7ff',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              {/* First row: Current Shift + User + Submit Button */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="ACTIVE" color="primary" size="small" sx={{ fontWeight: 700 }} />
                  <Typography sx={{ fontWeight: 600 }}>
                    Current Shift: {getShiftName(selectedShift)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              </Box>
              

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
            {/* Avg Resolution Time card */}
            <Grid item xs={12} sm={6} md={3} lg={2} key="resolutionTime">
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
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  ...(showResDetails && {
                    border: '2px solid #1976d2',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                    transform: 'translateY(-2px)'
                  }),
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{
                    background: '#fce4ec',
                    color: '#c2185b',
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
                    ⏱️
                  </Box>
                  <Box sx={{
                    background: '#fce4ec',
                    color: '#c2185b',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.2,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    minWidth: 48,
                    textAlign: 'center',
                    alignSelf: 'flex-start'
                  }}>TIME</Box>
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: 16, mb: 0.5 }}>Avg Resolution Time</Typography>
                <Typography sx={{ 
                  fontWeight: 800, 
                  fontSize: 24, 
                  color: '#111827',
                  lineHeight: 1.2
                }}>
                  {resLoading ? <CircularProgress size={20} /> : formatMinutes(avgResTime)}
                </Typography>
                <Button
                  variant="contained"
                  color={showResDetails ? 'inherit' : 'error'}
                  size="small"
                  sx={{ mt: 2, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                  onClick={() => {
                    if (showResDetails) {
                      setShowResDetails(false);
                    } else {
                      handleCalculateAvgResolutionTime();
                    }
                  }}
                  disabled={resLoading}
                >
                  {resLoading ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    showResDetails ? 'Đóng' : ` Tính Resolution Time`
                  )}
                </Button>
              </Paper>
            </Grid>

            {/* Dev & TS Resolution Time card */}
            <Grid item xs={12} sm={6} md={3} lg={2} key="devTsResolutionTime">
              <Paper 
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  height: 190,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  ...(showResDetails && {
                    border: '2px solid #6366f1',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                    transform: 'translateY(-2px)'
                  }),
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{
                    background: 'linear-gradient(135deg, #ffebee 0%, #e3f2fd 100%)',
                    color: '#6366f1',
                    borderRadius: 2,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    mr: 1
                  }}>
                    ⚡
                  </Box>
                  <Box sx={{
                    background: 'linear-gradient(135deg, #ffebee 0%, #e3f2fd 100%)',
                    color: '#6366f1',
                    borderRadius: 1.5,
                    px: 1,
                    py: 0.2,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    minWidth: 40,
                    textAlign: 'center',
                    alignSelf: 'flex-start'
                  }}>RESOLUTION</Box>
                </Box>
                
                {/* Title */}
                <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1, textAlign: 'center' }}>
                  Dev & TS Resolution Time
                </Typography>
                
                {/* Metrics Container */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 1,
                  flex: 1,
                  justifyContent: 'center'
                }}>
                  {/* Dev Metric */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 0.8,
                    background: '#fff5f5',
                    borderRadius: 1,
                    border: '1px solid #ffebee'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffebee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#d32f2f'
                      }}>
                        🐛
                      </Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12, color: '#d32f2f' }}>
                        Dev
                      </Typography>
                    </Box>
                    <Typography sx={{ 
                      fontWeight: 700, 
                      fontSize: 14, 
                      color: '#d32f2f'
                    }}>
                      {resLoading ? <CircularProgress size={12} /> : formatMinutes(avgDevResTime)}
                    </Typography>
                  </Box>

                  {/* Divider */}
                  <Box sx={{ 
                    height: 0.5, 
                    background: 'linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%)',
                    mx: 0.5
                  }} />

                  {/* TS Metric */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 0.8,
                    background: '#f8fafc',
                    borderRadius: 1,
                    border: '1px solid #e3f2fd'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#e3f2fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#1976d2'
                      }}>
                        👨‍💻
                      </Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12, color: '#1976d2' }}>
                        TS
                      </Typography>
                    </Box>
                    <Typography sx={{ 
                      fontWeight: 700, 
                      fontSize: 14, 
                      color: '#1976d2'
                    }}>
                      {resLoading ? <CircularProgress size={12} /> : formatMinutes(avgTSResTime)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Other action cards */}
            {Object.entries(actionCounts).map(([key, value]) => {
              const actionMeta = getActionMeta(key);
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
                      fontSize: 28, 
                      color: '#111827',
                      lineHeight: 1.2
                    }}>
                      {value}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Action Details */}
      {selectedActionType && filteredActions.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {getActionLabel(selectedActionType)} Details ({filteredActions.length} actions)
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
            {filteredActions.map((action, index) => (
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
      {!selectedActionType && showResDetails && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Card Resolution Details ({resDetails.length} cards)
          </Typography>
          {resError && <Alert severity="error" sx={{ mb: 2 }}>{resError}</Alert>}
          {resLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
              <CircularProgress size={32} sx={{ color: '#06038D' }} />
            </Box>
          ) : (
            <>
              {/* Dev Cards Section */}
              {devResDetails.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
                    🐛 Dev Cards ({devResDetails.length} cards) - Avg: {formatMinutes(avgDevResTime)}
                  </Typography>
                  <Grid container spacing={2}>
                    {devResDetails.map((card) => (
                      <Grid item xs={12} md={6} lg={4} key={card.id}>
                        <Paper sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          border: '2px solid #ffebee',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                              {card.name}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, background: '#fff5f5', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#ffebee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    🐛
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>Dev Resolution</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                                  {formatMinutes(card.devResolutionTime)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, background: '#fff5f5', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#ffebee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    ⏱️
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>Total Time</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                                  {formatMinutes(card.resolutionTime)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, background: '#fff5f5', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#ffebee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    🚀
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>First Action</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                                  {formatMinutes(card.firstActionTime)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip label="DEV CARD" size="small" sx={{ background: '#ffebee', color: '#d32f2f', fontWeight: 600, fontSize: 11 }} />
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

              {/* TS Cards Section */}
              {tsResDetails.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
                    👨‍💻 TS Cards ({tsResDetails.length} cards) - Avg: {formatMinutes(avgTSResTime)}
                  </Typography>
                  <Grid container spacing={2}>
                    {tsResDetails.map((card) => (
                      <Grid item xs={12} md={6} lg={4} key={card.id}>
                        <Paper sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          border: '2px solid #e3f2fd',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                              {card.name}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, background: '#f8fafc', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    ⏱️
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>TS Resolution</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                  {formatMinutes(card.resolutionTime)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, background: '#f8fafc', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    📅
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>Total Time</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                  {formatMinutes(card.totalTime)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, background: '#f8fafc', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    🚀
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#64748b' }}>First Action</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                  {formatMinutes(card.firstActionTime)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip label="TS CARD" size="small" sx={{ background: '#e3f2fd', color: '#1976d2', fontWeight: 600, fontSize: 11 }} />
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
            </>
          )}
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