import React, { useState, useEffect } from 'react';
import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Typography, Paper, Chip, IconButton, Collapse, Button, Fab, Zoom } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getManyActionsOnBoard } from '../../api/trelloApi';
import members from '../../data/members.json';
import CardDetailModal from '../CardDetailModal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

dayjs.extend(utc);
dayjs.extend(timezone);

const shiftLabels = [
    'Ca 1', 'Ca 2', 'Ca 3', 'Ca 4', 'Ca 5.1', 'Ca 5', 'Ca 5.2', 'Ca 6'
];

const shiftTimeRanges = {
    'Ca 1': { start: '00:00', end: '03:59' },
    'Ca 2': { start: '04:00', end: '07:59' },
    'Ca 3': { start: '08:00', end: '11:59' },
    'Ca 4': { start: '12:00', end: '15:59' },
    'Ca 5.1': { start: '16:00', end: '17:59' },
    'Ca 5': { start: '16:00', end: '19:59' },
    'Ca 5.2': { start: '18:00', end: '19:59' },
    'Ca 6': { start: '20:00', end: '23:59' },
};

// Lọc ra các member TS
const tsMembers = members.filter(m => m.role?.toLowerCase() === 'ts' || m.role?.toLowerCase() === 'ts-lead');

// Xác định ca trực hiện tại dựa trên giờ thực tế
const getCurrentShift = () => {
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const hour = now.hour();
    const minute = now.minute();
    const time = hour * 60 + minute;
    for (const label of shiftLabels) {
        const { start, end } = shiftTimeRanges[label];
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;
        if (time >= startTime && time <= endTime) return label;
    }
    return shiftLabels[0];
};

