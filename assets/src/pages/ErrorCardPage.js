import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Typography,
    Spin,
    Alert,
    Tag,
    Space,
    Statistic,
    DatePicker,
    Button,
    Tooltip,
    Avatar,
    Divider,
    Empty,
    Select,
    Input,
    Modal
} from 'antd';
import {
    ExclamationCircleOutlined,
    CalendarOutlined,
    UserOutlined,
    TagOutlined,
    LinkOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    FileTextOutlined,
    WarningOutlined,
    AlertOutlined,
    StopOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { getErrorCardsByMonth, updateErrorCardStatus } from '../api/errorCards';
import { getCurrentUser } from '../api/usersApi';
import { ROLES } from '../utils/roles';
import { sendMessageToChannel } from '../api/slackApi';
import dayjs from 'dayjs';
import membersData from '../data/members.json';
import penaltyPoints from '../data/penaltyPoint.json';
import CardDetailModal from '../components/CardDetailModal';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const ErrorCardPage = () => {
    const [errorCards, setErrorCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [selectedTSGroup, setSelectedTSGroup] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [requestTextModalOpen, setRequestTextModalOpen] = useState(false);
    const [requestText, setRequestText] = useState('');
    const [selectedCardForRequest, setSelectedCardForRequest] = useState(null);
    const [requestTextLoading, setRequestTextLoading] = useState(false);

    const fetchErrorCards = async (year, month) => {
        try {
            setLoading(true);
            setError(null);
            const data = await getErrorCardsByMonth(year, month);
            setErrorCards(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch error cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentDate = dayjs();
        fetchErrorCards(currentDate.year(), currentDate.month() + 1);
    }, []);

    // Clear selected members when TS group changes
    useEffect(() => {
        setSelectedMembers([]);
    }, [selectedTSGroup]);

    const handleDateChange = (date) => {
        if (date) {
            setSelectedDate(date);
            fetchErrorCards(date.year(), date.month() + 1);
        }
    };

    const getTotalPenaltyPoints = () => {
        return errorCards.reduce((total, card) => total + (card.penaltyPoints || 0), 0);
    };

    const formatDate = (dateString) => {
        return dayjs(dateString).format('DD/MM/YYYY HH:mm');
    };

    const getCardStatusColor = (penaltyPoints) => {
        if (penaltyPoints >= 10) return 'red';
        if (penaltyPoints >= 5) return 'orange';
        return 'green';
    };

    const getMemberInfo = (memberId) => {
        const member = membersData.find(m => m.id === memberId);
        return member || { fullName: 'Unknown Member', initials: 'U' };
    };

    const getMemberInitials = (fullName) => {
        if (!fullName) return 'U';
        return fullName
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const getPenaltyName = (penaltyId) => {
        if (!penaltyId) return 'Unknown Penalty';
        const penalty = penaltyPoints.find(p => p.id === penaltyId);
        return penalty ? penalty.name : 'Unknown Penalty';
    };

    const groupCardsByCardId = (cards) => {
        const grouped = {};
        cards.forEach(card => {
            if (!grouped[card.cardId]) {
                grouped[card.cardId] = [];
            }
            grouped[card.cardId].push(card);
        });
        return Object.values(grouped);
    };

    const getUniqueMembers = (cards) => {
        const memberIds = new Set();
        cards.forEach(card => {
            if (card.members) {
                card.members.forEach(memberId => memberIds.add(memberId));
            }
        });
        return Array.from(memberIds);
    };

    const getAllNotes = (cards) => {
        return cards
            .map(card => card.note)
            .filter(note => note && note.trim() !== '');
    };

    const getAllUniqueMembers = () => {
        const memberIds = new Set();
        errorCards.forEach(card => {
            if (card.members) {
                card.members.forEach(memberId => memberIds.add(memberId));
            }
        });
        return Array.from(memberIds)
            .map(memberId => {
                const memberInfo = getMemberInfo(memberId);
                return {
                    value: memberId,
                    label: memberInfo.fullName,
                    memberInfo
                };
            })
            .filter(member => member.memberInfo.role === 'TS') // Chỉ lấy TS members
            .filter(member => {
                // If TS group is selected, only show members from that group
                if (selectedTSGroup) {
                    return member.memberInfo.group === selectedTSGroup;
                }
                return true;
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    const getTSGroupOptions = () => {
        const tsGroups = new Set();
        membersData.forEach(member => {
            if (member.role === 'TS' && member.group) {
                tsGroups.add(member.group);
            }
        });
        return Array.from(tsGroups)
            .sort()
            .map(group => ({
                value: group,
                label: group
            }));
    };

    const getCardTSGroup = (card) => {
        if (!card.members || card.members.length === 0) return null;
        
        // Find the first TS member in the card to determine the group
        for (const memberId of card.members) {
            const memberInfo = getMemberInfo(memberId);
            if (memberInfo.role === 'TS' && memberInfo.group) {
                return memberInfo.group;
            }
        }
        return null;
    };

    const sendSlackNotificationForRequest = async (card, requestText) => {
        try {
            const tsGroup = getCardTSGroup(card);
            if (!tsGroup) {
                console.log('No TS group found for card, skipping Slack notification');
                return;
            }

            // Get current user info and find member details
            const currentUser = getCurrentUser();
            let currentUserName = 'Unknown User';
            
            if (currentUser) {
                // Try to find member info from members.json by email or username
                const memberInfo = membersData.find(member => 
                    (member.email && member.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
                    (member.username && member.username === currentUser.username)
                );
                
                if (memberInfo) {
                    currentUserName = memberInfo.fullName;
                } else {
                    // Fallback to user data
                    currentUserName = currentUser.fullName || currentUser.name || currentUser.username || 'Unknown User';
                }
            }

            // Format the message similar to AssignCardPage.js
            const message = `*🚨 Error Card Request*\n` +
                `*Card:* ${card.cardName}\n` +
                `*Card URL:* ${card.cardUrl}\n` +
                `*Submitted by:* ${currentUserName}\n` +
                `*TS Group:* ${tsGroup}\n` +
                `*Date:* ${dayjs().format('DD/MM/YYYY')}\n` +
                `*Request Details:*\n${requestText}\n` +
                `-------------------------------------------------\n`;

            // Determine who to tag based on TS group
            let taggedMessage = message;
            if (tsGroup === 'TS1') {
                taggedMessage = `<@U08UGHSA1B3> ${message}`; // Tag fennic
            } else if (tsGroup === 'TS2') {
                taggedMessage = `<@U08UGHSA1B3> <@U08U7HS1XRS> ${message}`; // Tag fennic and raymond
            }

            // Send to appropriate channel based on group
            await sendMessageToChannel(taggedMessage, 'ASSIGN-CARD');
            
            console.log(`Slack notification sent for ${tsGroup} group`);
        } catch (error) {
            console.error('Error sending Slack notification:', error);
            // Don't throw error to avoid breaking the main flow
        }
    };

    const filterCardsByMembers = (cards) => {
        if (selectedMembers.length === 0) return cards;
        
        return cards.filter(card => {
            if (!card.members) return false;
            return card.members.some(memberId => selectedMembers.includes(memberId));
        });
    };

    const filterCardsBySearch = (cards) => {
        if (!searchText.trim()) return cards;
        
        return cards.filter(card => {
            const cardName = card.cardName?.toLowerCase() || '';
            const cardId = card.cardId?.toLowerCase() || '';
            const note = card.note?.toLowerCase() || '';
            const searchLower = searchText.toLowerCase();
            
            return cardName.includes(searchLower) || 
                   cardId.includes(searchLower) || 
                   note.includes(searchLower);
        });
    };

    const filterCardsByTSGroup = (cards) => {
        if (!selectedTSGroup) return cards;
        
        return cards.filter(card => {
            if (!card.members) return false;
            
            // Check if any member in the card belongs to the selected TS group
            return card.members.some(memberId => {
                const memberInfo = getMemberInfo(memberId);
                return memberInfo.group === selectedTSGroup;
            });
        });
    };

    const getTSLeaderboard = () => {
        const memberStats = {};
        
        // Chỉ lấy TS members từ members.json, filter theo TS group nếu có
        const tsMembers = membersData.filter(member => {
            if (member.role !== 'TS') return false;
            if (selectedTSGroup) {
                return member.group === selectedTSGroup;
            }
            return true;
        });
        
        // Khởi tạo stats cho tất cả TS members
        tsMembers.forEach(member => {
            memberStats[member.id] = {
                id: member.id,
                fullName: member.fullName,
                username: member.username,
                group: member.group || 'Unknown',
                errorCount: 0,
                totalPoints: 0,
                cards: []
            };
        });
        
        // Đếm error cards cho từng TS member (chỉ tính cards có status approved)
        filteredCards.filter(card => card.status === 'approved').forEach(card => {
            if (card.members) {
                card.members.forEach(memberId => {
                    if (memberStats[memberId]) {
                        // Chỉ tăng errorCount nếu card chưa được đếm cho member này
                        if (!memberStats[memberId].cards.some(existingCard => existingCard._id === card._id)) {
                            memberStats[memberId].errorCount += 1;
                            memberStats[memberId].totalPoints += (card.penaltyPoints || 0);
                            memberStats[memberId].cards.push(card);
                        }
                    }
                });
            }
        });
        
        // Chuyển thành array và sắp xếp theo error count (giảm dần)
        return Object.values(memberStats)
            .filter(member => member.errorCount > 0) // Chỉ hiện members có errors
            .sort((a, b) => {
                // Sắp xếp theo error count trước, sau đó theo total points
                if (b.errorCount !== a.errorCount) {
                    return b.errorCount - a.errorCount;
                }
                return b.totalPoints - a.totalPoints;
            });
    };

    const filteredCards = filterCardsBySearch(filterCardsByMembers(filterCardsByTSGroup(errorCards)));
    const approvedCards = filteredCards.filter(card => card.status === 'approved');
    const groupedCards = groupCardsByCardId(filteredCards);
    const tsLeaderboard = getTSLeaderboard();

    const handleCardClick = (cardId) => {
        setSelectedCardId(cardId);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedCardId(null);
    };

    const handleRequestTextClick = (card) => {
        setSelectedCardForRequest(card);
        setRequestTextModalOpen(true);
        setRequestText('');
    };

    const handleRequestTextModalClose = () => {
        setRequestTextModalOpen(false);
        setSelectedCardForRequest(null);
        setRequestText('');
    };

    const handleRequestTextSubmit = async () => {
        if (!requestText.trim() || !selectedCardForRequest) return;

        setRequestTextLoading(true);
        try {
            // Call API to update the error card status and request text
            await updateErrorCardStatus(
                selectedCardForRequest._id, 
                'requested', 
                requestText.trim()
            );
            
            // Update local state after successful API call
            setErrorCards(prevCards => 
                prevCards.map(card => 
                    card._id === selectedCardForRequest._id 
                        ? { 
                            ...card, 
                            status: 'requested',
                            requestText: requestText.trim()
                        }
                        : card
                )
            );
            
            console.log(`Request text submitted for card ${selectedCardForRequest._id}:`, requestText);
            
            // Send Slack notification
            await sendSlackNotificationForRequest(selectedCardForRequest, requestText.trim());
            
            // Close modal and reset state
            handleRequestTextModalClose();
        } catch (error) {
            console.error('Error submitting request text:', error);
            // You can add a notification here to show the error to the user
        } finally {
            setRequestTextLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return '#52c41a';
            case 'rejected':
                return '#ff4d4f';
            case 'requested':
                return '#fa8c16';
            default:
                return '#d9d9d9';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircleOutlined />;
            case 'rejected':
                return <CloseCircleOutlined />;
            case 'requested':
                return <MessageOutlined />;
            default:
                return <ExclamationCircleOutlined />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'approved':
                return 'Approved';
            case 'rejected':
                return 'Rejected';
            case 'requested':
                return 'Requested';
            default:
                return 'Unknown';
        }
    };

    const handleStatusUpdate = async (recordId, newStatus) => {
        try {
            // Call API to update the error card status
            await updateErrorCardStatus(recordId, newStatus, '');
            
            // Update local state after successful API call
            setErrorCards(prevCards => 
                prevCards.map(card => 
                    card._id === recordId 
                        ? { ...card, status: newStatus }
                        : card
                )
            );
            
            console.log(`Status updated to ${newStatus} for record ${recordId}`);
        } catch (error) {
            console.error('Error updating status:', error);
            // You can add a notification here to show the error to the user
        }
    };

    // Get current user and check permissions
    const currentUser = getCurrentUser();
    const userRole = currentUser?.role;
    const canApproveReject = userRole === ROLES.ADMIN || userRole === ROLES.TS_LEAD;

    return (
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                                        <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                                        Error Cards Dashboard
                                    </Title>
                                    <Text type="secondary">Track and manage error cards by month</Text>
                                </div>
                                <Space>
                                    <DatePicker.MonthPicker
                                        value={selectedDate}
                                        onChange={handleDateChange}
                                        format="MMMM YYYY"
                                        placeholder="Select month"
                                        style={{ width: 200 }}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<CalendarOutlined />}
                                        onClick={() => fetchErrorCards(selectedDate.year(), selectedDate.month() + 1)}
                                    >
                                        Refresh
                                    </Button>
                                </Space>
                            </div>

                            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                                <Col span={8}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text strong style={{ minWidth: 80 }}>Search:</Text>
                                        <Input
                                            placeholder="Search by card name, ID, or note..."
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                            style={{ flex: 1 }}
                                            allowClear
                                        />
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text strong style={{ minWidth: 80 }}>TS Group:</Text>
                                        <Select
                                            placeholder="Select TS group..."
                                            value={selectedTSGroup}
                                            onChange={setSelectedTSGroup}
                                            style={{ flex: 1 }}
                                            allowClear
                                            options={getTSGroupOptions()}
                                        />
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text strong style={{ minWidth: 80 }}>Members:</Text>
                                        <Select
                                            mode="multiple"
                                            placeholder="Select members to filter..."
                                            value={selectedMembers}
                                            onChange={setSelectedMembers}
                                            style={{ flex: 1 }}
                                            allowClear
                                            showSearch
                                            filterOption={(input, option) =>
                                                option.label.toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={getAllUniqueMembers()}
                                        />
                                    </div>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={8}>
                                    <Card>
                                        <Statistic
                                            title="Total Error Cards (Approved)"
                                            value={approvedCards.length}
                                            prefix={<ExclamationCircleOutlined />}
                                            valueStyle={{ color: '#1890ff' }}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card>
                                        <Statistic
                                            title="Total Penalty Points (Approved)"
                                            value={approvedCards.reduce((total, card) => total + (card.penaltyPoints || 0), 0)}
                                            prefix={<TrophyOutlined />}
                                            valueStyle={{ color: '#ff4d4f' }}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card>
                                        <Statistic
                                            title="Average Points per Card (Approved)"
                                            value={approvedCards.length > 0 ? (approvedCards.reduce((total, card) => total + (card.penaltyPoints || 0), 0) / approvedCards.length).toFixed(1) : 0}
                                            prefix={<TrophyOutlined />}
                                            valueStyle={{ color: '#52c41a' }}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        </Space>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                            <AlertOutlined style={{ color: '#ff4d4f', fontSize: '20px', marginRight: 8 }} />
                            <Title level={3} style={{ margin: 0, color: '#262626' }}>
                                TS Agent Penalty Report
                            </Title>
                        </div>
                        {tsLeaderboard.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {tsLeaderboard.map((member, index) => (
                                    <Col span={8} key={member.id}>
                                        <Card 
                                            hoverable
                                            style={{ 
                                                border: index < 3 ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                                                backgroundColor: index < 3 ? '#fff2f0' : '#ffffff'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                                <div style={{ 
                                                    width: 32, 
                                                    height: 32, 
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: 12,
                                                    backgroundColor: index < 3 ? '#ff4d4f' : '#d9d9d9',
                                                    color: '#ffffff',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px'
                                                }}>
                                                    {index < 3 ? (
                                                        <StopOutlined style={{ fontSize: '16px' }} />
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <Text strong style={{ fontSize: '14px', display: 'block' }}>
                                                        {member.fullName}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {member.group} • {member.username}
                                                    </Text>
                                                </div>
                                            </div>
                                            
                                            <Row gutter={8}>
                                                <Col span={12}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ 
                                                            fontSize: '24px', 
                                                            fontWeight: 'bold',
                                                            color: index < 3 ? '#ff4d4f' : '#1890ff'
                                                        }}>
                                                            {member.errorCount}
                                                        </div>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            Penalty Cards
                                                        </Text>
                                                    </div>
                                                </Col>
                                                <Col span={12}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ 
                                                            fontSize: '24px', 
                                                            fontWeight: 'bold',
                                                            color: '#ff4d4f'
                                                        }}>
                                                            {member.totalPoints}
                                                        </div>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            Total Points
                                                        </Text>
                                                    </div>
                                                </Col>
                                            </Row>
                                            
                                            {index < 3 && (
                                                <div style={{ 
                                                    textAlign: 'center', 
                                                    marginTop: 8,
                                                    padding: '4px 8px',
                                                    backgroundColor: '#ff4d4f',
                                                    borderRadius: '12px'
                                                }}>
                                                    <Text style={{ color: '#ffffff', fontSize: '12px', fontWeight: 500 }}>
                                                        {index === 0 ? '⚠️ Highest Penalties' : 
                                                         index === 1 ? '⚠️ High Penalties' : '⚠️ Moderate Penalties'}
                                                    </Text>
                                                </div>
                                            )}
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Empty
                                description="No TS agents with penalties found"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Card>
                </Col>

                <Col span={24}>
                    {loading ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: '50px' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 16 }}>
                                    <Text>Loading error cards...</Text>
                                </div>
                            </div>
                        </Card>
                    ) : error ? (
                        <Alert
                            message="Error"
                            description={error}
                            type="error"
                            showIcon
                            closable
                        />
                    ) : groupedCards.length === 0 ? (
                        <Card>
                            <Empty
                                description="No error cards found for this month"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        </Card>
                    ) : (
                        <Row gutter={[16, 16]}>
                            {groupedCards.map((cardGroup, groupIndex) => {
                                const firstCard = cardGroup[0];
                                const uniqueMembers = getUniqueMembers(cardGroup);
                                const allNotes = getAllNotes(cardGroup);
                                const totalPenaltyPoints = cardGroup.reduce((sum, card) => sum + (card.penaltyPoints || 0), 0);
                                
                                return (
                                    <Col span={12} key={firstCard._id || firstCard.cardId}>
                                        <Card
                                            hoverable
                                            style={{ height: '100%', cursor: 'pointer' }}
                                            onClick={() => handleCardClick(firstCard.cardId)}
                                            actions={[
                                                <Tooltip title="View Card">
                                                    <LinkOutlined
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(firstCard.cardUrl, '_blank');
                                                        }}
                                                    />
                                                </Tooltip>
                                            ]}
                                        >
                                            <div style={{ marginBottom: 16 }}>
                                                <Space align="start" style={{ width: '100%' }}>
                                                    <Avatar
                                                        icon={<ExclamationCircleOutlined />}
                                                        style={{
                                                            backgroundColor: getCardStatusColor(totalPenaltyPoints),
                                                            marginTop: 4
                                                        }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                            <Paragraph
                                                                ellipsis={{ rows: 2 }}
                                                                style={{ margin: 0, fontWeight: 500, flex: 1 }}
                                                            >
                                                                {firstCard.cardName}
                                                            </Paragraph>
                                                            <Tag
                                                                color={getStatusColor(firstCard.status || 'approved')}
                                                                icon={getStatusIcon(firstCard.status || 'approved')}
                                                                style={{ 
                                                                    marginLeft: 8,
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '12px',
                                                                    padding: '2px 8px'
                                                                }}
                                                            >
                                                                {getStatusText(firstCard.status || 'approved')}
                                                            </Tag>
                                                        </div>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            ID: {firstCard.cardId}
                                                        </Text>
                                                        {cardGroup.length > 1 && (
                                                            <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
                                                                {cardGroup.length} submissions
                                                            </Text>
                                                        )}
                                                    </div>
                                                </Space>
                                            </div>

                                            <Divider style={{ margin: '12px 0' }} />

                                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                                <div>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                        Created: {formatDate(firstCard.createdAt)}
                                                    </Text>
                                                </div>

                                                {totalPenaltyPoints > 0 && (
                                                    <div>
                                                        <Tag
                                                            color={getCardStatusColor(totalPenaltyPoints)}
                                                            icon={<TrophyOutlined />}
                                                        >
                                                            {totalPenaltyPoints} Points
                                                        </Tag>
                                                    </div>
                                                )}

                                                {firstCard.penaltyId && (
                                                    <div>
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            marginBottom: 6,
                                                            padding: '6px 8px',
                                                            backgroundColor: '#fff2e8',
                                                            borderRadius: '4px',
                                                            border: '1px solid #ffbb96'
                                                        }}>
                                                            <WarningOutlined style={{ 
                                                                color: '#fa8c16', 
                                                                marginRight: 6,
                                                                fontSize: '14px'
                                                            }} />
                                                            <Text style={{ 
                                                                fontSize: '13px', 
                                                                fontWeight: 600,
                                                                color: '#d46b08'
                                                            }}>
                                                                Penalty Type
                                                            </Text>
                                                        </div>
                                                        <div style={{ 
                                                            padding: '8px',
                                                            backgroundColor: '#fff7e6',
                                                            borderRadius: '6px',
                                                            border: '2px solid #ffd591',
                                                            boxShadow: '0 2px 4px rgba(250, 140, 22, 0.1)'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                padding: '8px 10px',
                                                                backgroundColor: '#ffffff',
                                                                borderRadius: '4px',
                                                                border: '1px solid #ffd591',
                                                                fontSize: '12px',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <FileTextOutlined style={{ 
                                                                    color: '#fa8c16', 
                                                                    marginRight: 8,
                                                                    marginTop: 1,
                                                                    fontSize: '12px'
                                                                }} />
                                                                <div>
                                                                    <Text style={{ 
                                                                        fontSize: '12px',
                                                                        lineHeight: '1.4',
                                                                        color: '#262626',
                                                                        fontWeight: 600,
                                                                        display: 'block',
                                                                        marginBottom: 2
                                                                    }}>
                                                                        {getPenaltyName(firstCard.penaltyId)}
                                                                    </Text>
                                                                    <Text style={{ 
                                                                        fontSize: '11px',
                                                                        lineHeight: '1.4',
                                                                        color: '#8c8c8c',
                                                                        display: 'block'
                                                                    }}>
                                                                        ID: {firstCard.penaltyId}
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {firstCard.labels && firstCard.labels.length > 0 && (
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            <TagOutlined style={{ marginRight: 4 }} />
                                                            Labels:
                                                        </Text>
                                                        <div style={{ marginTop: 4 }}>
                                                            {firstCard.labels.slice(0, 3).map((label, index) => (
                                                                <Tag key={index} size="small" style={{ marginBottom: 4 }}>
                                                                    {label}
                                                                </Tag>
                                                            ))}
                                                            {firstCard.labels.length > 3 && (
                                                                <Tag size="small">+{firstCard.labels.length - 3} more</Tag>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {uniqueMembers.length > 0 && (
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            <UserOutlined style={{ marginRight: 4 }} />
                                                            Members:
                                                        </Text>
                                                        <div style={{ 
                                                            marginTop: 4,
                                                            padding: '8px',
                                                            backgroundColor: '#f8f9fa',
                                                            borderRadius: '6px',
                                                            border: '1px solid #e9ecef'
                                                        }}>
                                                            {uniqueMembers.map((memberId, index) => {
                                                                const memberInfo = getMemberInfo(memberId);
                                                                return (
                                                                    <div 
                                                                        key={index} 
                                                                        style={{ 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            marginBottom: index < uniqueMembers.length - 1 ? 6 : 0,
                                                                            padding: '4px 6px',
                                                                            backgroundColor: '#ffffff',
                                                                            borderRadius: '4px',
                                                                            fontSize: '12px',
                                                                            border: '1px solid #e9ecef'
                                                                        }}
                                                                    >
                                                                        <Avatar
                                                                            size="small"
                                                                            style={{ 
                                                                                marginRight: 8,
                                                                                backgroundColor: '#1890ff'
                                                                            }}
                                                                        >
                                                                            {memberInfo.initials || getMemberInitials(memberInfo.fullName)}
                                                                        </Avatar>
                                                                        <Text style={{ fontSize: '12px', fontWeight: 500 }}>
                                                                            {memberInfo.fullName}
                                                                        </Text>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {allNotes && allNotes.length > 0 && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            marginBottom: 6,
                                                            padding: '6px 8px',
                                                            backgroundColor: '#fff2e8',
                                                            borderRadius: '4px',
                                                            border: '1px solid #ffbb96'
                                                        }}>
                                                            <WarningOutlined style={{ 
                                                                color: '#fa8c16', 
                                                                marginRight: 6,
                                                                fontSize: '14px'
                                                            }} />
                                                            <Text style={{ 
                                                                fontSize: '13px', 
                                                                fontWeight: 600,
                                                                color: '#d46b08'
                                                            }}>
                                                                Error Notes ({allNotes.length})
                                                            </Text>
                                                        </div>
                                                        <div style={{ 
                                                            padding: '8px',
                                                            backgroundColor: '#fff7e6',
                                                            borderRadius: '6px',
                                                            border: '2px solid #ffd591',
                                                            boxShadow: '0 2px 4px rgba(250, 140, 22, 0.1)'
                                                        }}>
                                                            {allNotes.map((note, index) => (
                                                                <div 
                                                                    key={index}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'flex-start',
                                                                        padding: '8px 10px',
                                                                        backgroundColor: '#ffffff',
                                                                        borderRadius: '4px',
                                                                        marginBottom: index < allNotes.length - 1 ? 6 : 0,
                                                                        border: '1px solid #ffd591',
                                                                        fontSize: '12px',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                    }}
                                                                >
                                                                    <FileTextOutlined style={{ 
                                                                        color: '#fa8c16', 
                                                                        marginRight: 8,
                                                                        marginTop: 1,
                                                                        fontSize: '12px'
                                                                    }} />
                                                                    <Text style={{ 
                                                                        fontSize: '12px',
                                                                        lineHeight: '1.4',
                                                                        color: '#262626'
                                                                    }}>
                                                                        {note}
                                                                    </Text>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </Space>

                                            {/* Status Action Buttons */}
                                            <Divider style={{ margin: '16px 0 12px 0' }} />
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: 8, 
                                                justifyContent: 'center',
                                                padding: '8px 0'
                                            }}>
                                                <Button
                                                    size="small"
                                                    type={firstCard.status === 'requested' ? 'primary' : 'default'}
                                                    icon={<MessageOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRequestTextClick(firstCard);
                                                    }}
                                                    style={{
                                                        fontSize: '11px',
                                                        height: '28px',
                                                        borderRadius: '6px',
                                                        backgroundColor: firstCard.status === 'requested' ? '#fa8c16' : undefined,
                                                        borderColor: firstCard.status === 'requested' ? '#fa8c16' : undefined
                                                    }}
                                                >
                                                    Request
                                                </Button>
                                                
                                                {/* Only show Approved and Reject buttons for Admin and TS-Lead */}
                                                {canApproveReject && (
                                                    <>
                                                        <Button
                                                            size="small"
                                                            type={firstCard.status === 'approved' ? 'primary' : 'default'}
                                                            icon={<CheckCircleOutlined />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusUpdate(firstCard._id, 'approved');
                                                            }}
                                                            style={{
                                                                fontSize: '11px',
                                                                height: '28px',
                                                                borderRadius: '6px',
                                                                backgroundColor: firstCard.status === 'approved' ? '#52c41a' : undefined,
                                                                borderColor: firstCard.status === 'approved' ? '#52c41a' : undefined
                                                            }}
                                                        >
                                                            Approved
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            type={firstCard.status === 'rejected' ? 'primary' : 'default'}
                                                            icon={<CloseCircleOutlined />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusUpdate(firstCard._id, 'rejected');
                                                            }}
                                                            style={{
                                                                fontSize: '11px',
                                                                height: '28px',
                                                                borderRadius: '6px',
                                                                backgroundColor: firstCard.status === 'rejected' ? '#ff4d4f' : undefined,
                                                                borderColor: firstCard.status === 'rejected' ? '#ff4d4f' : undefined
                                                            }}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </Col>
            </Row>

            {/* Request Text Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageOutlined style={{ color: '#fa8c16' }} />
                        <span>Request Reject Card</span>
                    </div>
                }
                open={requestTextModalOpen}
                onCancel={handleRequestTextModalClose}
                onOk={handleRequestTextSubmit}
                okText="Submit Request"
                cancelText="Cancel"
                confirmLoading={requestTextLoading}
                okButtonProps={{
                    disabled: !requestText.trim(),
                    style: {
                        backgroundColor: '#fa8c16',
                        borderColor: '#fa8c16'
                    }
                }}
                width={600}
                style={{
                    top: 100
                }}
            >
                {selectedCardForRequest && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ 
                            padding: 12, 
                            backgroundColor: '#fff7e6', 
                            borderRadius: 8, 
                            border: '1px solid #ffd591',
                            marginBottom: 16
                        }}>
                            <Text strong style={{ color: '#d46b08', display: 'block', marginBottom: 4 }}>
                                Card: {selectedCardForRequest.cardName}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                ID: {selectedCardForRequest.cardId}
                            </Text>
                        </div>
                        
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Reason for rejecting the card?
                            </Text>
                            <Input.TextArea
                                value={requestText}
                                onChange={(e) => setRequestText(e.target.value)}
                                placeholder="Please describe what additional information, clarification, or details you need for this error card..."
                                rows={6}
                                maxLength={500}
                                showCount
                                style={{
                                    fontSize: '14px',
                                    lineHeight: 1.6
                                }}
                            />
                        </div>
                        
                        <div style={{ 
                            padding: 12, 
                            backgroundColor: '#f6ffed', 
                            borderRadius: 8, 
                            border: '1px solid #b7eb8f'
                        }}>
                            <Text style={{ color: '#389e0d', fontSize: '13px' }}>
                                💡 <strong>Tip:</strong> Note rõ thông tin và lý do để được reject card.
                            </Text>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Card Detail Modal */}
            <CardDetailModal
                open={modalOpen}
                onClose={handleModalClose}
                cardId={selectedCardId}
            />
        </div>
    );
};

export default ErrorCardPage;