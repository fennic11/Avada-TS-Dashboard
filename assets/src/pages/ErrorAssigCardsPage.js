import React, { useState, useEffect } from 'react';
import { Table, Card, Avatar, Tag, Progress, Row, Col, Statistic, Typography, Timeline, Badge, DatePicker, Select, Space, Button, Modal, List, Divider, message } from 'antd';
import { TrophyOutlined, UserOutlined, CrownOutlined, StarOutlined, LineChartOutlined, CalendarOutlined, FilterOutlined, ClearOutlined, EyeOutlined, LinkOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import errorAssignCardApi from '../api/errorAssignCardApi';
import membersData from '../data/members.json';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ErrorAssigCardsPage = () => {
    const [errorAssignCards, setErrorAssignCards] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberCards, setMemberCards] = useState([]);

    useEffect(() => {
        const fetchErrorAssignCards = async () => {
            try {
                setLoading(true);
                const data = await errorAssignCardApi.getErrorAssignCards();
                console.log('Error assign cards:', data);
                setErrorAssignCards(data);
                setFilteredData(data);
            } catch (err) {
                setError(err.message || 'Failed to fetch error assign cards');
                console.error('Error fetching error assign cards:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchErrorAssignCards();
    }, []);

    // Filter function
    const applyFilters = () => {
        let filtered = [...errorAssignCards];

        // Filter by date range
        if (dateRange && dateRange.length === 2) {
            const startDate = dateRange[0].startOf('day');
            const endDate = dateRange[1].endOf('day');
            
            filtered = filtered.filter(item => {
                const itemDate = dayjs(item.date);
                return itemDate.isAfter(startDate) && itemDate.isBefore(endDate);
            });
        }

        // Filter by role
        if (selectedRole) {
            filtered = filtered.filter(item => {
                const member = getMemberById(item.idMemberAssigned);
                return member && member.role === selectedRole;
            });
        }

        setFilteredData(filtered);
    };

    // Clear filters
    const clearFilters = () => {
        setDateRange(null);
        setSelectedRole(null);
        setFilteredData(errorAssignCards);
    };

    // Apply filters when filter values change
    useEffect(() => {
        applyFilters();
    }, [dateRange, selectedRole, errorAssignCards]);

    // Function to map member data by ID
    const getMemberById = (memberId) => {
        return membersData.find(member => member.id === memberId) || null;
    };

    // Function to get member name or fallback
    const getMemberName = (memberId) => {
        const member = getMemberById(memberId);
        return member ? member.fullName || member.username || 'Unknown' : 'Unknown Member';
    };

    // Function to get member role
    const getMemberRole = (memberId) => {
        const member = getMemberById(memberId);
        return member ? member.role || 'N/A' : 'N/A';
    };

    // Function to get creator name
    const getCreatorName = (creatorId) => {
        const member = getMemberById(creatorId);
        return member ? member.fullName || member.username || 'Unknown' : 'Unknown Creator';
    };

    // Function to handle member click and show modal
    const handleMemberClick = (memberId) => {
        const member = getMemberById(memberId);
        if (!member) return;

        // Get all cards created by this member
        const cards = filteredData.filter(item => item.idMemberCreator === memberId);
        
        setSelectedMember(member);
        setMemberCards(cards);
        setModalVisible(true);
    };

    // Function to close modal
    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedMember(null);
        setMemberCards([]);
    };

    // Function to export member cards to Excel
    const exportToExcel = () => {
        if (!selectedMember || memberCards.length === 0) {
            message.warning('No data to export');
            return;
        }

        try {
            // Prepare CSV data
            const csvData = [
                ['Card Name', 'Card ID', 'Assigned To', 'Date', 'Trello Link']
            ];

            memberCards.forEach(item => {
                const assignedMember = getMemberById(item.idMemberAssigned);
                const assignedName = assignedMember ? assignedMember.fullName || assignedMember.username : 'Unknown';
                const trelloLink = item.card?.shortLink ? `https://trello.com/c/${item.card.shortLink}` : '';
                
                csvData.push([
                    item.card?.name || 'Unknown Card',
                    item.card?.idShort || 'N/A',
                    assignedName,
                    dayjs(item.date).format('DD/MM/YYYY HH:mm'),
                    trelloLink
                ]);
            });

            // Convert to CSV string
            const csvContent = csvData.map(row => 
                row.map(field => `"${field}"`).join(',')
            ).join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `error_assign_cards_${selectedMember.username || selectedMember.fullName}_${dayjs().format('YYYY-MM-DD')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            message.success('Data exported successfully!');
        } catch (error) {
            console.error('Error exporting data:', error);
            message.error('Failed to export data');
        }
    };

    // Function to create leaderboard data
    const createLeaderboard = () => {
        const creatorCounts = {};
        
        filteredData.forEach((item) => {
            const creatorId = item.idMemberCreator;
            
            if (creatorId) {
                if (!creatorCounts[creatorId]) {
                    creatorCounts[creatorId] = {
                        id: creatorId,
                        count: 0,
                        member: getMemberById(creatorId)
                    };
                }
                creatorCounts[creatorId].count++;
            }
        });

        // Convert to array and sort by count (descending)
        return Object.values(creatorCounts)
            .sort((a, b) => b.count - a.count)
            .map((item, index) => ({
                ...item,
                rank: index + 1
            }));
    };

    const leaderboardData = createLeaderboard();

    // Function to create chart data for daily assignments
    const createChartData = () => {
        const dailyCounts = {};
        
        filteredData.forEach((item) => {
            const date = new Date(item.date);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            if (!dailyCounts[dateKey]) {
                dailyCounts[dateKey] = {
                    date: dateKey,
                    count: 0,
                    displayDate: date.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    })
                };
            }
            dailyCounts[dateKey].count++;
        });

        // Convert to array and sort by date
        return Object.values(dailyCounts)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const chartData = createChartData();

    // Create timeline data for chart visualization
    const timelineData = chartData.map((item, index) => ({
        children: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Text strong>{item.displayDate}</Text>
                    <br />
                    <Text type="secondary">{item.count} cards assigned</Text>
                </div>
                <Badge 
                    count={item.count} 
                    style={{ backgroundColor: '#1890ff' }}
                    overflowCount={999}
                />
            </div>
        ),
        color: item.count > 5 ? '#52c41a' : item.count > 2 ? '#faad14' : '#ff4d4f',
    }));

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Text>Loading error assign cards...</Text>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Text type="danger">Error: {error}</Text>
            </div>
        );
    }

    // Define table columns for Ant Design Table
    const columns = [
        {
            title: 'Rank',
            dataIndex: 'rank',
            key: 'rank',
            width: 80,
            render: (rank) => {
                if (rank === 1) {
                    return <CrownOutlined style={{ color: '#FFD700', fontSize: '20px' }} />;
                } else if (rank === 2) {
                    return <StarOutlined style={{ color: '#C0C0C0', fontSize: '20px' }} />;
                } else if (rank === 3) {
                    return <TrophyOutlined style={{ color: '#CD7F32', fontSize: '20px' }} />;
                }
                return <span style={{ fontWeight: 'bold', color: '#666' }}>#{rank}</span>;
            },
        },
        {
            title: 'Creator',
            dataIndex: 'member',
            key: 'creator',
            render: (member, record) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                        size={40} 
                        icon={<UserOutlined />}
                        style={{ 
                            backgroundColor: member ? '#1890ff' : '#d9d9d9',
                            marginRight: '12px'
                        }}
                    >
                        {member ? (member.initials || member.fullName?.charAt(0) || '?') : '?'}
                    </Avatar>
                    <div>
                        <div 
                            style={{ 
                                fontWeight: 'bold', 
                                marginBottom: '2px',
                                cursor: 'pointer',
                                color: '#1890ff',
                                textDecoration: 'underline'
                            }}
                            onClick={() => handleMemberClick(record.id)}
                        >
                            {member ? member.fullName || member.username : 'Unknown'}
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {member ? member.kpiName || member.username : 'N/A'}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'member',
            key: 'role',
            render: (member) => {
                const role = member?.role || 'N/A';
                const colorMap = {
                    'TS': 'blue',
                    'CS': 'green',
                    'ba': 'purple',
                    'pm': 'orange',
                    'admin': 'red',
                };
                return (
                    <Tag color={colorMap[role] || 'default'}>
                        {role}
                    </Tag>
                );
            },
        },
        {
            title: 'Total Cards Created',
            dataIndex: 'count',
            key: 'count',
            render: (count) => (
                <Statistic 
                    value={count} 
                    suffix="cards" 
                    valueStyle={{ fontSize: '18px', fontWeight: 'bold' }}
                />
            ),
        },
        {
            title: 'Percentage',
            dataIndex: 'percentage',
            key: 'percentage',
            render: (percentage) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Progress 
                        percent={parseFloat(percentage)} 
                        size="small" 
                        style={{ flex: 1, marginRight: '8px' }}
                        strokeColor="#1890ff"
                    />
                    <Text style={{ minWidth: '40px' }}>{percentage}%</Text>
                </div>
            ),
        },
    ];

    // Prepare data for Ant Design Table
    const tableData = leaderboardData.map((item) => {
        const percentage = filteredData.length > 0 
            ? ((item.count / filteredData.length) * 100).toFixed(1)
            : 0;
        
        return {
            key: item.id,
            ...item,
            percentage,
        };
    });

    // Get unique roles for filter
    const availableRoles = [...new Set(
        errorAssignCards
            .map(item => {
                const member = getMemberById(item.idMemberAssigned);
                return member ? member.role : null;
            })
            .filter(role => role !== null)
    )];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ marginBottom: '24px' }}>
                Error Assign Cards Analytics
            </Title>
            
            {/* Filter Section */}
            <Card style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FilterOutlined />
                        <Text strong>Filters:</Text>
                    </div>
                    
                    <Space>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text>Date Range:</Text>
                            <RangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                format="DD/MM/YYYY"
                                placeholder={['Start Date', 'End Date']}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text>Assigned Role:</Text>
                            <Select
                                value={selectedRole}
                                onChange={setSelectedRole}
                                placeholder="Select Role"
                                style={{ width: 150 }}
                                allowClear
                            >
                                {availableRoles.map(role => (
                                    <Option key={role} value={role}>
                                        <Tag color={
                                            role === 'TS' ? 'blue' :
                                            role === 'CS' ? 'green' :
                                            role === 'ba' ? 'purple' :
                                            role === 'pm' ? 'orange' :
                                            role === 'admin' ? 'red' : 'default'
                                        }>
                                            {role}
                                        </Tag>
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        
                        <Button 
                            icon={<ClearOutlined />} 
                            onClick={clearFilters}
                            type="default"
                        >
                            Clear Filters
                        </Button>
                    </Space>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                    <Text type="secondary">
                        Showing {filteredData.length} of {errorAssignCards.length} records
                    </Text>
                </div>
            </Card>
            
            {/* Chart Section */}
            {chartData.length > 0 && (
                <Card 
                    title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            Timeline tổng số lượt assign theo ngày
                        </div>
                    }
                    style={{ marginBottom: '24px' }}
                >
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <Timeline
                            mode="left"
                            items={timelineData}
                        />
                    </div>
                </Card>
            )}

            {/* Statistics Cards */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Tổng số cards (filtered)"
                            value={filteredData.length}
                            suffix="cards"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Số ngày có activity"
                            value={chartData.length}
                            suffix="ngày"
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Trung bình/ngày"
                            value={chartData.length > 0 ? (filteredData.length / chartData.length).toFixed(1) : 0}
                            suffix="cards"
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>
            </Row>
            
            {/* Leaderboard Section */}
            <Card 
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TrophyOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                        Creator Leaderboard
                    </div>
                }
            >
                {leaderboardData.length > 0 ? (
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        pagination={false}
                        loading={loading}
                        size="middle"
                        rowClassName={(record, index) => 
                            index < 3 ? 'top-three-row' : ''
                        }
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <Text type="secondary">No error assign cards found</Text>
                    </div>
                )}
            </Card>

            {/* Member Details Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                            size={32} 
                            icon={<UserOutlined />}
                            style={{ 
                                backgroundColor: '#1890ff',
                                marginRight: '12px'
                            }}
                        >
                            {selectedMember ? (selectedMember.initials || selectedMember.fullName?.charAt(0) || '?') : '?'}
                        </Avatar>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                {selectedMember ? selectedMember.fullName || selectedMember.username : 'Unknown'}
                            </div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {selectedMember ? selectedMember.kpiName || selectedMember.username : 'N/A'}
                            </Text>
                        </div>
                    </div>
                }
                open={modalVisible}
                onCancel={handleCloseModal}
                footer={null}
                width={800}
                style={{ top: 20 }}
            >
                {selectedMember && (
                    <div>
                        {/* Member Info */}
                        <Card size="small" style={{ marginBottom: '16px' }}>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Statistic
                                        title="Role"
                                        value={selectedMember.role || 'N/A'}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="Total Cards Created"
                                        value={memberCards.length}
                                        suffix="cards"
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="Percentage"
                                        value={filteredData.length > 0 ? ((memberCards.length / filteredData.length) * 100).toFixed(1) : 0}
                                        suffix="%"
                                        valueStyle={{ color: '#fa8c16' }}
                                    />
                                </Col>
                            </Row>
                        </Card>

                        <Divider />

                        {/* Cards List */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <Title level={4} style={{ margin: 0 }}>
                                    <EyeOutlined style={{ marginRight: '8px' }} />
                                    Cards Created by {selectedMember.fullName || selectedMember.username}
                                </Title>
                                <Button
                                    type="primary"
                                    icon={<FileExcelOutlined />}
                                    onClick={exportToExcel}
                                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                >
                                    Export to Excel
                                </Button>
                            </div>
                            
                            <List
                                dataSource={memberCards}
                                renderItem={(item, index) => (
                                    <List.Item
                                        key={item._id || index}
                                        style={{
                                            border: '1px solid #f0f0f0',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            padding: '16px',
                                            backgroundColor: '#fafafa'
                                        }}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text strong style={{ fontSize: '14px' }}>
                                                        {item.card?.name || 'Unknown Card'}
                                                    </Text>
                                                    <Tag color="blue">#{item.card?.idShort || 'N/A'}</Tag>
                                                </div>
                                            }
                                            description={
                                                <div>
                                                    <div style={{ marginBottom: '8px' }}>
                                                        <Text type="secondary">
                                                            <CalendarOutlined style={{ marginRight: '4px' }} />
                                                            {dayjs(item.date).format('DD/MM/YYYY HH:mm')}
                                                        </Text>
                                                    </div>
                                                    
                                                    <div style={{ marginBottom: '8px' }}>
                                                        <Text strong>Assigned to: </Text>
                                                        <Tag color="green">
                                                            {getMemberName(item.idMemberAssigned)}
                                                        </Tag>
                                                    </div>
                                                    
                                                    {item.card?.shortLink && (
                                                        <div>
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                icon={<LinkOutlined />}
                                                                href={`https://trello.com/c/${item.card.shortLink}`}
                                                                target="_blank"
                                                                style={{ padding: 0, height: 'auto' }}
                                                            >
                                                                View on Trello
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                                locale={{ emptyText: 'No cards found' }}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ErrorAssigCardsPage;