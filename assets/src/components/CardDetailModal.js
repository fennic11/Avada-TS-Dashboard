import React, { useEffect, useState } from 'react';
import {
    Modal, Box, Typography, CircularProgress, Chip,
    Link, Stack, IconButton,
    MenuItem, Select, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Button, Paper,
    TextField, List, ListItem, ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
    getActionsByCard,
    removeMemberByID,
    addMemberByID,
    moveCardToList,
    removeLabelByID,
    addLabelByID,
    addCommentToCard
} from '../api/trelloApi';
import members from '../data/members.json';
import lists from '../data/listsId.json';
import labels from '../data/labels.json';
import CardActivityHistory from './CardActivityHistory';
import TimeToDoneBox from "./TimeToDoneBox";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from '../firebase/firebase';
import { calculateResolutionTime } from '../utils/resolutionTime';
import { searchArticles } from '../api/notionApi';





const extractLinksFromDescription = (desc) => {
    if (!desc) return { shopUrl: '', crispUrl: '' };

    const shopMatch = desc.match(/Shop URL:\s*(https?:\/\/[^\s]+)/i);
    const crispMatch = desc.match(/Crisp chat URL:\s*(https?:\/\/[^\s]+)/i);

    return {
        shopUrl: shopMatch?.[1] || '',
        crispUrl: crispMatch?.[1] || ''
    };
};

