import * as React from 'react';
import {
  AppBar, Box, Toolbar, IconButton, Typography, Menu, Container,
  Button, MenuItem, Avatar, Tooltip, Badge, List, ListItem,
  ListItemText, ListItemAvatar, Divider, CircularProgress, Snackbar, Alert, Drawer, ListItemButton, ListItemIcon
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimelineIcon from '@mui/icons-material/Timeline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import BarChartIcon from '@mui/icons-material/BarChart';
import ChatIcon from '@mui/icons-material/Chat';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import logo from '../Logo có nền/Logo có nền/Avada_Brandmark_PhienBanMauChinhTrenNenSang.jpg';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/usersApi';
import { getMemberNotifications, markAllNotificationsAsRead, updateNotificationStatus } from '../api/trelloApi';
import { formatDistanceToNow } from 'date-fns';
import CardDetailModal from './CardDetailModal';
import {ROLES, ROLE_PERMISSIONS, getAccessibleTabs } from '../utils/roles';

// Convert TABS to menu items format
const getMenuItems = (role) => {
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return [];

  return rolePermissions.allowedTabs.map(tab => ({
    label: tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    path: `/${tab}`
  }));
};

// Hàm chọn icon theo path/tab
const getTabIcon = (path) => {
  if (path.includes('bugs')) return <BugReportIcon />;
  if (path.includes('issues')) return <AssignmentIcon />;
  if (path.includes('resolution-time')) return <TimelineIcon />;
  if (path.includes('data-kpi')) return <BarChartIcon />;
  if (path.includes('TS-lead-workspace')) return <WorkspacePremiumIcon />;
  if (path.includes('TS-workspace')) return <GroupIcon />;
  if (path.includes('ba-page')) return <AssignmentIcon />;
  if (path.includes('slack')) return <ChatIcon />;
  if (path.includes('leaderboard')) return <EmojiEventsIcon />;
  if (path.includes('plan-ts-team')) return <GroupIcon />;
  if (path.includes('checkout')) return <CheckCircleIcon />;
  return <DashboardIcon />;
};

function ResponsiveAppBar({ sidebarOpen = true, onToggleSidebar, drawerWidth = 220 }) {
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const [anchorElNoti, setAnchorElNoti] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedCardId, setSelectedCardId] = React.useState(null);
  const [showNotification, setShowNotification] = React.useState(false);
  const [notificationMessage, setNotificationMessage] = React.useState({ title: '', content: '', board: '' });
  const [previousUnreadCount, setPreviousUnreadCount] = React.useState(0);
  const [filter, setFilter] = React.useState('unread'); // 'unread', 'read'
  const location = useLocation();

  // Get user role from localStorage
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || ROLES.BA;

  // Get accessible tabs based on user role

  // Filter menu items based on accessible tabs
  const currentMenuItems = getMenuItems(userRole);

  const MAIN_TABS_COUNT = 4; // Số tab chính muốn hiển thị
  const mainMenuItems = currentMenuItems.slice(0, MAIN_TABS_COUNT);
  const moreMenuItems = currentMenuItems.slice(MAIN_TABS_COUNT);
  const [anchorElMore, setAnchorElMore] = React.useState(null);

  React.useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Add interval for realtime updates
  React.useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Set up interval for updates every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleOpenNotiMenu = (event) => {
    setAnchorElNoti(event.currentTarget);
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  };

  const handleCloseNotiMenu = () => {
    setAnchorElNoti(null);
  };

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
            setNotificationMessage(getNotificationText(latestNotification));
            setShowNotification(true);
          }
        }
        setPreviousUnreadCount(currentUnreadCount);
        setNotifications(notis);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'commentCard':
        return '💬';
      case 'addedToCard':
        return '➕';
      case 'cardDueSoon':
        return '⏰';
      case 'changeCard':
        return '✏️';
      default:
        return '📌';
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
    handleCloseNotiMenu();
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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

  const filteredNotifications = React.useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => n.unread);
      case 'read':
        return notifications.filter(n => !n.unread);
      default:
        return notifications.filter(n => n.unread);
    }
  }, [notifications, filter]);

  return (
    <>
      {/* Sidebar dọc */}
      {sidebarOpen && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
              color: 'white',
              borderRight: 0
            }
          }}
          open
        >
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, justifyContent: 'space-between' }}>
            <img src={logo} alt="logo" height={40} style={{ borderRadius: 8 }} />
            <IconButton
              onClick={onToggleSidebar}
              sx={{ color: 'white', ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <List>
            {currentMenuItems.map((item, idx) => (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  color: 'white',
                  '&.Mui-selected': { background: 'rgba(255,255,255,0.08)' },
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
                  {getTabIcon(item.path)}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}
      {/* Header chỉ giữ lại thông báo và user menu, dịch sang phải nếu sidebarOpen */}
      <AppBar 
        position="sticky" 
        sx={{ 
          background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          width: sidebarOpen ? { sm: `calc(100% - ${drawerWidth}px)` } : '100%',
          ml: sidebarOpen ? `${drawerWidth}px` : 0
        }}
      >
        <Container maxWidth="xxl">
          <Toolbar 
            disableGutters 
            sx={{ 
              minHeight: { xs: '64px', md: '72px' },
              gap: 2,
              justifyContent: 'flex-end',
              position: 'relative'
            }}
          >
            {/* Nút toggle sidebar chỉ hiện khi sidebarOpen=false */}
            {!sidebarOpen && (
              <IconButton
                onClick={onToggleSidebar}
                sx={{
                  position: 'absolute',
                  left: 0,
                  color: 'white',
                  zIndex: 1201
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            {/* Notification menu */}
            <Box sx={{ flexGrow: 0, mr: 1 }}>
              <Tooltip title="Notifications">
                <IconButton 
                  onClick={handleOpenNotiMenu}
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Badge 
                    badgeContent={notifications.filter(n => n.unread).length} 
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        right: -3,
                        top: 3,
                        border: '2px solid #06038D',
                        padding: '0 4px',
                      },
                    }}
                  >
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                anchorEl={anchorElNoti}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElNoti)}
                onClose={handleCloseNotiMenu}
                PaperProps={{
                  sx: {
                    width: 400,
                    maxHeight: 500,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    '& .MuiList-root': {
                      py: 0
                    }
                  }
                }}
              >
                <Box sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                  color: 'white'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2 
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Notifications
                    </Typography>
                    <Button
                      startIcon={<CheckIcon />}
                      onClick={handleMarkAllAsRead}
                      disabled={!notifications.some(n => n.unread)}
                      sx={{
                        color: notifications.some(n => n.unread) ? 'white' : 'rgba(255,255,255,0.5)',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.1)'
                        },
                        '&.Mui-disabled': {
                          color: 'rgba(255,255,255,0.3)'
                        }
                      }}
                    >
                      Mark all as read
                    </Button>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1,
                    '& .MuiButton-root': {
                      borderRadius: 1,
                      px: 2,
                      py: 0.5,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      transition: 'all 0.2s'
                    }
                  }}>
                    <Button
                      size="small"
                      variant={filter === 'unread' ? 'contained' : 'text'}
                      onClick={() => setFilter('unread')}
                      sx={{
                        color: filter === 'unread' ? 'primary.main' : 'rgba(255,255,255,0.8)',
                        bgcolor: filter === 'unread' ? 'white' : 'transparent',
                        '&:hover': {
                          bgcolor: filter === 'unread' ? 'white' : 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      Unread
                    </Button>
                    <Button
                      size="small"
                      variant={filter === 'read' ? 'contained' : 'text'}
                      onClick={() => setFilter('read')}
                      sx={{
                        color: filter === 'read' ? 'primary.main' : 'rgba(255,255,255,0.8)',
                        bgcolor: filter === 'read' ? 'white' : 'transparent',
                        '&:hover': {
                          bgcolor: filter === 'read' ? 'white' : 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      Read
                    </Button>
                  </Box>
                </Box>
                {loading ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    p: 4,
                    minHeight: 200
                  }}>
                    <CircularProgress size={32} sx={{ color: 'primary.main' }} />
                  </Box>
                ) : filteredNotifications.length === 0 ? (
                  <Box sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary'
                  }}>
                    <NotificationsIcon sx={{ fontSize: 48, mb: 2, color: 'text.disabled' }} />
                    <Typography variant="body1">
                      No {filter} notifications
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {filteredNotifications.map((notification, index) => {
                      const notificationText = getNotificationText(notification);
                      return (
                        <React.Fragment key={notification.id}>
                          <ListItem 
                            alignItems="flex-start"
                            onClick={() => handleNotificationClick(notification.data.card.id, notification.id, notification.unread)}
                            sx={{
                              cursor: 'pointer',
                              py: 2,
                              px: 2,
                              transition: 'all 0.2s',
                              bgcolor: notification.unread ? 'rgba(6, 3, 141, 0.05)' : 'transparent',
                              '&:hover': {
                                bgcolor: notification.unread ? 'rgba(6, 3, 141, 0.1)' : 'action.hover'
                              }
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar 
                                src={notification.memberCreator?.avatarUrl}
                                alt={notification.memberCreator?.initials || '?'}
                                sx={{ 
                                  bgcolor: 'primary.main',
                                  width: 40,
                                  height: 40,
                                  fontSize: '1rem'
                                }}
                              >
                                {notification.memberCreator?.initials || '?'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography
                                  component="div"
                                  variant="body2"
                                  sx={{ 
                                    fontWeight: 500,
                                    color: notification.unread ? 'primary.main' : 'text.primary',
                                    mb: 0.5
                                  }}
                                >
                                  {notificationText.title}
                                  {notificationText.content && (
                                    <Typography
                                      component="div"
                                      variant="body2"
                                      sx={{ 
                                        color: 'text.secondary',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.4,
                                        mt: 0.5
                                      }}
                                    >
                                      {notificationText.content}
                                    </Typography>
                                  )}
                                </Typography>
                              }
                              secondary={
                                <Typography
                                  component="div"
                                  variant="caption"
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1, 
                                    mt: 1,
                                    color: 'text.secondary',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  <span>
                                    {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
                                  </span>
                                  <span>•</span>
                                  <span>{notificationText.board}</span>
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < filteredNotifications.length - 1 && (
                            <Divider sx={{ mx: 2 }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Menu>
            </Box>
            {/* User menu */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar 
                    alt={user?.name || 'User'} 
                    src="/static/images/avatar/2.jpg"
                    sx={{ 
                      bgcolor: 'white',
                      color: '#06038D',
                      fontWeight: 'bold'
                    }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem onClick={handleCloseUserMenu}>
                  <Typography textAlign="center">{user?.name || 'User'}</Typography>
                </MenuItem>
                <MenuItem onClick={handleCloseUserMenu}>
                  <Typography textAlign="center">{user?.email || ''}</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Typography textAlign="center" color="error">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Card Detail Modal */}
      <CardDetailModal
        open={Boolean(selectedCardId)}
        onClose={() => setSelectedCardId(null)}
        cardId={selectedCardId}
      />

      {/* Push Notification */}
      <Snackbar
        open={showNotification}
        autoHideDuration={6000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          mt: '60px',
          zIndex: 9999
        }}
      >
        <Alert 
          onClose={() => setShowNotification(false)} 
          severity="info"
          sx={{ 
            width: '100%',
            bgcolor: 'white',
            color: 'text.primary',
            '& .MuiAlert-icon': {
              color: 'primary.main'
            }
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {notificationMessage.title}
            </Typography>
            {notificationMessage.content && (
              <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                {notificationMessage.content}
              </Typography>
            )}
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
              {notificationMessage.board}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
}

export default ResponsiveAppBar;
