import React, { useState, useEffect, useRef, useMemo } from "react";
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
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Avatar
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { getBoardActionsByMemberAndDate } from "../api/trelloApi";
import CardDetailModal from "../components/CardDetailModal";
import members from "../data/members.json";
import dayjs from "dayjs";

const LiveAction = () => {
    const [actions, setActions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [newActionIds, setNewActionIds] = useState(new Set());
    const [roleFilter, setRoleFilter] = useState('all');
    const previousActionIds = useRef(new Set());

    // Get member IDs by role
    const tsMemberIds = useMemo(() => {
        return members.filter(m => m.role === 'TS' || m.role === 'ts-lead').map(m => m.id);
    }, []);

    const csMemberIds = useMemo(() => {
        return members.filter(m => m.role === 'CS' || m.role === 'cs-lead').map(m => m.id);
    }, []);

    // Filter actions by role
    const filteredActions = useMemo(() => {
        if (roleFilter === 'all') return actions;
        if (roleFilter === 'ts') {
            return actions.filter(action => tsMemberIds.includes(action.memberCreator?.id));
        }
        if (roleFilter === 'cs') {
            return actions.filter(action => csMemberIds.includes(action.memberCreator?.id));
        }
        return actions;
    }, [actions, roleFilter, tsMemberIds, csMemberIds]);

    // Get action type label and color
    const getActionTypeInfo = (type, action) => {
        // Check for Mark complete action
        if (type === 'updateCard' && action?.data?.old?.dueComplete !== undefined) {
            if (action.data.card?.dueComplete) {
                return { label: 'Mark Complete', color: 'success', bgColor: '#e8f5e9', textColor: '#2e7d32' };
            } else {
                return { label: 'Unmark Complete', color: 'warning', bgColor: '#fff3e0', textColor: '#e65100' };
            }
        }

        switch (type) {
            case 'createCard':
                return { label: 'Create Card', color: 'success', bgColor: '#e8f5e9', textColor: '#2e7d32' };
            case 'updateCard':
                return { label: 'Update', color: 'info', bgColor: '#e3f2fd', textColor: '#1565c0' };
            case 'addMemberToCard':
                return { label: 'Add Member', color: 'primary', bgColor: '#e8eaf6', textColor: '#3f51b5' };
            case 'removeMemberFromCard':
                return { label: 'Remove Member', color: 'warning', bgColor: '#fff3e0', textColor: '#e65100' };
            case 'commentCard':
                return { label: 'Comment', color: 'secondary', bgColor: '#fce4ec', textColor: '#c2185b' };
            default:
                return { label: type, color: 'default', bgColor: '#f5f5f5', textColor: '#616161' };
        }
    };

    // Get member avatar
    const getMemberAvatar = (memberCreator) => {
        if (!memberCreator) return null;
        const avatarUrl = memberCreator.avatarUrl ||
            (memberCreator.avatarHash
                ? `https://trello-members.s3.amazonaws.com/${memberCreator.id}/${memberCreator.avatarHash}/50.png`
                : null);
        return avatarUrl;
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
        <Box sx={{
            maxWidth: 1400,
            margin: '0 auto',
            p: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
            minHeight: '100vh'
        }}>
            <Paper sx={{
                p: 0,
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <Box sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white',
                    p: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AccessTimeIcon sx={{ fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                                Live Actions
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Real-time activity feed (last 1 hour)
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <ToggleButtonGroup
                            value={roleFilter}
                            exclusive
                            onChange={(_, newValue) => newValue && setRoleFilter(newValue)}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.15)',
                                borderRadius: 2,
                                '& .MuiToggleButton-root': {
                                    color: 'white',
                                    border: 'none',
                                    px: 2,
                                    py: 0.75,
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    '&.Mui-selected': {
                                        bgcolor: 'rgba(255,255,255,0.3)',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.35)',
                                        }
                                    },
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="all">All</ToggleButton>
                            <ToggleButton value="ts">TS</ToggleButton>
                            <ToggleButton value="cs">CS</ToggleButton>
                        </ToggleButtonGroup>

                        {lastRefresh && (
                            <Chip
                                icon={<AccessTimeIcon sx={{ fontSize: 16, color: 'white !important' }} />}
                                label={lastRefresh}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                    '& .MuiChip-icon': { color: 'white' }
                                }}
                            />
                        )}

                        <Chip
                            label={`${filteredActions.length} actions`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.95)',
                                color: '#1976d2',
                                fontWeight: 700
                            }}
                        />

                        <Button
                            variant="contained"
                            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                            onClick={fetchActions}
                            disabled={isLoading}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                fontWeight: 600,
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.3)',
                                    boxShadow: 'none'
                                },
                                '&:disabled': {
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.5)'
                                }
                            }}
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </Button>
                    </Box>
                </Box>

                {/* Table */}
                <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width={50} sx={{
                                    bgcolor: '#fafafa',
                                    fontWeight: 700,
                                    color: '#424242',
                                    borderBottom: '2px solid #e0e0e0'
                                }}>#</TableCell>
                                <TableCell width={100} sx={{
                                    bgcolor: '#fafafa',
                                    fontWeight: 700,
                                    color: '#424242',
                                    borderBottom: '2px solid #e0e0e0'
                                }}>Time</TableCell>
                                <TableCell width={140} sx={{
                                    bgcolor: '#fafafa',
                                    fontWeight: 700,
                                    color: '#424242',
                                    borderBottom: '2px solid #e0e0e0'
                                }}>Type</TableCell>
                                <TableCell width={180} sx={{
                                    bgcolor: '#fafafa',
                                    fontWeight: 700,
                                    color: '#424242',
                                    borderBottom: '2px solid #e0e0e0'
                                }}>Member</TableCell>
                                <TableCell sx={{
                                    bgcolor: '#fafafa',
                                    fontWeight: 700,
                                    color: '#424242',
                                    borderBottom: '2px solid #e0e0e0'
                                }}>Card</TableCell>
                                <TableCell sx={{
                                    bgcolor: '#fafafa',
                                    fontWeight: 700,
                                    color: '#424242',
                                    borderBottom: '2px solid #e0e0e0'
                                }}>Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredActions.length === 0 && !isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <AccessTimeIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                                            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                                                No actions in the last hour
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredActions.map((action, index) => {
                                    const typeInfo = getActionTypeInfo(action.type, action);
                                    const cardName = action.data?.card?.name || '-';
                                    const memberName = action.memberCreator?.fullName || action.memberCreator?.username || '-';
                                    const memberAvatar = getMemberAvatar(action.memberCreator);
                                    const memberInitials = action.memberCreator?.initials || memberName.charAt(0).toUpperCase();

                                    // Get action details
                                    let details = '';
                                    if (action.type === 'commentCard') {
                                        details = action.data?.text || '';
                                    } else if (action.type === 'addMemberToCard' || action.type === 'removeMemberFromCard') {
                                        details = `Member: ${action.member?.fullName || action.member?.username || '-'}`;
                                    } else if (action.type === 'updateCard') {
                                        if (action.data?.listAfter) {
                                            details = `${action.data.listBefore?.name} → ${action.data.listAfter?.name}`;
                                        } else if (action.data?.old?.dueComplete !== undefined) {
                                            details = action.data.card?.dueComplete ? 'Completed' : 'Uncompleted';
                                        } else if (action.data?.old?.name) {
                                            details = `Renamed from "${action.data.old.name}"`;
                                        }
                                    } else if (action.type === 'createCard') {
                                        details = `In: ${action.data?.list?.name || '-'}`;
                                    }

                                    const cardId = action.data?.card?.id;
                                    const isNew = newActionIds.has(action.id);

                                    return (
                                        <TableRow
                                            key={action.id}
                                            onClick={() => cardId && setSelectedCardId(cardId)}
                                            sx={{
                                                cursor: cardId ? 'pointer' : 'default',
                                                bgcolor: isNew ? '#c8e6c9' : 'inherit',
                                                animation: isNew ? 'pulse 1s ease-in-out' : 'none',
                                                '@keyframes pulse': {
                                                    '0%': { bgcolor: '#81c784' },
                                                    '50%': { bgcolor: '#a5d6a7' },
                                                    '100%': { bgcolor: '#c8e6c9' }
                                                },
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: isNew ? '#a5d6a7' : (cardId ? '#e3f2fd' : '#fafafa'),
                                                    transform: cardId ? 'scale(1.002)' : 'none'
                                                },
                                                '&:nth-of-type(even)': {
                                                    bgcolor: isNew ? '#c8e6c9' : '#fafafa'
                                                }
                                            }}
                                        >
                                            <TableCell sx={{ fontWeight: 600, color: '#757575' }}>
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{
                                                    fontFamily: 'monospace',
                                                    fontWeight: 600,
                                                    color: '#424242',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {dayjs(action.date).format('HH:mm:ss')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={typeInfo.label}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: typeInfo.bgColor,
                                                        color: typeInfo.textColor,
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        minWidth: 110,
                                                        border: `1px solid ${typeInfo.textColor}20`
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar
                                                        src={memberAvatar}
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            fontSize: '0.75rem',
                                                            bgcolor: '#1976d2',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {memberInitials}
                                                    </Avatar>
                                                    <Typography variant="body2" sx={{
                                                        fontWeight: 500,
                                                        color: '#424242',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {memberName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{
                                                    fontWeight: 500,
                                                    color: cardId ? '#1976d2' : '#424242',
                                                    maxWidth: 280,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.85rem',
                                                    '&:hover': cardId ? { textDecoration: 'underline' } : {}
                                                }}>
                                                    {cardName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{
                                                    color: '#616161',
                                                    maxWidth: 300,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.8rem',
                                                    fontStyle: details ? 'normal' : 'italic'
                                                }}>
                                                    {details || '-'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {isLoading && actions.length === 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flexDirection: 'column', gap: 2 }}>
                        <CircularProgress size={40} />
                        <Typography color="text.secondary">Loading actions...</Typography>
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