const CardDetailModal = ({ open, onClose, card }) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState([]);
    const [newAgentId, setNewAgentId] = useState('');
    const [newLabelId, setNewLabelId] = useState('');
    const [currentListId, setCurrentListId] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [notionQuery, setNotionQuery] = useState('');
    const [notionResults, setNotionResults] = useState([]);
    const [notionLoading, setNotionLoading] = useState(false);

    const NOTION_DATABASE_ID = process.env.REACT_APP_NOTION_DATABASE_ID;

    useEffect(() => {
        if (open && card) {
            const fetchActions = async () => {
                setLoading(true);
                try {
                    const result = await getActionsByCard(card.id);
                    const timingData = calculateResolutionTime(result);
                    card.resolutionTime = timingData?.resolutionTime;
                    card.TSResolutionTime = timingData?.TSResolutionTime;
                    card.firstActionTime = timingData?.firstActionTime;
                    console.log('Timing Data:', timingData);
                    setActions(result);
                } catch (err) {
                    console.error('Error fetching actions:', err);
                } finally {
                    setLoading(false);
                }
            };

            fetchActions();
            const assigned = members.filter(m => card.idMembers.includes(m.id));
            setAgents(assigned);
            setCurrentListId(card.idList);
        }
    }, [open, card]);

    const availableAgents = members.filter(m => !agents.some(a => a.id === m.id));
    const availableLabels = card?.labels
        ? labels.filter(l => !card.labels.some(ex => ex.id === l.id))
        : [];

    const handleRemoveMember = (memberId) => {
        const member = agents.find(a => a.id === memberId);
        setConfirmAction({
            message: `Xoá agent "${member.name}" khỏi card?`,
            onConfirm: async () => {
                await removeMemberByID(card.id, memberId);
                setAgents(prev => prev.filter(a => a.id !== memberId));
            }
        });
        setConfirmOpen(true);
    };

    const handleAddMember = () => {
        const member = members.find(m => m.id === newAgentId);
        setConfirmAction({
            message: `Thêm agent "${member.name}" vào card?`,
            onConfirm: async () => {
                await addMemberByID(card.id, newAgentId);
                setAgents(prev => [...prev, member]);
                setNewAgentId('');
            }
        });
        setConfirmOpen(true);
    };

    const handleReviewed = async () => {
        if (!actions || actions.length === 0 || !card.resolutionTime) return;

        const firstAction = actions[actions.length - 1];
        const createdAt = new Date(firstAction.date);

        const labelNames = card.labels?.map(l => l.name).join(', ') || 'No label';

        const dataToSave = {
            cardId: card.id,
            cardName: card.name,
            label: labelNames,
            resolutionTime: card.resolutionTime,
            TSResolutionTime: card.TSResolutionTime,
            firstActionTime: card.firstActionTime,
            createdAt
        };

        console.log("📝 Saving to Firebase:", dataToSave);

        try {
            const q = query(collection(db, "resolutionTimes"), where("cardId", "==", card.id));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return;
            }

            await addDoc(collection(db, "resolutionTimes"), dataToSave);
        } catch (err) {
            console.error("❌ Firebase save error:", err);
        }
    };



    const handleRemoveLabel = (label) => {
        setConfirmAction({
            message: `Xoá label "${label.name}" khỏi card?`,
            onConfirm: async () => {
                await removeLabelByID(card.id, label.id);
                card.labels = card.labels.filter(l => l.id !== label.id);
            }
        });
        setConfirmOpen(true);
    };

    const handleAddLabel = async () => {
        try {
            const label = labels.find(l => l.id === newLabelId);
            await addLabelByID(card.id, newLabelId);
            card.labels.push(label); // Cập nhật UI
            setNewLabelId('');
        } catch (err) {
            console.error('Failed to add label:', err);
        }
    };

    const handleMoveList = (newListId) => {
        const newList = lists.find(l => l.id === newListId);
        setConfirmAction({
            message: `Chuyển card sang list "${newList.name}"?`,
            onConfirm: async () => {
                await moveCardToList(card.id, newListId);
                setCurrentListId(newListId);
            }
        });
        setConfirmOpen(true);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        setCommentLoading(true);
        try {
            await addCommentToCard(card.id, newComment.trim());
            setNewComment('');

            // Load lại actions để hiển thị comment mới
            const updatedActions = await getActionsByCard(card.id);
            setActions(updatedActions);
        } catch (err) {
            console.error('Failed to add comment:', err);
        } finally {
            setCommentLoading(false);
        }
    };

    const handleNotionSearch = async () => {
        if (!notionQuery.trim()) return;

        setNotionLoading(true);
        try {
            const { articles, hasMore } = await searchArticles(notionQuery);
            setNotionResults(articles);
            console.log('Search results:', articles);
        } catch (error) {
            console.error('Error searching articles:', error);
        } finally {
            setNotionLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (confirmAction?.onConfirm) {
            await confirmAction.onConfirm();
        }
        setConfirmOpen(false);
        setConfirmAction(null);
    };

    if (!card) return null;

    const { shopUrl, crispUrl } = extractLinksFromDescription(card.desc);


    return (
        <>
            <Modal 
                open={open} 
                onClose={onClose}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiBackdrop-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    }
                }}
            >
                <Paper 
                    elevation={24}
                    sx={{
                        width: '90%',
                        maxWidth: 800,
                        maxHeight: '90vh',
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        overflowY: 'auto',
                        position: 'relative'
                    }}
                >
                    {/* Header Section */}
                    <Box sx={{ 
                        p: 4, 
                        borderBottom: '1px solid #e0e0e0',
                        backgroundColor: '#f8f9fa',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24
                    }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a237e' }}>
                                {card.name}
                            </Typography>
                            <IconButton onClick={onClose} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                        
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TimeToDoneBox 
                                diffMinutes={card.resolutionTime} 
                                title="Total Resolution Time"
                            />
                            <TimeToDoneBox 
                                diffMinutes={card.TSResolutionTime} 
                                title="TS Resolution Time"
                            />
                            <TimeToDoneBox 
                                diffMinutes={card.firstActionTime} 
                                title="First Action Time"
                            />
                            {card?.shortUrl && (
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    href={card.shortUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    startIcon={<span>🔗</span>}
                                >
                                    Go to Trello
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handleReviewed}
                                disabled={!card.resolutionTime}
                                startIcon={<span>✅</span>}
                            >
                                Reviewed
                            </Button>
                        </Box>
                    </Box>

                    {/* Main Content */}
                    <Box sx={{ p: 4 }}>
                        {/* Description Section */}
                        <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" component="div" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>📝</span> Description
                            </Typography>
                            <Box sx={{
                                p: 2,
                                backgroundColor: 'white',
                                borderRadius: 2,
                                fontSize: '0.95rem',
                                whiteSpace: 'pre-line',
                                border: '1px solid #e0e0e0',
                                minHeight: '100px'
                            }}>
                                {card.desc?.trim() ? card.desc : 'Không có mô tả'}
                            </Box>

                            {(shopUrl || crispUrl) && (
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    {shopUrl && (
                                        <Typography variant="body1" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <span>🛒</span> <strong>Shop URL:</strong>&nbsp;
                                            <Link href={shopUrl} target="_blank" underline="hover" sx={{ color: '#1976d2' }}>
                                                {shopUrl}
                                            </Link>
                                        </Typography>
                                    )}
                                    {crispUrl && (
                                        <Typography variant="body1" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <span>💬</span> <strong>Crisp Chat:</strong>&nbsp;
                                            <Link href={crispUrl} target="_blank" underline="hover" sx={{ color: '#1976d2' }}>
                                                {crispUrl}
                                            </Link>
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Paper>

                        {/* Agents Section */}
                        <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>👤</span> Agent(s)
                            </Typography>
                            <Stack spacing={2}>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    {agents.length > 0 ? (
                                        agents.map(agent => (
                                            <Chip
                                                key={agent.id}
                                                label={agent.name}
                                                onDelete={() => handleRemoveMember(agent.id)}
                                                deleteIcon={<CloseIcon />}
                                                color="primary"
                                                sx={{ 
                                                    '& .MuiChip-deleteIcon': { 
                                                        color: 'error.main',
                                                        '&:hover': { color: 'error.dark' }
                                                    }
                                                }}
                                            />
                                        ))
                                    ) : (
                                        <Chip label="Không có Agent" variant="outlined" />
                                    )}
                                </Stack>

                                {availableAgents.length > 0 && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Select
                                            size="small"
                                            value={newAgentId}
                                            onChange={(e) => setNewAgentId(e.target.value)}
                                            displayEmpty
                                            sx={{ 
                                                minWidth: 220,
                                                bgcolor: 'white',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#e0e0e0'
                                                }
                                            }}
                                        >
                                            <MenuItem value="">➕ Chọn thành viên</MenuItem>
                                            {availableAgents.map(agent => (
                                                <MenuItem key={agent.id} value={agent.id}>{agent.name}</MenuItem>
                                            ))}
                                        </Select>
                                        <IconButton 
                                            onClick={handleAddMember} 
                                            color="primary" 
                                            disabled={!newAgentId}
                                            sx={{ 
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    </Stack>
                                )}
                            </Stack>
                        </Paper>

                        {/* Labels Section */}
                        <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>🏷️</span> Labels
                            </Typography>
                            <Stack spacing={2}>
                                {card?.labels?.length > 0 && (
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        {card.labels.map((label) => (
                                            <Chip
                                                key={label.id}
                                                label={label.name}
                                                onDelete={() => handleRemoveLabel(label)}
                                                sx={{ 
                                                    backgroundColor: "#0079BF", 
                                                    color: '#fff',
                                                    '& .MuiChip-deleteIcon': { 
                                                        color: '#fff',
                                                        '&:hover': { color: '#ffebee' }
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}

                                {availableLabels.length > 0 && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Select
                                            size="small"
                                            value={newLabelId}
                                            onChange={(e) => setNewLabelId(e.target.value)}
                                            displayEmpty
                                            sx={{ 
                                                minWidth: 220,
                                                bgcolor: 'white',
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#e0e0e0'
                                                }
                                            }}
                                        >
                                            <MenuItem value="">➕ Chọn label</MenuItem>
                                            {availableLabels.map(label => (
                                                <MenuItem key={label.id} value={label.id}>{label.name}</MenuItem>
                                            ))}
                                        </Select>
                                        <IconButton 
                                            onClick={handleAddLabel} 
                                            color="primary" 
                                            disabled={!newLabelId}
                                            sx={{ 
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    </Stack>
                                )}
                            </Stack>
                        </Paper>

                        {/* List Section */}
                        <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>📂</span> List hiện tại
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Chip
                                    label={lists.find(l => l.id === currentListId)?.name || 'Unknown'}
                                    color="info"
                                    sx={{ 
                                        bgcolor: '#1976d2',
                                        color: 'white',
                                        fontWeight: 500
                                    }}
                                />
                                <Select
                                    size="small"
                                    value={currentListId}
                                    onChange={(e) => handleMoveList(e.target.value)}
                                    sx={{ 
                                        minWidth: 200,
                                        bgcolor: 'white',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#e0e0e0'
                                        }
                                    }}
                                >
                                    {lists.map(list => (
                                        <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
                                    ))}
                                </Select>
                            </Stack>
                        </Paper>

                        {/* Comment Section */}
                        <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>💬</span> Thêm Comment
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <input
                                    type="text"
                                    placeholder="Nhập comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #e0e0e0',
                                        fontSize: '14px',
                                        backgroundColor: 'white',
                                        transition: 'border-color 0.2s',
                                        '&:focus': {
                                            outline: 'none',
                                            borderColor: '#1976d2'
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleAddComment}
                                    disabled={commentLoading || !newComment.trim()}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        '&:hover': { bgcolor: 'primary.dark' }
                                    }}
                                >
                                    {commentLoading ? 'Đang gửi...' : 'Gửi'}
                                </Button>
                            </Stack>
                        </Paper>

                        {/* Notion Search Section */}
                        <Paper elevation={0} sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>📚</span> Tìm kiếm tài liệu
                            </Typography>
                            <Stack spacing={3}>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Nhập từ khóa tìm kiếm..."
                                        value={notionQuery}
                                        onChange={(e) => setNotionQuery(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleNotionSearch();
                                            }
                                        }}
                                        sx={{
                                            bgcolor: 'white',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': {
                                                    borderColor: '#e0e0e0',
                                                },
                                            },
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleNotionSearch}
                                        disabled={notionLoading || !notionQuery.trim()}
                                        startIcon={<SearchIcon />}
                                        sx={{
                                            bgcolor: 'primary.main',
                                            '&:hover': { bgcolor: 'primary.dark' }
                                        }}
                                    >
                                        Tìm kiếm
                                    </Button>
                                </Stack>

                                {notionLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : notionResults.length > 0 ? (
                                    <List sx={{ 
                                        bgcolor: 'white', 
                                        borderRadius: 1,
                                        border: '1px solid #e0e0e0',
                                        maxHeight: 300,
                                        overflow: 'auto'
                                    }}>
                                        {notionResults.map((article) => (
                                            <ListItem
                                                key={article.id}
                                                component={Link}
                                                href={article.url}
                                                target="_blank"
                                                sx={{
                                                    borderBottom: '1px solid #f0f0f0',
                                                    '&:last-child': { borderBottom: 'none' },
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    '&:hover': {
                                                        bgcolor: '#f5f5f5'
                                                    }
                                                }}
                                            >
                                                <ListItemText
                                                    primary={article.title}
                                                    secondary={
                                                        <Stack spacing={1}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {article.preview}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Cập nhật: {new Date(article.lastEdited).toLocaleDateString()}
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : notionQuery && !notionLoading && (
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                        Không tìm thấy kết quả
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>

                        {/* Activity History Section */}
                        <Paper elevation={0} sx={{ p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>🕓</span> Lịch sử hoạt động
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : (
                                <CardActivityHistory actions={actions} />
                            )}
                        </Paper>
                    </Box>
                </Paper>
            </Modal>

            {/* Confirm Dialog */}
            <Dialog 
                open={confirmOpen} 
                onClose={() => setConfirmOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: '300px'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    bgcolor: '#f8f9fa',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    color: '#1a237e'
                }}>
                    Xác nhận hành động
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    <DialogContentText>
                        {confirmAction?.message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
                    <Button 
                        onClick={handleConfirm} 
                        variant="contained" 
                        autoFocus
                        sx={{
                            bgcolor: 'primary.main',
                            '&:hover': { bgcolor: 'primary.dark' }
                        }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default CardDetailModal;