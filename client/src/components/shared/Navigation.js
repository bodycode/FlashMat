import React, { useState } from 'react';
import { Box, MenuItem, ListItemIcon, Dialog } from '@mui/material';
import { Settings } from '@mui/icons-material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import AccountSettings from '../admin/AccountSettings';

const Navigation = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box>
      <Navbar 
        onMenuClick={toggleSidebar}
        userMenuItems={
          <MenuItem onClick={() => setShowSettings(true)}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Account Settings
          </MenuItem>
        }
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="md"
        fullWidth
      >
        <AccountSettings 
          user={user} 
          onUpdate={() => {
            setShowSettings(false);
            // Refresh user data if needed
          }}
        />
      </Dialog>
    </Box>
  );
};

export default Navigation;
