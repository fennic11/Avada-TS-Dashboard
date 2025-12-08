import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Badge,
  Dropdown,
  Typography,
  notification,
  Drawer
} from 'antd';
import {
  DashboardOutlined,
  BugOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  TrophyOutlined,
  MessageOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/usersApi';
import { getMemberNotifications, markAllNotificationsAsRead, updateNotificationStatus } from '../api/trelloApi';
import { formatDistanceToNow } from 'date-fns';
import CardDetailModal from './CardDetailModal';
import { ROLES, ROLE_PERMISSIONS } from '../utils/roles';
import logo from '../Logo có nền/Logo có nền/Avada_Brandmark_PhienBanMauChinhTrenNenSang.jpg';

const { Header: AntHeader, Sider } = Layout;
const { Text, Title } = Typography;

// Convert TABS to menu items format
const getMenuItems = (role) => {
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return [];

  return rolePermissions.allowedTabs.map(tab => ({
    key: `/${tab}`,
    label: (
      <Link to={`/${tab}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </Link>
    ),
    icon: getTabIcon(tab),
    path: `/${tab}`
  }));
};

// Hàm chọn icon theo tab
const getTabIcon = (tab) => {
  if (tab.includes('bugs')) return <BugOutlined />;
  if (tab.includes('issues')) return <FileTextOutlined />;
  if (tab.includes('resolution-time')) return <ClockCircleOutlined />;
  if (tab.includes('data-kpi')) return <BarChartOutlined />;
  if (tab.includes('TS-lead-workspace')) return <CrownOutlined />;
  if (tab.includes('TS-workspace')) return <TeamOutlined />;
  if (tab.includes('ba-page')) return <FileTextOutlined />;
  if (tab.includes('slack')) return <MessageOutlined />;
  if (tab.includes('leaderboard')) return <TrophyOutlined />;
  if (tab.includes('plan-ts-team')) return <TeamOutlined />;
  if (tab.includes('checkout')) return <CheckCircleOutlined />;
  if (tab.includes('kpi-ts-team')) return <DollarOutlined />;
  if (tab.includes('live-action')) return <ThunderboltOutlined />;
  return <DashboardOutlined />;
};

function ResponsiveAppBar({ sidebarOpen = true, onToggleSidebar, drawerWidth = 220 }) {
  const [collapsed, setCollapsed] = useState(!sidebarOpen);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [filter, setFilter] = useState('unread'); // 'unread', 'read'
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const location = useLocation();

  // Get user role from localStorage
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || ROLES.BA;

  // Get accessible tabs based on user role
  const currentMenuItems = getMenuItems(userRole);

  const MAIN_TABS_COUNT = 4; // Số tab chính muốn hiển thị
  const mainMenuItems = currentMenuItems.slice(0, MAIN_TABS_COUNT);
  const moreMenuItems = currentMenuItems.slice(MAIN_TABS_COUNT);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-collapse sidebar on mobile
      if (width < 768) {
        setCollapsed(true);
        setDrawerVisible(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Add interval for realtime updates
  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Set up interval for updates every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const notis = await getMemberNotifications();
      if (notis) {
        // Check for new unread notifications
        const currentUnreadCount = notis.filter(n => n.unread).length;
        if (currentUnreadCount > previousUnreadCount) {
          const newNotifications = notis.filter(n => n.unread).slice(0, currentUnreadCount - previousUnreadCount);
          const latestNotification = newNotifications[0];
          if (latestNotification) {
            const notificationText = getNotificationText(latestNotification);
            notification.info({
              message: notificationText.title,
              description: notificationText.content,
              placement: 'topRight',
              duration: 6,
            });
          }
        }
        setPreviousUnreadCount(currentUnreadCount);
        setNotifications(notis);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getNotificationText = (notification) => {
    const { type, data, memberCreator } = notification;
    const creatorName = memberCreator?.fullName || 'Someone';
    switch (type) {
      case 'commentCard':
        return {
          title: `${creatorName} commented on "${data.card.name}"`,
          content: data.text,
          board: data.board.name
        };
      case 'mentionedOnCard':
        return {
          title: `${creatorName} mentioned you on "${data.card.name}"`,
          content: data.text,
          board: data.board.name
        };
      case 'addedToCard':
        return {
          title: `${creatorName} added you to card`,
          content: data.card.name,
          board: data.board.name
        };
      case 'cardDueSoon':
        return {
          title: 'Card due soon',
          content: data.card.name,
          board: data.board.name
        };
      case 'changeCard':
        return {
          title: `${creatorName} updated card`,
          content: data.card.name,
          board: data.board.name
        };
      default:
        return {
          title: notification.type,
          content: '',
          board: ''
        };
    }
  };

  const handleNotificationClick = async (cardId, notificationId, isUnread) => {
    if (isUnread) {
      try {
        const updatedNotification = await updateNotificationStatus(notificationId, true);
        if (updatedNotification) {
          setNotifications(prevNotifications => 
            prevNotifications.map(notification => 
              notification.id === notificationId 
                ? { ...notification, unread: false }
                : notification
            )
          );
          setPreviousUnreadCount(prev => prev - 1);
        }
      } catch (error) {
        console.error('Error updating notification status:', error);
      }
    }
    setSelectedCardId(cardId);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setDrawerVisible(!drawerVisible);
    } else {
      setCollapsed(!collapsed);
      onToggleSidebar && onToggleSidebar();
    }
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const success = await markAllNotificationsAsRead();
      if (success) {
        // Update local notifications state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({
            ...notification,
            unread: false
          }))
        );
        setPreviousUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => n.unread);
      case 'read':
        return notifications.filter(n => !n.unread);
      default:
        return notifications.filter(n => n.unread);
    }
  }, [notifications, filter]);

  const notificationItems = [
    {
      key: 'header',
      label: (
        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)', 
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellOutlined style={{ fontSize: '18px' }} />
              <Title level={5} style={{ color: 'white', margin: 0, fontWeight: 600 }}>
                Notifications
              </Title>
              <Badge 
                count={notifications.filter(n => n.unread).length} 
                size="small"
                style={{ 
                  backgroundColor: '#ff6b6b',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              />
            </div>
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={handleMarkAllAsRead}
              disabled={!notifications.some(n => n.unread)}
              style={{
                color: notifications.some(n => n.unread) ? 'white' : 'rgba(255,255,255,0.5)',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 500
              }}
            >
              Mark all read
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="small"
              type={filter === 'unread' ? 'primary' : 'text'}
              onClick={() => setFilter('unread')}
              style={{ 
                color: filter === 'unread' ? '#06038D' : 'rgba(255,255,255,0.9)',
                borderRadius: '6px',
                fontWeight: 500,
                border: filter === 'unread' ? '1px solid white' : 'none'
              }}
            >
              Unread ({notifications.filter(n => n.unread).length})
            </Button>
            <Button
              size="small"
              type={filter === 'read' ? 'primary' : 'text'}
              onClick={() => setFilter('read')}
              style={{ 
                color: filter === 'read' ? '#06038D' : 'rgba(255,255,255,0.9)',
                borderRadius: '6px',
                fontWeight: 500,
                border: filter === 'read' ? '1px solid white' : 'none'
              }}
            >
              Read ({notifications.filter(n => !n.unread).length})
            </Button>
          </div>
        </div>
      ),
      disabled: true,
    },
    ...filteredNotifications.map((notification) => {
      const notificationText = getNotificationText(notification);
      const isUnread = notification.unread;
      
      return {
        key: notification.id,
        label: (
          <div
            style={{
              padding: '16px',
              cursor: 'pointer',
              backgroundColor: isUnread ? 'rgba(6, 3, 141, 0.08)' : 'transparent',
              borderLeft: isUnread ? '4px solid #06038D' : '4px solid transparent',
              borderRadius: '8px',
              margin: '8px 12px',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(0,0,0,0.05)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isUnread ? 'rgba(6, 3, 141, 0.12)' : 'rgba(0,0,0,0.02)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isUnread ? 'rgba(6, 3, 141, 0.08)' : 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => handleNotificationClick(notification.data.card.id, notification.id, notification.unread)}
          >
            {/* Unread indicator */}
            {isUnread && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '8px',
                height: '8px',
                                 backgroundColor: '#06038D',
                 borderRadius: '50%',
                 boxShadow: '0 0 0 2px rgba(6, 3, 141, 0.2)'
              }} />
            )}
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Avatar
                src={notification.memberCreator?.avatarUrl}
                size="large"
                style={{ 
                  backgroundColor: '#06038D',
                  border: '2px solid rgba(6, 3, 141, 0.2)',
                  flexShrink: 0
                }}
              >
                {notification.memberCreator?.initials || '?'}
              </Avatar>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <Text
                    strong={isUnread}
                    style={{ 
                      color: isUnread ? '#06038D' : '#333',
                      fontSize: '14px',
                      fontWeight: isUnread ? 600 : 500,
                      lineHeight: 1.4
                    }}
                  >
                    {notificationText.title}
                  </Text>
                </div>
                
                {notificationText.content && (
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: '13px',
                      lineHeight: 1.4,
                      color: '#666',
                      display: 'block',
                      marginBottom: '6px'
                    }}
                  >
                    {notificationText.content}
                  </Text>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '11px',
                  color: '#999'
                }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px'
                  }}>
                    <ClockCircleOutlined style={{ fontSize: '10px' }} />
                    {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
                  </span>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px'
                  }}>
                    <FileTextOutlined style={{ fontSize: '10px' }} />
                    {notificationText.board}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ),
      };
    }),
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '8px 16px' }}>
          <Text strong>{user?.name || 'User'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{user?.email || ''}</Text>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  // Render sidebar content
  const renderSidebarContent = () => (
    <>
      {/* Logo Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: '70px',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        flexDirection: 'row',
        gap: '8px',
        padding: '0 16px'
      }}
      onClick={() => {
        if (isMobile) {
          setDrawerVisible(false);
        } else {
          setCollapsed(!collapsed);
          onToggleSidebar && onToggleSidebar();
        }
      }}
      >
        <img 
          src={logo} 
          alt="logo" 
          height={32} 
          style={{ borderRadius: 8 }} 
        />
        {(!collapsed || isMobile) && (
          <Text style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: 'white',
            whiteSpace: 'nowrap'
          }}>
            Avada TS Team
          </Text>
        )}
      </div>
      
      {/* Menu Section */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={currentMenuItems}
          style={{
            background: 'transparent',
            border: 'none'
          }}
          onClick={() => {
            if (isMobile) {
              setDrawerVisible(false);
            }
          }}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={drawerWidth}
          style={{
            background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
          }}
        >
          {renderSidebarContent()}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          closable={false}
          onClose={handleDrawerClose}
          open={drawerVisible}
          width={280}
          bodyStyle={{
            padding: 0,
            background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          style={{
            zIndex: 1001
          }}
        >
          {renderSidebarContent()}
        </Drawer>
      )}

      {/* Header */}
      <AntHeader
        style={{
          background: 'white',
          padding: isMobile ? '0 16px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '70px',
          position: 'fixed',
          top: 0,
          right: 0,
          left: isMobile ? 0 : (collapsed ? 80 : drawerWidth),
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'left 0.2s',
          overflow: 'visible'
        }}
      >
        {/* Left side - Mobile menu button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={handleToggleSidebar}
              style={{
                fontSize: '18px',
                height: '44px',
                width: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 3, 141, 0.05)',
                border: '1px solid rgba(6, 3, 141, 0.1)',
                color: '#06038D',
                marginRight: '12px'
              }}
            />
          )}
          {!isMobile && (
            <div></div>
          )}
        </div>

        {/* Right side - Notifications and Account */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '8px' : '16px',
          minWidth: 0,
          overflow: 'visible'
        }}>
          {/* Notification Dropdown */}
          <div style={{ position: 'relative', zIndex: 1001, display: 'inline-block' }}>
            <Dropdown
              menu={{ items: notificationItems }}
              placement={isMobile ? "bottomLeft" : "bottomRight"}
              trigger={['click']}
              getPopupContainer={() => document.body}
              overlayStyle={{ 
                width: isMobile ? Math.min(420, window.innerWidth - 32) : 420, 
                maxHeight: 600,
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)',
                position: 'fixed'
              }}
              onOpenChange={(open) => {
                if (open) {
                  setLoading(true);
                  fetchNotifications().finally(() => setLoading(false));
                }
              }}
            >
              <Badge 
                count={notifications.filter(n => n.unread).length} 
                size="small"
                style={{
                  backgroundColor: '#ff6b6b',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(255, 107, 107, 0.3)'
                }}
              >
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  style={{ 
                    fontSize: isMobile ? '16px' : '18px',
                    height: isMobile ? '40px' : '44px',
                    width: isMobile ? '40px' : '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    flexShrink: 0,
                    backgroundColor: 'rgba(6, 3, 141, 0.05)',
                    border: '1px solid rgba(6, 3, 141, 0.1)',
                    transition: 'all 0.2s ease',
                    color: '#06038D'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.backgroundColor = 'rgba(6, 3, 141, 0.1)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.backgroundColor = 'rgba(6, 3, 141, 0.05)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                />
              </Badge>
            </Dropdown>
          </div>

          {/* User Account Dropdown */}
          <Dropdown
            menu={{ items: userMenuItems }}
            placement={isMobile ? "bottomLeft" : "bottomRight"}
            trigger={['click']}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '4px' : '8px',
              padding: isMobile ? '4px' : '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              maxWidth: isMobile ? '150px' : '200px',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Avatar
                src={user?.picture}
                size={isMobile ? "small" : "small"}
                style={{ 
                  backgroundColor: '#06038D',
                  color: 'white',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </div>
          </Dropdown>
        </div>
      </AntHeader>

      {/* Card Detail Modal */}
      <CardDetailModal
        open={Boolean(selectedCardId)}
        onClose={() => setSelectedCardId(null)}
        cardId={selectedCardId}
      />
    </>
  );
}

export default ResponsiveAppBar;
