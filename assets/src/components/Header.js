import * as React from 'react';
import {
  AppBar, Box, Toolbar, IconButton, Typography, Menu, Container,
  Button, MenuItem, Avatar, Tooltip, Badge, List, ListItem,
  ListItemText, ListItemAvatar, Divider, CircularProgress, Snackbar, Alert
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckIcon from '@mui/icons-material/Check';
import logo from '../Logo có nền/Logo có nền/Avada_Brandmark_PhienBanMauChinhTrenNenSang.jpg';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/usersApi';
import { getMemberNotifications, markAllNotificationsAsRead, updateNotificationStatus } from '../api/trelloApi';
import { formatDistanceToNow } from 'date-fns';
import CardDetailModal from './CardDetailModal';

const pages = [
  { label: 'Bugs', path: '/bugs' },
  { label: 'Issues', path: '/issues' },
  { label: 'Resolution Time', path: '/resolution-time' },
  { label: 'KPI', path: '/data-kpi' },
  { label: 'TS Lead workspace', path: '/TS-lead-workspace'}
];

function ResponsiveAppBar() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);
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

  React.useEffect(() => {
    const currentUser = getCurrentUser();
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

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);

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
        const updatedNotification = await updateNotificationStatus(notificationId);
        console.log(updatedNotification);
        if (updatedNotification) {
          // Update local notifications state
          setNotifications(prevNotifications => 
            prevNotifications.map(notification => 
              notification.id === notificationId 
                ? { ...notification, unread: false }
                : notification
            )
          );
          // Update unread count
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
      <AppBar 
        position="sticky" 
        sx={{ 
          background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        <Container maxWidth="xxl">
          <Toolbar 
            disableGutters 
            sx={{ 
              minHeight: { xs: '64px', md: '72px' },
              gap: 2
            }}
          >
            {/* Logo desktop */}
            <Link to="/">
              <Box 
                sx={{ 
                  display: { xs: 'none', md: 'flex' }, 
                  alignItems: 'center',
                  mr: 3
                }}
              >
                <img 
                  src={logo} 
                  alt="logo" 
                  height={45} 
                  style={{ 
                    borderRadius: 8,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }} 
                />
              </Box>
            </Link>

            {/* Mobile menu */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
              <IconButton
                size="large"
                onClick={handleOpenNavMenu}
                sx={{ 
                  color: 'white',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchorElNav}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiPaper-root': {
                    borderRadius: 2,
                    mt: 1,
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                  }
                }}
              >
                {pages.map((page) => (
                  <MenuItem 
                    key={page.label} 
                    onClick={handleCloseNavMenu}
                    selected={location.pathname === page.path}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      '&.Mui-selected': {
                        backgroundColor: '#f0f4ff',
                        color: '#06038D',
                        '&:hover': {
                          backgroundColor: '#e5e9ff'
                        }
                      }
                    }}
                  >
                    <Link to={page.path} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Typography>{page.label}</Typography>
                    </Link>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Logo mobile */}
            <Link to="/">
              <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                <img 
                  src={logo} 
                  alt="logo" 
                  height={40} 
                  style={{ borderRadius: 8 }} 
                />
              </Box>
            </Link>

            {/* Desktop menu */}
            <Box 
              sx={{ 
                flexGrow: 1, 
                display: { xs: 'none', md: 'flex' }, 
                gap: 1
              }}
            >
              {pages.map((page) => (
                <Button
                  key={page.label}
                  component={Link}
                  to={page.path}
                  onClick={handleCloseNavMenu}
                  sx={{
                    px: 2,
                    py: 1,
                    color: 'white',
                    position: 'relative',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 6,
                      left: '50%',
                      width: location.pathname === page.path ? '30%' : '0%',
                      height: '2px',
                      backgroundColor: 'white',
                      transition: 'all 0.3s',
                      transform: 'translateX(-50%)'
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '&::after': {
                        width: '30%'
                      }
                    },
                    ...(location.pathname === page.path && {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    })
                  }}
                >
                  {page.label}
                </Button>
              ))}
            </Box>

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
                                <Box component="div">
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
                                  </Typography>
                                  {notificationText.content && (
                                    <Typography
                                      component="div"
                                      variant="body2"
                                      sx={{ 
                                        color: 'text.secondary',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.4
                                      }}
                                    >
                                      {notificationText.content}
                                    </Typography>
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box component="div" sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1, 
                                  mt: 1,
                                  color: 'text.secondary',
                                  fontSize: '0.75rem'
                                }}>
                                  <Typography component="span" variant="caption">
                                    {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
                                  </Typography>
                                  <Typography component="span" variant="caption">
                                    • {notificationText.board}
                                  </Typography>
                                </Box>
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
                  <Typography textAlign="center" color="error">Đăng xuất</Typography>
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
        sx={{ mt: '60px' }}
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