const ActionsDetail = () => {
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
    const [selectedShift, setSelectedShift] = useState(() => getCurrentShift());
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [expandedActionId, setExpandedActionId] = useState(null);
    const [actionGroupFilter, setActionGroupFilter] = useState('all');
    // Scroll to top button
    const [showScroll, setShowScroll] = useState(false);
    const [selectedTSMember, setSelectedTSMember] = useState('all');
    const [viewMode, setViewMode] = useState('action'); // 'action' or 'card'
    const [expandedCards, setExpandedCards] = useState(new Set());

    const fetchActions = async () => {
        setLoading(true);
        try {
            const { start, end } = shiftTimeRanges[selectedShift] || shiftTimeRanges['Ca 1'];
            // Chuyển sang UTC từ Asia/Ho_Chi_Minh
            const since = dayjs.tz(`${selectedDate}T${start}:00`, 'Asia/Ho_Chi_Minh').utc().format();
            const before = dayjs.tz(`${selectedDate}T${end}:59`, 'Asia/Ho_Chi_Minh').utc().format();
            const data = await getManyActionsOnBoard(since, before);
            console.log(data);
            setActions(data || []);
        } catch (err) {
            setActions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedShift) fetchActions();
    }, [selectedDate, selectedShift]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScroll(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleScrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Group actions theo memberId (bao gồm cả addMemberToCard mà member là người được thêm)
    const actionsByMember = {};
    actions.forEach(action => {
        // Gán cho người tạo action
        if (action.idMemberCreator) {
            if (!actionsByMember[action.idMemberCreator]) actionsByMember[action.idMemberCreator] = [];
            actionsByMember[action.idMemberCreator].push(action);
        }
        // Nếu là addMemberToCard và member được add là TS, gán cho member đó
        if (action.type === 'addMemberToCard' && action.data?.idMember) {
            if (!actionsByMember[action.data.idMember]) actionsByMember[action.data.idMember] = [];
            // Tránh trùng lặp nếu idMemberCreator === idMember
            if (!actionsByMember[action.data.idMember].some(a => a.id === action.id)) {
                actionsByMember[action.data.idMember].push(action);
            }
        }
    });

    // Group actions theo cardId
    const actionsByCard = {};
    actions.forEach(action => {
        const cardId = action.data?.card?.id;
        if (cardId) {
            if (!actionsByCard[cardId]) {
                actionsByCard[cardId] = {
                    cardId,
                    cardName: action.data.card.name || 'Unknown Card',
                    actions: []
                };
            }
            actionsByCard[cardId].actions.push(action);
        }
    });

    // Filter options for colored groups and comment card
    const actionGroupOptions = [
        { value: 'all', label: 'Tất cả' },
        { value: 'complete', label: 'Complete card' },
        { value: 'moveToDone', label: 'Move to Done' },
        { value: 'moveToDoing', label: 'Move to Doing' },
        { value: 'moveToWaitingToFix', label: 'Move to Waiting to fix' },
        { value: 'moveToWaitingToFixFromDev', label: 'Move to Waiting to fix (from dev)' },
        { value: 'moveToUpdateWorkflowOrWaitingAccess', label: 'Move to Update workflow/Waiting for access' },
        { value: 'moveToFixDoneFromDev', label: 'Move to Fix done from dev' },
        { value: 'leftCard', label: 'Left card' },
        { value: 'commentCard', label: 'Comment card' },
        { value: 'assigned', label: 'Assigned' },
    ];

    // Refetch actions
    const handleResetData = () => {
        if (selectedShift) fetchActions();
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e3e9f7 100%)',
            p: 0,
        }}>
            <Paper elevation={4} sx={{
                width: '100%',
                mb: 4,
                p: { xs: 1, sm: 3 },
                borderRadius: 0,
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
            }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 2,
                    mb: 3,
                    p: 2,
                    bgcolor: '#f8fafc',
                    borderRadius: 3,
                    boxShadow: '0 2px 8px 0 #e0e7ef',
                    flexWrap: 'wrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}>
                    <TextField
                        label="Date"
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ bgcolor: 'white', borderRadius: 2, minWidth: 140, boxShadow: '0 1px 4px 0 #e0e7ef' }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 4px 0 #e0e7ef' }}>
                        <InputLabel>Ca trực</InputLabel>
                        <Select
                            value={selectedShift}
                            label="Ca trực"
                            onChange={e => setSelectedShift(e.target.value)}
                        >
                            {shiftLabels.map(label => (
                                <MenuItem key={label} value={label}>{label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 4px 0 #e0e7ef' }}>
                        <InputLabel>Lọc nhóm action</InputLabel>
                        <Select
                            value={actionGroupFilter}
                            label="Lọc nhóm action"
                            onChange={e => setActionGroupFilter(e.target.value)}
                        >
                            {actionGroupOptions.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 4px 0 #e0e7ef' }}>
                        <InputLabel>TS Member</InputLabel>
                        <Select
                            value={selectedTSMember}
                            label="TS Member"
                            onChange={e => setSelectedTSMember(e.target.value)}
                        >
                            <MenuItem value="all">All</MenuItem>
                            {tsMembers.map(m => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.fullName} {m.group ? `(${m.group})` : ''}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={handleResetData}
                        sx={{
                            height: 40,
                            fontWeight: 600,
                            color: '#1976d2',
                            borderColor: '#1976d2',
                            bgcolor: 'white',
                            borderRadius: 2,
                            boxShadow: '0 1px 4px 0 #e0e7ef',
                            ml: { xs: 0, sm: 1 },
                            mt: { xs: 1, sm: 0 },
                            '&:hover': {
                                bgcolor: '#e3f2fd',
                                borderColor: '#1976d2',
                            },
                        }}
                    >
                        Reset data
                    </Button>
                </Box>
                <Typography variant="body2" color="primary" mb={2}>
                    Ngày đã chọn: {selectedDate} | Ca trực: {selectedShift}
                </Typography>
                
                {/* Switch Mode Button */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    mb: 3, 
                    p: 2, 
                    bgcolor: '#f0f4f8', 
                    borderRadius: 3, 
                    boxShadow: '0 2px 8px 0 #e0e7ef' 
                }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                        Chế độ xem:
                    </Typography>
                    
                    <Button
                        variant={viewMode === 'action' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('action')}
                        sx={{
                            fontWeight: 600,
                            bgcolor: viewMode === 'action' ? '#1976d2' : 'white',
                            color: viewMode === 'action' ? 'white' : '#1976d2',
                            borderColor: '#1976d2',
                            '&:hover': {
                                bgcolor: viewMode === 'action' ? '#1565c0' : '#e3f2fd',
                            },
                        }}
                    >
                        📋 Action View
                    </Button>
                    
                    <Button
                        variant={viewMode === 'card' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('card')}
                        sx={{
                            fontWeight: 600,
                            bgcolor: viewMode === 'card' ? '#1976d2' : 'white',
                            color: viewMode === 'card' ? 'white' : '#1976d2',
                            borderColor: '#1976d2',
                            '&:hover': {
                                bgcolor: viewMode === 'card' ? '#1565c0' : '#e3f2fd',
                            },
                        }}
                    >
                        🃏 Card View
                    </Button>
                </Box>
                {/* Hiển thị actions theo member TS */}
                {viewMode === 'action' && (
                <Box>
                    {tsMembers.map(member => {
                        if (selectedTSMember !== 'all' && member.id !== selectedTSMember) return null;
                        let memberActions = actionsByMember[member.id] || [];
                        if (memberActions.length === 0) return null;
                        // Sort actions by date ascending
                        memberActions = [...memberActions].sort((a, b) => new Date(a.date) - new Date(b.date));
                        // Lọc theo actionGroupFilter
                        memberActions = memberActions.filter(action => {
                            if (actionGroupFilter === 'all') return true;
                            if (actionGroupFilter === 'complete') return action.type === 'updateCard' && action.data?.card?.dueComplete === true;
                            if (actionGroupFilter === 'moveToDone') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done') && !action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                            if (actionGroupFilter === 'moveToDoing') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing');
                            if (actionGroupFilter === 'moveToWaitingToFixFromDev') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)');
                            if (actionGroupFilter === 'moveToWaitingToFix') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix');
                            if (actionGroupFilter === 'moveToUpdateWorkflowOrWaitingAccess') return action.type === 'updateCard' && action.data?.listAfter?.name && (action.data.listAfter.name.toLowerCase().includes('update workflow required') || action.data.listAfter.name.toLowerCase().includes('waiting for access'));
                            if (actionGroupFilter === 'moveToFixDoneFromDev') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                            if (actionGroupFilter === 'leftCard') return action.type === 'removeMemberFromCard' && action.idMemberCreator === action.data?.idMember;
                            if (actionGroupFilter === 'commentCard') return action.type === 'commentCard';
                            if (actionGroupFilter === 'assigned') return action.type === 'addMemberToCard' && tsMembers.some(m => m.id === action.data?.idMember);
                            return true;
                        });
                        // Tổng hợp số lượng từng loại action đã tô màu
                        const coloredActionCounts = {
                            complete: new Set(memberActions.filter(a => a.type === 'updateCard' && a.data?.card?.dueComplete === true).map(a => a.data?.card?.id)).size,
                            moveToDone: memberActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('done') && !a.data.listAfter.name.toLowerCase().includes('fix done from dev')).length,
                            moveToDoing: memberActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('doing')).length,
                            moveToWaitingToFixFromDev: memberActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)')).length,
                            moveToWaitingToFix: memberActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('waiting to fix')).length,
                            moveToUpdateWorkflowOrWaitingAccess: memberActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && (a.data.listAfter.name.toLowerCase().includes('update workflow required') || a.data.listAfter.name.toLowerCase().includes('waiting for access'))).length,
                            leftCard: memberActions.filter(a => a.type === 'removeMemberFromCard' && a.idMemberCreator === a.data?.idMember).length,
                            commentCard: memberActions.filter(a => a.type === 'commentCard').length,
                            addTsToCard: memberActions.filter(a => a.type === 'addMemberToCard' && tsMembers.some(m => m.id === a.data?.idMember)).length,
                            moveToFixDoneFromDev: memberActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('fix done from dev')).length,
                        };
                        return (
                            <Paper key={member.id} sx={{ mb: 3, p: 2, borderRadius: 3, boxShadow: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 700 }}>
                                        👤 {member.fullName} ({memberActions.length} actions)
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {coloredActionCounts.complete > 0 && (
                                            <Chip 
                                                label={`Complete card: ${coloredActionCounts.complete}`} 
                                                color="success" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'complete' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'complete' ? 'all' : 'complete')}
                                            />
                                        )}
                                        {coloredActionCounts.moveToDone > 0 && (
                                            <Chip 
                                                label={`Move to Done: ${coloredActionCounts.moveToDone}`} 
                                                color="success" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'moveToDone' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'moveToDone' ? 'all' : 'moveToDone')}
                                            />
                                        )}
                                        {coloredActionCounts.moveToDoing > 0 && (
                                            <Chip 
                                                label={`Move to Doing: ${coloredActionCounts.moveToDoing}`} 
                                                color="warning" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'moveToDoing' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'moveToDoing' ? 'all' : 'moveToDoing')}
                                            />
                                        )}
                                        {coloredActionCounts.moveToWaitingToFixFromDev > 0 && (
                                            <Chip 
                                                label={`Move to Waiting to fix (from dev): ${coloredActionCounts.moveToWaitingToFixFromDev}`} 
                                                color="secondary" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'moveToWaitingToFixFromDev' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'moveToWaitingToFixFromDev' ? 'all' : 'moveToWaitingToFixFromDev')}
                                            />
                                        )}
                                        {coloredActionCounts.moveToWaitingToFix > 0 && (
                                            <Chip 
                                                label={`Move to Waiting to fix: ${coloredActionCounts.moveToWaitingToFix}`} 
                                                color="warning" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'moveToWaitingToFix' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'moveToWaitingToFix' ? 'all' : 'moveToWaitingToFix')}
                                            />
                                        )}
                                        {coloredActionCounts.moveToUpdateWorkflowOrWaitingAccess > 0 && (
                                            <Chip 
                                                label={`Move to Update workflow/Waiting for access: ${coloredActionCounts.moveToUpdateWorkflowOrWaitingAccess}`} 
                                                color="default" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'moveToUpdateWorkflowOrWaitingAccess' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'moveToUpdateWorkflowOrWaitingAccess' ? 'all' : 'moveToUpdateWorkflowOrWaitingAccess')}
                                            />
                                        )}
                                        {coloredActionCounts.leftCard > 0 && (
                                            <Chip 
                                                label={`Left card: ${coloredActionCounts.leftCard}`} 
                                                color="error" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'leftCard' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'leftCard' ? 'all' : 'leftCard')}
                                            />
                                        )}
                                        {coloredActionCounts.commentCard > 0 && (
                                            <Chip 
                                                label={`Comment card: ${coloredActionCounts.commentCard}`} 
                                                color="info" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'commentCard' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'commentCard' ? 'all' : 'commentCard')}
                                            />
                                        )}
                                        {coloredActionCounts.addTsToCard > 0 && (
                                            <Chip 
                                                label={`Assigned: ${coloredActionCounts.addTsToCard}`} 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13, 
                                                    bgcolor: '#e0f2f1', 
                                                    color: '#00897b', 
                                                    border: '1.5px solid #00897b',
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'assigned' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'assigned' ? 'all' : 'assigned')}
                                            />
                                        )}
                                        {coloredActionCounts.moveToFixDoneFromDev > 0 && (
                                            <Chip 
                                                label={`Move to Fix done from dev: ${coloredActionCounts.moveToFixDoneFromDev}`} 
                                                color="success" 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    opacity: actionGroupFilter === 'moveToFixDoneFromDev' ? 1 : 0.7,
                                                    '&:hover': { opacity: 1 }
                                                }}
                                                onClick={() => setActionGroupFilter(actionGroupFilter === 'moveToFixDoneFromDev' ? 'all' : 'moveToFixDoneFromDev')}
                                            />
                                        )}
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {memberActions.map(action => {
                                        // Determine if this is a 'mark due date complete' or 'move to done' action
                                        const isMarkDueComplete = action.type === 'updateCard' && action.data?.card?.dueComplete === true;
                                        const isMoveToDone = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done') && !action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                                        const isMoveToDoing = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing');
                                        const isMoveToWaitingToFixFromDev = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)');
                                        const isMoveToWaitingToFix = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix');
                                        const isSelfLeftCard = action.type === 'removeMemberFromCard' && action.idMemberCreator === action.data?.idMember;
                                        const isMoveToUpdateWorkflowOrWaitingAccess = action.type === 'updateCard' && action.data?.listAfter?.name && (
                                            action.data.listAfter.name.toLowerCase().includes('update workflow required') ||
                                            action.data.listAfter.name.toLowerCase().includes('waiting for access')
                                        );
                                        const isMoveToFixDoneFromDev = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                                        // Nếu là assigned (addMemberToCard và member được add là TS)
                                        const isAssigned = action.type === 'addMemberToCard' && tsMembers.some(m => m.id === action.data?.idMember);
                                        const isCommentCard = action.type === 'commentCard';
                                        let bg = '#f8fafc';
                                        let border = 'none';
                                        let textColor = '#333';
                                        if (isMarkDueComplete) {
                                            bg = 'rgba(34,197,94,0.13)'; // green background
                                            border = '2px solid #43a047'; // green border
                                        } else if (isMoveToDone) {
                                            bg = 'rgba(34,197,94,0.13)'; // green background
                                            border = '2px solid #43a047'; // green border
                                        } else if (isMoveToFixDoneFromDev) {
                                            bg = 'rgba(76,175,80,0.13)'; // darker green background
                                            border = '2px solid #2e7d32'; // darker green border
                                        } else if (isMoveToDoing) {
                                            bg = 'rgba(255,193,7,0.13)'; // yellow background
                                            border = '2px solid #ffb300'; // yellow border
                                        } else if (isMoveToWaitingToFixFromDev) {
                                            bg = 'rgba(156,39,176,0.13)'; // purple background
                                            border = '2px solid #9c27b0'; // purple border
                                        } else if (isMoveToWaitingToFix) {
                                            bg = 'rgba(255,152,0,0.13)'; // orange background
                                            border = '2px solid #ff9800'; // orange border
                                        } else if (isSelfLeftCard) {
                                            bg = 'rgba(239,68,68,0.13)'; // red background
                                            border = '2px solid #ef4444'; // red border
                                        } else if (isMoveToUpdateWorkflowOrWaitingAccess) {
                                            bg = 'rgba(121,85,72,0.13)'; // brown background
                                            border = '2px solid #795548'; // brown border
                                        } else if (isAssigned) {
                                            bg = '#e0f2f1';
                                            border = '2px solid #00897b';
                                            textColor = '#00897b';
                                        } else if (isCommentCard) {
                                            bg = '#e3f2fd';
                                            border = '2px solid #1976d2';
                                            textColor = '#1976d2';
                                        }
                                        let label = action.type;
                                        let chipColor = 'primary';
                                        if (isMarkDueComplete) {
                                            label = 'Complete card';
                                            chipColor = 'success';
                                        } else if (isMoveToDone) {
                                            label = 'Move to Done';
                                            chipColor = 'success';
                                        } else if (isMoveToFixDoneFromDev) {
                                            label = 'Move to Fix done from dev';
                                            chipColor = 'success';
                                        } else if (isMoveToDoing) {
                                            label = 'Move to Doing';
                                            chipColor = 'warning';
                                        } else if (isMoveToWaitingToFixFromDev) {
                                            label = 'Move to Waiting to fix (from dev)';
                                            chipColor = 'secondary';
                                        } else if (isMoveToWaitingToFix) {
                                            label = 'Move to Waiting to fix';
                                            chipColor = 'warning';
                                        } else if (isSelfLeftCard) {
                                            label = 'Left card';
                                            chipColor = 'error';
                                        } else if (isMoveToUpdateWorkflowOrWaitingAccess) {
                                            label = 'Move to Update workflow/Waiting for access';
                                            chipColor = 'default';
                                        } else if (action.type === 'addMemberToCard' && tsMembers.some(m => m.id === action.data?.idMember)) {
                                            label = 'Assigned';
                                            chipColor = undefined;
                                        }
                                        const formattedTime = dayjs(action.date).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY');
                                        let extraInfo = null;
                                        if (action.type === 'addMemberToCard') {
                                            // Tìm tên người được thêm
                                            let addedMemberName = '';
                                            let adderName = '';
                                            const addedMember = members.find(m => m.id === action.data?.idMember);
                                            const adder = members.find(m => m.id === action.idMemberCreator);
                                            addedMemberName = addedMember ? addedMember.fullName : (action.data?.idMember || 'Unknown');
                                            adderName = adder ? adder.fullName : (action.idMemberCreator || 'Unknown');
                                            extraInfo = (
                                                <Box sx={{ fontSize: 13, color: '#1565c0', fontWeight: 600, mt: 0.5 }}>
                                                    Added <b>{addedMemberName}</b> by <b>{adderName}</b>
                                                </Box>
                                            );
                                        } else if (action.type === 'removeMemberFromCard') {
                                            let removedMemberName = '';
                                            let removerName = '';
                                            const removedMember = members.find(m => m.id === action.data?.idMember);
                                            const remover = members.find(m => m.id === action.idMemberCreator);
                                            removedMemberName = removedMember ? removedMember.fullName : (action.data?.idMember || 'Unknown');
                                            removerName = remover ? remover.fullName : (action.idMemberCreator || 'Unknown');
                                            extraInfo = (
                                                <Box sx={{ fontSize: 13, color: '#d32f2f', fontWeight: 600, mt: 0.5 }}>
                                                    Removed <b>{removedMemberName}</b> by <b>{removerName}</b>
                                                </Box>
                                            );
                                        }
                                        return (
                                            <Box
                                                key={action.id}
                                                sx={{
                                                    fontSize: 15,
                                                    color: textColor,
                                                    background: bg,
                                                    borderRadius: 2,
                                                    p: 1,
                                                    mb: 0.5,
                                                    cursor: action.data?.card?.id ? 'pointer' : 'default',
                                                    transition: 'background 0.2s, box-shadow 0.2s',
                                                    border: border,
                                                    position: 'relative',
                                                    '&:hover': action.data?.card?.id && !isAssigned ? {
                                                        background: '#e3e8ee',
                                                        boxShadow: '0 2px 12px 0 #b6c2d9',
                                                    } : {},
                                                }}
                                                onClick={e => {
                                                    // Only open modal if not clicking expand button
                                                    if (e.target.closest('.expand-action-btn')) return;
                                                    if (action.data?.card?.id) {
                                                        setSelectedCardId(action.data.card.id);
                                                        setIsCardDetailModalOpen(true);
                                                    }
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box>
                                                        <Box sx={{ color: '#d32f2f', fontWeight: 700, fontSize: 14, mb: 0.5 }}>{formattedTime}</Box>
                                                        {label === 'Assigned' ? (
                                                            <Chip label={label} size="small" sx={{ fontWeight: 700, fontSize: 13, mr: 1, bgcolor: '#e0f2f1', color: '#00897b', border: '1.5px solid #00897b' }} />
                                                        ) : label === 'commentCard' ? (
                                                            <Chip label={label} size="small" sx={{ fontWeight: 700, fontSize: 13, mr: 1, bgcolor: '#e3f2fd', color: '#1976d2', border: '1.5px solid #1976d2' }} />
                                                        ) : (
                                                            <Chip label={label} color={chipColor} size="small" sx={{ fontWeight: 700, fontSize: 13, mr: 1 }} />
                                                        )}
                                                        {action.data?.card?.name && <span style={{ color: '#1976d2', fontWeight: 500 }}>{action.data.card.name}</span>}
                                                        {extraInfo}
                                                    </Box>
                                                    <IconButton
                                                        className="expand-action-btn"
                                                        size="small"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setExpandedActionId(expandedActionId === action.id ? null : action.id);
                                                        }}
                                                    >
                                                        {expandedActionId === action.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    </IconButton>
                                                </Box>
                                                <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}></span>
                                                {action.data?.listBefore?.name || action.data?.listAfter?.name ? (
                                                    <>
                                                        <br />
                                                        <span style={{ color: '#789262', fontSize: 13 }}>
                                                            {action.data?.listBefore?.name ? `Từ: ${action.data.listBefore.name}` : ''}
                                                            {action.data?.listAfter?.name ? ` → ${action.data.listAfter.name}` : ''}
                                                        </span>
                                                    </>
                                                ) : null}
                                                {action.data?.text && (
                                                    <>
                                                        <br />
                                                        <span style={{ color: '#7e57c2', fontStyle: 'italic', fontSize: 13 }}>{action.data.text}</span>
                                                    </>
                                                )}
                                                <Collapse in={expandedActionId === action.id} timeout="auto" unmountOnExit>
                                                    <Box sx={{ mt: 1, bgcolor: '#f3f4f6', borderRadius: 2, p: 1, fontSize: 13, overflowX: 'auto' }}>
                                                        <pre style={{ margin: 0, fontSize: 12, color: '#222', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(action, null, 2)}</pre>
                                                    </Box>
                                                </Collapse>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
                )}
                
                {viewMode === 'card' && (
                    <Box>
                        <Typography variant="h5" sx={{ mb: 3, color: '#1976d2', fontWeight: 700 }}>
                            🃏 Card View - {selectedDate} - {selectedShift}
                        </Typography>
                        
                        {/* Card View */}
                        <Box>
                            {Object.values(actionsByCard).map(cardData => {
                                let cardActions = cardData.actions;
                                if (cardActions.length === 0) return null;
                                
                                // Sort actions by date ascending
                                cardActions = [...cardActions].sort((a, b) => new Date(a.date) - new Date(b.date));
                                
                                // Lọc theo actionGroupFilter
                                cardActions = cardActions.filter(action => {
                                    if (actionGroupFilter === 'all') return true;
                                    if (actionGroupFilter === 'complete') return action.type === 'updateCard' && action.data?.card?.dueComplete === true;
                                    if (actionGroupFilter === 'moveToDone') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done') && !action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                                    if (actionGroupFilter === 'moveToDoing') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing');
                                    if (actionGroupFilter === 'moveToWaitingToFixFromDev') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)');
                                    if (actionGroupFilter === 'moveToWaitingToFix') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix');
                                    if (actionGroupFilter === 'moveToUpdateWorkflowOrWaitingAccess') return action.type === 'updateCard' && action.data?.listAfter?.name && (action.data.listAfter.name.toLowerCase().includes('update workflow required') || action.data.listAfter.name.toLowerCase().includes('waiting for access'));
                                    if (actionGroupFilter === 'moveToFixDoneFromDev') return action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                                    if (actionGroupFilter === 'leftCard') return action.type === 'removeMemberFromCard' && action.idMemberCreator === action.data?.idMember;
                                    if (actionGroupFilter === 'commentCard') return action.type === 'commentCard';
                                    if (actionGroupFilter === 'assigned') return action.type === 'addMemberToCard' && tsMembers.some(m => m.id === action.data?.idMember);
                                    return true;
                                });

                                if (cardActions.length === 0) return null;

                                // Tổng hợp số lượng từng loại action cho card
                                const cardActionCounts = {
                                    complete: new Set(cardActions.filter(a => a.type === 'updateCard' && a.data?.card?.dueComplete === true).map(a => a.data?.card?.id)).size,
                                    moveToDone: cardActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('done') && !a.data.listAfter.name.toLowerCase().includes('fix done from dev')).length,
                                    moveToDoing: cardActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('doing')).length,
                                    moveToWaitingToFixFromDev: cardActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)')).length,
                                    moveToWaitingToFix: cardActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('waiting to fix')).length,
                                    moveToUpdateWorkflowOrWaitingAccess: cardActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && (a.data.listAfter.name.toLowerCase().includes('update workflow required') || a.data.listAfter.name.toLowerCase().includes('waiting for access'))).length,
                                    leftCard: cardActions.filter(a => a.type === 'removeMemberFromCard' && a.idMemberCreator === a.data?.idMember).length,
                                    commentCard: cardActions.filter(a => a.type === 'commentCard').length,
                                    addTsToCard: cardActions.filter(a => a.type === 'addMemberToCard' && tsMembers.some(m => m.id === a.data?.idMember)).length,
                                    moveToFixDoneFromDev: cardActions.filter(a => a.type === 'updateCard' && a.data?.listAfter?.name && a.data.listAfter.name.toLowerCase().includes('fix done from dev')).length,
                                };

                                // Highlight if card has completeCard action
                                const hasCompleteCard = cardData.actions.some(a => a.type === 'updateCard' && a.data?.card?.dueComplete === true);
                                const isExpanded = expandedCards.has(cardData.cardId);

                                return (
                                    <Paper key={cardData.cardId} sx={{ mb: 3, borderRadius: 3, boxShadow: 1, overflow: 'hidden',
                                        bgcolor: hasCompleteCard ? 'rgba(34,197,94,0.13)' : 'white',
                                        border: hasCompleteCard ? '2px solid #43a047' : undefined
                                    }}>
                                        {/* Card Header - Clickable to expand/collapse */}
                                        <Box 
                                            sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between', 
                                                p: 2,
                                                cursor: 'pointer',
                                                bgcolor: '#f8fafc',
                                                borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
                                                transition: 'background-color 0.2s',
                                                '&:hover': { 
                                                    bgcolor: '#e3f2fd' 
                                                }
                                            }}
                                            onClick={() => {
                                                const newExpanded = new Set(expandedCards);
                                                if (isExpanded) {
                                                    newExpanded.delete(cardData.cardId);
                                                } else {
                                                    newExpanded.add(cardData.cardId);
                                                }
                                                setExpandedCards(newExpanded);
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <IconButton size="small" sx={{ color: '#1976d2' }}>
                                                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                                <Box>
                                                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 700 }}>
                                                        🃏 {cardData.cardName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#666', fontSize: 12 }}>
                                                        Latest action: {dayjs(cardActions[cardActions.length - 1]?.date).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}
                                                    </Typography>
                                                </Box>
                                                <Chip 
                                                    label={`${cardActions.length} actions`} 
                                                    size="small" 
                                                    color="primary" 
                                                    variant="outlined"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </Box>
                                            
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                {cardActionCounts.complete > 0 && (
                                                    <Chip 
                                                        label={`Complete: ${cardActionCounts.complete}`} 
                                                        color="success" 
                                                        size="small" 
                                                        sx={{ fontWeight: 700, fontSize: 12 }}
                                                    />
                                                )}
                                                {cardActionCounts.moveToDone > 0 && (
                                                    <Chip 
                                                        label={`Done: ${cardActionCounts.moveToDone}`} 
                                                        color="success" 
                                                        size="small" 
                                                        sx={{ fontWeight: 700, fontSize: 12 }}
                                                    />
                                                )}
                                                {cardActionCounts.moveToDoing > 0 && (
                                                    <Chip 
                                                        label={`Doing: ${cardActionCounts.moveToDoing}`} 
                                                        color="warning" 
                                                        size="small" 
                                                        sx={{ fontWeight: 700, fontSize: 12 }}
                                                    />
                                                )}
                                                {cardActionCounts.addTsToCard > 0 && (
                                                    <Chip 
                                                        label={`Assigned: ${cardActionCounts.addTsToCard}`} 
                                                        size="small" 
                                                        sx={{ fontWeight: 700, fontSize: 12, bgcolor: '#e0f2f1', color: '#00897b', border: '1.5px solid #00897b' }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        
                                        {/* Collapsible Actions Content */}
                                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                            <Box sx={{ p: 2, bgcolor: 'white' }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2, color: '#666', fontWeight: 600 }}>
                                                    📋 Actions Timeline:
                                                </Typography>
                                                
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {cardActions.map(action => {
                                                        // Determine action types and styling (same logic as Action View)
                                                        const isMarkDueComplete = action.type === 'updateCard' && action.data?.card?.dueComplete === true;
                                                        const isMoveToDone = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('done') && !action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                                                        const isMoveToDoing = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('doing');
                                                        const isMoveToWaitingToFixFromDev = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix (from dev)');
                                                        const isMoveToWaitingToFix = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('waiting to fix');
                                                        const isSelfLeftCard = action.type === 'removeMemberFromCard' && action.idMemberCreator === action.data?.idMember;
                                                        const isMoveToUpdateWorkflowOrWaitingAccess = action.type === 'updateCard' && action.data?.listAfter?.name && (
                                                            action.data.listAfter.name.toLowerCase().includes('update workflow required') ||
                                                            action.data.listAfter.name.toLowerCase().includes('waiting for access')
                                                        );
                                                        const isMoveToFixDoneFromDev = action.type === 'updateCard' && action.data?.listAfter?.name && action.data.listAfter.name.toLowerCase().includes('fix done from dev');
                                                        const isAssigned = action.type === 'addMemberToCard' && tsMembers.some(m => m.id === action.data?.idMember);
                                                        const isCommentCard = action.type === 'commentCard';
                                                        
                                                        let bg = '#f8fafc';
                                                        let border = 'none';
                                                        let textColor = '#333';
                                                        if (isMarkDueComplete) {
                                                            bg = 'rgba(34,197,94,0.13)';
                                                            border = '2px solid #43a047';
                                                        } else if (isMoveToDone) {
                                                            bg = 'rgba(34,197,94,0.13)';
                                                            border = '2px solid #43a047';
                                                        } else if (isMoveToFixDoneFromDev) {
                                                            bg = 'rgba(76,175,80,0.13)';
                                                            border = '2px solid #2e7d32';
                                                        } else if (isMoveToDoing) {
                                                            bg = 'rgba(255,193,7,0.13)';
                                                            border = '2px solid #ffb300';
                                                        } else if (isMoveToWaitingToFixFromDev) {
                                                            bg = 'rgba(156,39,176,0.13)';
                                                            border = '2px solid #9c27b0';
                                                        } else if (isMoveToWaitingToFix) {
                                                            bg = 'rgba(255,152,0,0.13)';
                                                            border = '2px solid #ff9800';
                                                        } else if (isSelfLeftCard) {
                                                            bg = 'rgba(239,68,68,0.13)';
                                                            border = '2px solid #ef4444';
                                                        } else if (isMoveToUpdateWorkflowOrWaitingAccess) {
                                                            bg = 'rgba(121,85,72,0.13)';
                                                            border = '2px solid #795548';
                                                        } else if (isAssigned) {
                                                            bg = '#e0f2f1';
                                                            border = '2px solid #00897b';
                                                            textColor = '#00897b';
                                                        } else if (isCommentCard) {
                                                            bg = '#e3f2fd';
                                                            border = '2px solid #1976d2';
                                                            textColor = '#1976d2';
                                                        }
                                                        
                                                        let label = action.type;
                                                        let chipColor = 'primary';
                                                        if (isMarkDueComplete) {
                                                            label = 'Complete card';
                                                            chipColor = 'success';
                                                        } else if (isMoveToDone) {
                                                            label = 'Move to Done';
                                                            chipColor = 'success';
                                                        } else if (isMoveToFixDoneFromDev) {
                                                            label = 'Move to Fix done from dev';
                                                            chipColor = 'success';
                                                        } else if (isMoveToDoing) {
                                                            label = 'Move to Doing';
                                                            chipColor = 'warning';
                                                        } else if (isMoveToWaitingToFixFromDev) {
                                                            label = 'Move to Waiting to fix (from dev)';
                                                            chipColor = 'secondary';
                                                        } else if (isMoveToWaitingToFix) {
                                                            label = 'Move to Waiting to fix';
                                                            chipColor = 'warning';
                                                        } else if (isSelfLeftCard) {
                                                            label = 'Left card';
                                                            chipColor = 'error';
                                                        } else if (isMoveToUpdateWorkflowOrWaitingAccess) {
                                                            label = 'Move to Update workflow/Waiting for access';
                                                            chipColor = 'default';
                                                        } else if (action.type === 'addMemberToCard' && tsMembers.some(m => m.id === action.data?.idMember)) {
                                                            label = 'Assigned';
                                                            chipColor = undefined;
                                                        }
                                                        
                                                        const formattedTime = dayjs(action.date).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY');
                                                        const member = members.find(m => m.id === action.idMemberCreator);
                                                        const memberName = member ? member.fullName : 'Unknown';
                                                        
                                                        let extraInfo = null;
                                                        if (action.type === 'addMemberToCard') {
                                                            let addedMemberName = '';
                                                            let adderName = '';
                                                            const addedMember = members.find(m => m.id === action.data?.idMember);
                                                            const adder = members.find(m => m.id === action.idMemberCreator);
                                                            addedMemberName = addedMember ? addedMember.fullName : (action.data?.idMember || 'Unknown');
                                                            adderName = adder ? adder.fullName : (action.idMemberCreator || 'Unknown');
                                                            extraInfo = (
                                                                <Box sx={{ fontSize: 13, color: '#1565c0', fontWeight: 600, mt: 0.5 }}>
                                                                    Added <b>{addedMemberName}</b> by <b>{adderName}</b>
                                                                </Box>
                                                            );
                                                        } else if (action.type === 'removeMemberFromCard') {
                                                            let removedMemberName = '';
                                                            let removerName = '';
                                                            const removedMember = members.find(m => m.id === action.data?.idMember);
                                                            const remover = members.find(m => m.id === action.idMemberCreator);
                                                            removedMemberName = removedMember ? removedMember.fullName : (action.data?.idMember || 'Unknown');
                                                            removerName = remover ? remover.fullName : (action.idMemberCreator || 'Unknown');
                                                            extraInfo = (
                                                                <Box sx={{ fontSize: 13, color: '#d32f2f', fontWeight: 600, mt: 0.5 }}>
                                                                    Removed <b>{removedMemberName}</b> by <b>{removerName}</b>
                                                                </Box>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <Box
                                                                key={action.id}
                                                                sx={{
                                                                    fontSize: 15,
                                                                    color: textColor,
                                                                    background: bg,
                                                                    borderRadius: 2,
                                                                    p: 1,
                                                                    mb: 0.5,
                                                                    cursor: action.data?.card?.id ? 'pointer' : 'default',
                                                                    transition: 'background 0.2s, box-shadow 0.2s',
                                                                    border: border,
                                                                    position: 'relative',
                                                                    '&:hover': action.data?.card?.id && !isAssigned ? {
                                                                        background: '#e3e8ee',
                                                                        boxShadow: '0 2px 12px 0 #b6c2d9',
                                                                    } : {},
                                                                }}
                                                                onClick={e => {
                                                                    if (e.target.closest('.expand-action-btn')) return;
                                                                    if (action.data?.card?.id) {
                                                                        setSelectedCardId(action.data.card.id);
                                                                        setIsCardDetailModalOpen(true);
                                                                    }
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <Box>
                                                                        <Box sx={{ color: '#d32f2f', fontWeight: 700, fontSize: 14, mb: 0.5 }}>{formattedTime}</Box>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                            {label === 'Assigned' ? (
                                                                                <Chip label={label} size="small" sx={{ fontWeight: 700, fontSize: 12, bgcolor: '#e0f2f1', color: '#00897b', border: '1.5px solid #00897b' }} />
                                                                            ) : label === 'commentCard' ? (
                                                                                <Chip label={label} size="small" sx={{ fontWeight: 700, fontSize: 12, bgcolor: '#e3f2fd', color: '#1976d2', border: '1.5px solid #1976d2' }} />
                                                                            ) : (
                                                                                <Chip label={label} color={chipColor} size="small" sx={{ fontWeight: 700, fontSize: 12 }} />
                                                                            )}
                                                                            <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600, fontSize: 13 }}>
                                                                                👤 {memberName}
                                                                            </Typography>
                                                                        </Box>
                                                                        {extraInfo}
                                                                    </Box>
                                                                    <IconButton
                                                                        className="expand-action-btn"
                                                                        size="small"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setExpandedActionId(expandedActionId === action.id ? null : action.id);
                                                                        }}
                                                                    >
                                                                        {expandedActionId === action.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                    </IconButton>
                                                                </Box>
                                                                
                                                                {action.data?.listBefore?.name || action.data?.listAfter?.name ? (
                                                                    <Box sx={{ mt: 1 }}>
                                                                        <Typography variant="body2" sx={{ color: '#789262', fontSize: 13 }}>
                                                                            {action.data?.listBefore?.name ? `Từ: ${action.data.listBefore.name}` : ''}
                                                                            {action.data?.listAfter?.name ? ` → ${action.data.listAfter.name}` : ''}
                                                                        </Typography>
                                                                    </Box>
                                                                ) : null}
                                                                
                                                                {action.data?.text && (
                                                                    <Box sx={{ mt: 1 }}>
                                                                        <Typography variant="body2" sx={{ color: '#7e57c2', fontStyle: 'italic', fontSize: 13 }}>
                                                                            💬 {action.data.text}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                
                                                                <Collapse in={expandedActionId === action.id} timeout="auto" unmountOnExit>
                                                                    <Box sx={{ mt: 1, bgcolor: '#f3f4f6', borderRadius: 2, p: 1, fontSize: 13, overflowX: 'auto' }}>
                                                                        <pre style={{ margin: 0, fontSize: 12, color: '#222', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(action, null, 2)}</pre>
                                                                    </Box>
                                                                </Collapse>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            </Box>
                                        </Collapse>
                                    </Paper>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Paper>
            <CardDetailModal
                open={isCardDetailModalOpen}
                onClose={() => setIsCardDetailModalOpen(false)}
                cardId={selectedCardId}
            />
            {/* Scroll to top button */}
            <Zoom in={showScroll}>
                <Fab
                    color="primary"
                    size="medium"
                    onClick={handleScrollTop}
                    sx={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                        zIndex: 1200,
                        bgcolor: '#1976d2',
                        color: 'white',
                        boxShadow: '0 4px 20px 0 #1976d2a0',
                        '&:hover': { bgcolor: '#1565c0' },
                    }}
                >
                    <ArrowUpwardIcon />
                </Fab>
            </Zoom>
        </Box>
    );
};

export default ActionsDetail;