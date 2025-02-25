import React from 'react';
import { Button } from '@mui/material';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Button 
      variant="outlined" 
      color="inherit" 
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;
