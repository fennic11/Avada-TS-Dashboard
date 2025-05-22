import React, { useState, useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Avatar, Chip, Select, MenuItem, FormControl, InputLabel, Tooltip, Button } from '@mui/material';
import { getCardsByList } from '../api/trelloApi';
import { sendMessageToChannel } from '../api/slackApi';
import members from '../data/members.json';

const SlackNotification = () => {
    const [column1Cards, setColumn1Cards] = useState([]);
    const [column2Cards, setColumn2Cards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);

    const LIST_1_ID = '63c7b1a68e5576001577d65c';
    const LIST_2_ID = '63c7d18b4fe38a004885aadf';

    // Filter TS members
    const tsMembers = members.filter(member => member.role === 'ts' || member.role === 'ts-lead');

    const formatSlackMessage = (member, cards) => {
        let message = `*Check những card cần fu này trước khi làm việc nhé <@${member.slackId}>*\n\n`;
        
        if (cards.length > 0) {
            // Group cards by list
            const list1Cards = cards.filter(card => card.idList === LIST_1_ID);
            const list2Cards = cards.filter(card => card.idList === LIST_2_ID);

            if (list1Cards.length > 0) {
                message += `*Waiting to fix (from dev):*\n`;
                list1Cards.forEach(card => {
                    message += `• ${card.name} - ${card.shortUrl}\n`;
                });
                message += '\n';
            }

            if (list2Cards.length > 0) {
                message += `*Update workflow required (SLA: 2 days):*\n`;
                list2Cards.forEach(card => {
                    message += `• ${card.name} - ${card.shortUrl}\n`;
                });
            }
        } else {
            message += "You don't have any cards at the moment.";
        }

        return message;
    };

    const handleSendSlackMessage = async () => {
        if (!selectedMember) return;

        try {
            setSendingMessage(true);
            const allCards = [...column1Cards, ...column2Cards];
            const memberCards = allCards.filter(card => 
                card.idMembers?.includes(selectedMember.id)
            );
            
            const message = formatSlackMessage(selectedMember, memberCards);
            await sendMessageToChannel(message);
            alert('Message sent successfully!');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSendingMessage(false);
        }
    };

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                const [cards1, cards2] = await Promise.all([
                    getCardsByList(LIST_1_ID),
                    getCardsByList(LIST_2_ID)
                ]);

                // Process cards with member information
                const processCards = (cards) => {
                    return cards.map(card => ({
                        ...card,
                        members: card.idMembers?.map(memberId => {
                            const memberInfo = members.find(m => m.id === memberId);
                            return memberInfo || null;
                        }).filter(Boolean) || []
                    }));
                };

                setColumn1Cards(processCards(cards1));
                setColumn2Cards(processCards(cards2));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCards();
    }, []);

    // Filter cards based on selected member
    const filterCardsByMember = (cards) => {
        if (!selectedMember) return cards;
        return cards.filter(card => 
            card.idMembers?.includes(selectedMember.id)
        );
    };

    const renderMemberSelector = () => (
        <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl fullWidth>
                <InputLabel>Select TS Member</InputLabel>
                <Select
                    value={selectedMember?.id || ''}
                    onChange={(e) => {
                        const member = tsMembers.find(m => m.id === e.target.value);
                        setSelectedMember(member);
                    }}
                    label="Select TS Member"
                    sx={{
                        '& .MuiSelect-select': {
                            py: 1.5
                        }
                    }}
                >
                    <MenuItem value="">
                        <em>All Members</em>
                    </MenuItem>
                    {tsMembers.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                            <Typography sx={{ fontWeight: 500 }}>{member.username}</Typography>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Button
                variant="contained"
                color="primary"
                onClick={handleSendSlackMessage}
                disabled={!selectedMember || sendingMessage}
                sx={{
                    minWidth: 200,
                    height: 56,
                    backgroundColor: '#4CAF50',
                    '&:hover': {
                        backgroundColor: '#388E3C'
                    },
                    '&:disabled': {
                        backgroundColor: '#E0E0E0'
                    }
                }}
            >
                {sendingMessage ? 'Sending...' : 'Send Slack Message'}
            </Button>
        </Box>
    );

    const renderMemberAvatars = (cardMembers) => {
        if (!cardMembers || cardMembers.length === 0) return 'No members';
        
        return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {cardMembers.map((member, index) => (
                    <React.Fragment key={member.id}>
                        <Tooltip 
                            title={
                                <Box>
                                    <Typography variant="subtitle2">{member.fullName}</Typography>
                                    {member.role && <Typography variant="caption">Role: {member.role}</Typography>}
                                    {member.kpiName && <Typography variant="caption">KPI: {member.kpiName}</Typography>}
                                </Box>
                            }
                        >
                            <Typography variant="body2">
                                {member.username}
                            </Typography>
                        </Tooltip>
                        {index < cardMembers.length - 1 && (
                            <Typography variant="body2">,</Typography>
                        )}
                    </React.Fragment>
                ))}
            </Box>
        );
    };

    const renderCardsTable = (cards, listTitle) => {
        const filteredCards = filterCardsByMember(cards);
        return (
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    {listTitle}
                    {selectedMember && (
                        <Chip 
                            label={`Filtered by: ${selectedMember.fullName}`}
                            onDelete={() => setSelectedMember(null)}
                            sx={{ ml: 2 }}
                        />
                    )}
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Card Name</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell>Members</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCards.map((card) => (
                                <TableRow key={card.id}>
                                    <TableCell>{card.name}</TableCell>
                                    <TableCell>{card.due ? new Date(card.due).toLocaleDateString() : 'No due date'}</TableCell>
                                    <TableCell>
                                        {renderMemberAvatars(card.members)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredCards.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        {selectedMember 
                                            ? `No cards for ${selectedMember.fullName}`
                                            : 'No cards'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    };

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    if (error) {
        return <Typography color="error">Error: {error}</Typography>;
    }

    return (
        <Box className="slack-notification">
            <Typography variant="h5" sx={{ mb: 3 }}>Cards Overview</Typography>
            {renderMemberSelector()}
            {renderCardsTable(column1Cards, 'List 1 Cards')}
            {renderCardsTable(column2Cards, 'List 2 Cards')}
        </Box>
    );
};

export default SlackNotification;