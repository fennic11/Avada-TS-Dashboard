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
    Input
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
    StopOutlined
} from '@ant-design/icons';
import { getErrorCardsByMonth } from '../api/errorCards';
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
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);

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
            .sort((a, b) => a.label.localeCompare(b.label));
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

    const getTSLeaderboard = () => {
        const memberStats = {};
        
        // Chỉ lấy TS members từ members.json
        const tsMembers = membersData.filter(member => member.role === 'TS');
        
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
        
        // Đếm error cards cho từng TS member
        filteredCards.forEach(card => {
            if (card.members) {
                card.members.forEach(memberId => {
                    if (memberStats[memberId]) {
                        memberStats[memberId].errorCount += 1;
                        memberStats[memberId].totalPoints += (card.penaltyPoints || 0);
                        memberStats[memberId].cards.push(card);
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

    const filteredCards = filterCardsBySearch(filterCardsByMembers(errorCards));
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
                                <Col span={12}>
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
                                <Col span={12}>
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
                                            title="Total Error Cards"
                                            value={filteredCards.length}
                                            prefix={<ExclamationCircleOutlined />}
                                            valueStyle={{ color: '#1890ff' }}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card>
                                        <Statistic
                                            title="Total Penalty Points"
                                            value={filteredCards.reduce((total, card) => total + (card.penaltyPoints || 0), 0)}
                                            prefix={<TrophyOutlined />}
                                            valueStyle={{ color: '#ff4d4f' }}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card>
                                        <Statistic
                                            title="Average Points per Card"
                                            value={filteredCards.length > 0 ? (filteredCards.reduce((total, card) => total + (card.penaltyPoints || 0), 0) / filteredCards.length).toFixed(1) : 0}
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
                                                        <Paragraph
                                                            ellipsis={{ rows: 2 }}
                                                            style={{ margin: 0, fontWeight: 500 }}
                                                        >
                                                            {firstCard.cardName}
                                                        </Paragraph>
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
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </Col>
            </Row>

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