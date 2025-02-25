import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import { Save, Password } from '@mui/icons-material';
import api from '../../services/api';

const AccountSettings = ({ user, onUpdate }) => {
  const [settings, setSettings] = useState({
    email: user.email,
    username: user.username,
    profile: {
      theme: user.profile?.theme || 'light',
      emailNotifications: user.profile?.emailNotifications ?? true
    }
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSettingsChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/users/settings', settings);
      setSuccess('Settings updated successfully');
      setError('');
      if (onUpdate) onUpdate(settings);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
      setSuccess('');
    }
  };

  const handlePasswordChange = async () => {
    if (password.new !== password.confirm) {
      setError('New passwords do not match');
      return;
    }

    try {
      await api.put('/users/password', {
        currentPassword: password.current,
        newPassword: password.new
      });
      setSuccess('Password updated successfully');
      setError('');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
      setSuccess('');
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Settings
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Username"
                  value={settings.username}
                  onChange={(e) => handleSettingsChange('username', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleSettingsChange('email', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.profile.emailNotifications}
                      onChange={(e) => handleSettingsChange('profile.emailNotifications', e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveSettings}
                  sx={{ mt: 2 }}
                >
                  Save Changes
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Password />}
                  onClick={handlePasswordChange}
                >
                  Update Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountSettings;
