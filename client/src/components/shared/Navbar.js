import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Box, 
  Menu, MenuItem, Badge, Avatar, useTheme, useMediaQuery,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  School,
  MenuBook,
  Assignment,
  Settings,
  Person,
  Group,
  Analytics,
  Add,
  Notifications,
  AdminPanelSettings,
  Class
} from '@mui/icons-material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';

const Navbar = ({ onMenuClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleTheme } = useAppTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuAnchor, setMenuAnchor] = useState(null);

  const getNavigationItems = () => {
    if (!isAuthenticated) return [
      { label: 'Login', path: '/login' },
      { label: 'Register', path: '/register' }
    ];

    const commonItems = [
      { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
      { label: 'Teams', path: '/classes', icon: <School /> }
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...commonItems,
          { label: 'Users', path: '/users', icon: <Group /> },
          { label: 'My Decks', path: '/decks', icon: <MenuBook /> },
          { label: 'System', path: '/admin/system', icon: <AdminPanelSettings /> }
        ];
      case 'teacher':
        return [
          ...commonItems,
          { label: 'My Decks', path: '/decks', icon: <MenuBook /> },
          { label: 'Assignments', path: '/assignments', icon: <Assignment /> }
        ];
      default: // student
        return [
          ...commonItems,
          { label: 'My Decks', path: '/decks', icon: <MenuBook /> },
          { label: 'Due Tasks', path: '/assignments/due', icon: <Assignment /> }
        ];
    }
  };

  const navigationItems = getNavigationItems();

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {isMobile && isAuthenticated && (
          <IconButton color="inherit" edge="start" onClick={onMenuClick}>
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          component="div"
          sx={{ cursor: 'pointer', flexGrow: 0 }}
          onClick={() => navigate('/')}
        >
          FlashMat
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  textTransform: 'none',
                  borderBottom: location.pathname === item.path ? 2 : 0
                }}
              >
                {item.label}
              </Button>
            ))}

            {isAuthenticated && (
              <>
                <IconButton color="inherit" onClick={toggleTheme}>
                  {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>

                <IconButton 
                  color="inherit"
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>

                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                >
                  <MenuItem onClick={() => { setMenuAnchor(null); navigate('/profile'); }}>
                    <Person sx={{ mr: 1 }} /> Profile
                  </MenuItem>
                  <MenuItem onClick={() => { setMenuAnchor(null); navigate('/settings'); }}>
                    <Settings sx={{ mr: 1 }} /> Settings
                  </MenuItem>
                  {user?.role === 'teacher' && (
                    <MenuItem onClick={() => { setMenuAnchor(null); navigate('/classes/new'); }}>
                      <Add sx={{ mr: 1 }} /> Create Class
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
