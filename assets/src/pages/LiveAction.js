import React, { useState, useEffect } from "react";
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

    // Get action type label and color
    const getActionTypeInfo = (type) => {
        switch (type) {
            case 'createCard':
                return { label: 'Tao Card', color: 'success' };
            case 'updateCard':
                return { label: 'Cap nhat', color: 'info' };
            case 'addMemberToCard':
                return { label: 'Them Member', color: 'primary' };
            case 'removeMemberFromCard':
                return { label: 'Xoa Member', color: 'warning' };
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

            setActions(sortedActions);
            setLastRefresh(now.format('HH:mm:ss'));
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
                                    const typeInfo = getActionTypeInfo(action.type);
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
                                            details = action.data.card?.dueComplete ? 'Mark complete' : 'Unmark complete';
                                        } else if (action.data?.old?.name) {
                                            details = `Rename from "${action.data.old.name}"`;
                                        }
                                    } else if (action.type === 'createCard') {
                                        details = `List: ${action.data?.list?.name || '-'}`;
                                    }

                                    const cardId = action.data?.card?.id;

                                    return (
                                        <TableRow
                                            key={action.id}
                                            onClick={() => cardId && setSelectedCardId(cardId)}
                                            sx={{
                                                cursor: cardId ? 'pointer' : 'default',
                                                '&:hover': { backgroundColor: cardId ? '#e3f2fd' : '#f9f9f9' },
                                                '&:nth-of-type(odd)': { backgroundColor: '#fafafa' }
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
