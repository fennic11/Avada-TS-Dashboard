import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import { getBoardActionsByMemberAndDate } from "../api/trelloApi";
import CardDetailModal from "../components/CardDetailModal";
import dayjs from "dayjs";

const LiveAction = () => {
    const [actions, setActions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [newActionIds, setNewActionIds] = useState(new Set());
    const previousActionIds = useRef(new Set());

    // Get action type label and color
    const getActionTypeInfo = (type, action) => {
        // Check for Mark complete action
        if (type === 'updateCard' && action?.data?.old?.dueComplete !== undefined) {
            if (action.data.card?.dueComplete) {
                return { label: 'Mark Complete', color: 'success' };
            } else {
                return { label: 'Unmark Complete', color: 'warning' };
            }
        }

        switch (type) {
            case 'createCard':
                return { label: 'Create Card', color: 'success' };
            case 'updateCard':
                return { label: 'Update', color: 'info' };
            case 'addMemberToCard':
                return { label: 'Add Member', color: 'primary' };
            case 'removeMemberFromCard':
                return { label: 'Remove Member', color: 'warning' };
            case 'commentCard':
                return { label: 'Comment', color: 'secondary' };
            default:
                return { label: type, color: 'default' };
        }
    };

    // Fetch actions from last hour
    const fetchActions = async () => {
        setIsLoading(true);
        try {
            const now = dayjs();
            const oneHourAgo = now.subtract(1, 'hour');

            const result = await getBoardActionsByMemberAndDate(
                oneHourAgo.toISOString(),
                now.toISOString()
            );

            // Sort by date descending (newest first)
            const sortedActions = result.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );

            // Find new actions (not in previous list)
            const currentIds = new Set(sortedActions.map(a => a.id));
            const newIds = new Set();

            if (previousActionIds.current.size > 0) {
                sortedActions.forEach(action => {
                    if (!previousActionIds.current.has(action.id)) {
                        newIds.add(action.id);
                    }
                });
            }

            // Update previous action ids for next comparison
            previousActionIds.current = currentIds;

            setNewActionIds(newIds);
            setActions(sortedActions);
            setLastRefresh(now.format('HH:mm:ss'));

            // Clear highlight after 5 seconds
            if (newIds.size > 0) {
                setTimeout(() => {
                    setNewActionIds(new Set());
                }, 5000);
            }
        } catch (error) {
            console.error('Error fetching actions:', error);
            setActions([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto refresh every 30 seconds
    useEffect(() => {
        fetchActions();
        const interval = setInterval(fetchActions, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box sx={{ maxWidth: 1400, margin: '0 auto', p: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Live Actions (1 hour)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {lastRefresh && (
                            <Typography variant="body2" color="text.secondary">
                                Last update: {lastRefresh}
                            </Typography>
                        )}
                        <Chip
                            label={`${actions.length} actions`}
                            color="primary"
                            size="small"
                        />
                        <Button
                            variant="outlined"
                            startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={fetchActions}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </Button>
                    </Box>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell width={60}><strong>STT</strong></TableCell>
                                <TableCell width={120}><strong>Time</strong></TableCell>
                                <TableCell width={130}><strong>Type</strong></TableCell>
                                <TableCell width={150}><strong>Member</strong></TableCell>
                                <TableCell><strong>Card</strong></TableCell>
                                <TableCell><strong>Details</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {actions.length === 0 && !isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            No actions in the last hour
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                actions.map((action, index) => {
                                    const typeInfo = getActionTypeInfo(action.type, action);
                                    const cardName = action.data?.card?.name || '-';
                                    const memberName = action.memberCreator?.fullName || action.memberCreator?.username || '-';

                                    // Get action details
                                    let details = '';
                                    if (action.type === 'commentCard') {
                                        details = action.data?.text || '';
                                    } else if (action.type === 'addMemberToCard' || action.type === 'removeMemberFromCard') {
                                        details = `Member: ${action.member?.fullName || action.member?.username || '-'}`;
                                    } else if (action.type === 'updateCard') {
                                        if (action.data?.listAfter) {
                                            details = `Move: "${action.data.listBefore?.name}" -> "${action.data.listAfter?.name}"`;
                                        } else if (action.data?.old?.dueComplete !== undefined) {
                                            const byMember = action.memberCreator?.fullName || action.memberCreator?.username || '';
                                            details = action.data.card?.dueComplete
                                                ? `Mark complete by ${byMember}`
                                                : `Unmark complete by ${byMember}`;
                                        } else if (action.data?.old?.name) {
                                            details = `Rename from "${action.data.old.name}"`;
                                        }
                                    } else if (action.type === 'createCard') {
                                        details = `List: ${action.data?.list?.name || '-'}`;
                                    }

                                    const cardId = action.data?.card?.id;
                                    const isNew = newActionIds.has(action.id);

                                    return (
                                        <TableRow
                                            key={action.id}
                                            onClick={() => cardId && setSelectedCardId(cardId)}
                                            sx={{
                                                cursor: cardId ? 'pointer' : 'default',
                                                backgroundColor: isNew ? '#c8e6c9' : 'inherit',
                                                animation: isNew ? 'highlight 0.5s ease-in-out' : 'none',
                                                '@keyframes highlight': {
                                                    '0%': { backgroundColor: '#81c784' },
                                                    '100%': { backgroundColor: '#c8e6c9' }
                                                },
                                                '&:hover': { backgroundColor: isNew ? '#a5d6a7' : (cardId ? '#e3f2fd' : '#f9f9f9') },
                                                '&:nth-of-type(odd)': { backgroundColor: isNew ? '#c8e6c9' : '#fafafa' }
                                            }}
                                        >
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                {dayjs(action.date).format('HH:mm:ss')}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={typeInfo.label}
                                                    color={typeInfo.color}
                                                    size="small"
                                                    sx={{ minWidth: 100 }}
                                                />
                                            </TableCell>
                                            <TableCell>{memberName}</TableCell>
                                            <TableCell>{cardName}</TableCell>
                                            <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {details}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {isLoading && actions.length === 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
            </Paper>

            {/* Card Detail Modal */}
            <CardDetailModal
                open={Boolean(selectedCardId)}
                onClose={() => setSelectedCardId(null)}
                cardId={selectedCardId}
            />
        </Box>
    );
};

export default LiveAction;
