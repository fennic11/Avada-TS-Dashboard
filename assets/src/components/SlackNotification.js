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

    // Filter team members (TS, CS, Admin)
    const teamMembers = members.filter(member => 
        member.role?.toLowerCase() === 'ts' || 
        member.role?.toLowerCase() === 'ts-lead' ||
        member.role?.toLowerCase() === 'cs' ||
        member.role?.toLowerCase() === 'admin'
    );

    const formatSlackMessage = (member, cards) => {
        let message = `*Trong ca này cần fu những card này <@${member.slackId}>*\n\n`;
        
        if (cards.length > 0) {
            // Group cards by list
            const list1Cards = cards.filter(card => card.idList === LIST_1_ID);
            const list2Cards = cards.filter(card => card.idList === LIST_2_ID);

            if (list1Cards.length > 0) {
                message += `*Waiting to fix (from dev): ${list1Cards.length} cards*\n`;
                list1Cards.forEach(card => {
                    const slackLink = extractSlackLink(card.desc);
                    if (slackLink) {
                        message += `• ${card.name}`;
                        message += `  - <${card.shortUrl}|Link Trello>`;
                        message += `  - <${slackLink}|Link Slack>\n`;
                    } else {
                        message += `• ${card.name} - <${card.shortUrl}|Link Trello>\n`;
                    }
                });
                message += '\n';
            }

            if (list2Cards.length > 0) {
                message += `*Update workflow required (SLA: 2 days): ${list2Cards.length} cards*\n`;
                list2Cards.forEach(card => {
                    const slackLink = extractSlackLink(card.desc);
                    if (slackLink) {
                        message += `• ${card.name}`;
                        message += `  - <${card.shortUrl}|Link Trello>`;
                        message += `  - <${slackLink}|Link Slack>\n`;
                    } else {
                        message += `• ${card.name} - <${card.shortUrl}|Link Trello>\n`;
                    }
                });
            }
            message += '\n----------------------------------------------------';
        } else {
            message += "You don't have any cards at the moment.";
        }

        return message;
    };

    // Hàm trích xuất link Slack từ description
    const extractSlackLink = (description) => {
        if (!description) return null;
        
        console.log('Original Description:', description);
        
        // Decode URL first to handle %5D and other encoded characters
        let decodedDescription = description;
        try {
            decodedDescription = decodeURIComponent(description);
            console.log('Decoded Description:', decodedDescription);
        } catch (e) {
            console.log('Failed to decode URL, using original');
        }
        
        // Regex để tìm link Slack với nhiều format khác nhau
        // Bắt được cả: slack.com, app.slack.com, và các subdomain như avadaio.slack.com
        // Cũng xử lý cả format markdown [text](url)
        const slackRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?slack\.com\/[^\s\n\)\]%]+/g;
        const matches = decodedDescription.match(slackRegex);
        
        console.log('Slack regex matches:', matches);
        
        if (matches && matches.length > 0) {
            // Clean up the URL by removing any trailing characters
            let cleanUrl = matches[0];
            // Remove trailing characters that might be part of markdown or encoding
            cleanUrl = cleanUrl.replace(/[\)\]%].*$/, '');
            console.log('Clean URL:', cleanUrl);
            return cleanUrl;
        }
        
        return null;
    };

    // Hàm trích xuất link Trello từ description
    const extractTrelloLink = (description) => {
        if (!description) return null;
        
        // Regex để tìm link Trello
        const trelloRegex = /https?:\/\/trello\.com\/[^\s\n]+/g;
        const matches = description.match(trelloRegex);
        
        return matches && matches.length > 0 ? matches[0] : null;
    };

    // Hàm tính số ngày từ last activity đến hiện tại
    const calculateLastActivityDays = (dateLastActivity) => {
        if (!dateLastActivity) return 'Unknown';
        
        const lastActivity = new Date(dateLastActivity);
        const now = new Date();
        const diffTime = Math.abs(now - lastActivity);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day ago';
        return `${diffDays} days ago`;
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
            await sendMessageToChannel(message, selectedMember.group);
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
                <InputLabel>Select Team Member</InputLabel>
                <Select
                    value={selectedMember?.id || ''}
                    onChange={(e) => {
                        const member = teamMembers.find(m => m.id === e.target.value);
                        setSelectedMember(member);
                    }}
                    label="Select Team Member"
                    sx={{
                        '& .MuiSelect-select': {
                            py: 1.5
                        }
                    }}
                >
                    <MenuItem value="">
                        <em>All Members</em>
                    </MenuItem>
                    {teamMembers.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontWeight: 500 }}>{member.username}</Typography>
                                <Chip 
                                    label={member.role?.toUpperCase() || 'MEMBER'} 
                                    size="small" 
                                    sx={{ 
                                        fontSize: '0.6rem',
                                        height: '20px',
                                        backgroundColor: getRoleColor(member.role),
                                        color: 'white'
                                    }}
                                />
                            </Box>
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

    // Hàm để lấy màu cho từng role
    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'ts':
                return '#1976d2'; // Blue
            case 'ts-lead':
                return '#1565c0'; // Darker blue
            case 'cs':
                return '#388e3c'; // Green
            case 'admin':
                return '#d32f2f'; // Red
            default:
                return '#757575'; // Gray
        }
    };

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
                                <TableCell>Links</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCards.map((card) => {
                                const slackLink = extractSlackLink(card.desc);
                                const trelloLink = extractTrelloLink(card.desc);
                                
                                return (
                                    <TableRow key={card.id}>
                                        <TableCell>{card.name}</TableCell>
                                        <TableCell>{card.due ? new Date(card.due).toLocaleDateString() : 'No due date'}</TableCell>
                                        <TableCell>
                                            {renderMemberAvatars(card.members)}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    href={card.shortUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{ 
                                                        textTransform: 'none',
                                                        fontSize: '0.75rem',
                                                        py: 0.5,
                                                        px: 1,
                                                        minWidth: 'auto'
                                                    }}
                                                >
                                                    Link Trello
                                                </Button>
                                                {slackLink && (
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        href={slackLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={{ 
                                                            textTransform: 'none',
                                                            fontSize: '0.75rem',
                                                            py: 0.5,
                                                            px: 1,
                                                            minWidth: 'auto',
                                                            backgroundColor: '#4A154B',
                                                            color: 'white',
                                                            borderColor: '#4A154B',
                                                            '&:hover': {
                                                                backgroundColor: '#2E0F2F',
                                                                borderColor: '#2E0F2F'
                                                            }
                                                        }}
                                                    >
                                                        Link Slack
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredCards.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
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
        <Box className="slack-notification" sx={{ pl: { xs: 0, md: 8 }, pr: { xs: 0, md: 4 }, pt: 2 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Team Cards Overview</Typography>
            {renderMemberSelector()}
            {renderCardsTable(column1Cards, 'List 1 Cards')}
            {renderCardsTable(column2Cards, 'List 2 Cards')}
        </Box>
    );
};

export default SlackNotification;