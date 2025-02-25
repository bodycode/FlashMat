import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Alert,
  Divider
} from '@mui/material';
import api from '../../services/api';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    allowNewRegistrations: true,
    maintenanceMode: false,
    maxClassSize: 30,
    maxDecksPerUser: 50,
    maxCardsPerDeck: 100
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/admin/settings');
        setSettings(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/admin/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          General Settings
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.allowNewRegistrations}
              onChange={(e) => setSettings({
                ...settings,
                allowNewRegistrations: e.target.checked
              })}
            />
          }
          label="Allow New Registrations"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({
                ...settings,
                maintenanceMode: e.target.checked
              })}
            />
          }
          label="Maintenance Mode"
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Limits
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Maximum Class Size"
            type="number"
            value={settings.maxClassSize}
            onChange={(e) => setSettings({
              ...settings,
              maxClassSize: parseInt(e.target.value)
            })}
          />

          <TextField
            label="Maximum Decks per User"
            type="number"
            value={settings.maxDecksPerUser}
            onChange={(e) => setSettings({
              ...settings,
              maxDecksPerUser: parseInt(e.target.value)
            })}
          />

          <TextField
            label="Maximum Cards per Deck"
            type="number"
            value={settings.maxCardsPerDeck}
            onChange={(e) => setSettings({
              ...settings,
              maxCardsPerDeck: parseInt(e.target.value)
            })}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SystemSettings;
