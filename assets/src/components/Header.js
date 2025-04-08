import * as React from 'react';
import {
  AppBar, Box, Toolbar, IconButton, Typography, Menu, Container,
  Button, MenuItem, Avatar, Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import logo from '../Logo có nền/Logo có nền/Avada_Brandmark_PhienBanMauChinhTrenNenSang.jpg';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/usersApi';

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
  const [user, setUser] = React.useState(null);
  const location = useLocation();

  React.useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);

  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
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
  );
}

export default ResponsiveAppBar;
