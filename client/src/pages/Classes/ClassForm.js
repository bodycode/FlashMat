import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Paper, Alert, CircularProgress,
  Divider, FormControl, InputLabel, Select, MenuItem, Chip,
  ListItemText, Checkbox, OutlinedInput
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { School, Group, MenuBook } from '@mui/icons-material';
import api from '../../services/api';

const ClassForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableDecks, setAvailableDecks] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'private',
    invitedMembers: [],
    selectedDecks: [],
    joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    settings: {
      allowSelfEnroll: false,
      requireApproval: true,
      visibleToAll: false
    }
  });

  // Fetch available users and decks
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching form data...');
        const [usersRes, decksRes] = await Promise.all([
          api.get('/users'),
          api.get('/decks')
        ]);
        console.log('Available decks:', decksRes.data);
        setAvailableUsers(usersRes.data);
        setAvailableDecks(decksRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch users or decks');
        setLoading(false);
      }
    };

    fetchData();
    
    if (id) {
      const fetchClass = async () => {
        try {
          const response = await api.get(`/classes/${id}`);
          setFormData({
            name: response.data.name,
            description: response.data.description || '',
            privacy: response.data.privacy || 'private',
            invitedMembers: response.data.invitedMembers || [],
            selectedDecks: response.data.selectedDecks || [],
            joinCode: response.data.joinCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
            settings: response.data.settings || {
              allowSelfEnroll: false,
              requireApproval: true,
              visibleToAll: false
            }
          });
        } catch (err) {
          setError('Failed to fetch class details');
        } finally {
          setLoading(false);
        }
      };
      fetchClass();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = id ? `/classes/${id}` : '/classes';
      const method = id ? 'put' : 'post';
      await api[method](endpoint, formData);
      navigate('/classes');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save team');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <School color="primary" />
          <Typography variant="h5">
            {id ? 'Edit Team' : 'Create New Team'}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <Typography variant="h6" gutterBottom>Basic Information</Typography>
          <TextField
            fullWidth
            label="Team Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={4}
            sx={{ mb: 3 }}
          />

          {/* Team Settings Section */}
          <Typography variant="h6" gutterBottom>Team Settings</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Privacy</InputLabel>
            <Select
              value={formData.privacy}
              onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
              label="Privacy"
            >
              <MenuItem value="private">Private (Invite Only)</MenuItem>
              <MenuItem value="public">Public (Anyone can join)</MenuItem>
              <MenuItem value="restricted">Restricted (Requires Approval)</MenuItem>
            </Select>
          </FormControl>

          {/* Member Selection */}
          <Typography variant="h6" gutterBottom>Invite Members</Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Members</InputLabel>
            <Select
              multiple
              value={formData.invitedMembers}
              onChange={(e) => setFormData({ ...formData, invitedMembers: e.target.value })}
              input={<OutlinedInput label="Select Members" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={availableUsers.find(u => u._id === value)?.username}
                      icon={<Group />}
                    />
                  ))}
                </Box>
              )}
            >
              {availableUsers.map((user) => (
                <MenuItem key={user._id} value={user._id}>
                  <Checkbox checked={formData.invitedMembers.includes(user._id)} />
                  <ListItemText primary={user.username} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Deck Assignment */}
          <Typography variant="h6" gutterBottom>Assign Study Material</Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Decks</InputLabel>
            <Select
              multiple
              value={formData.selectedDecks}
              onChange={(e) => setFormData({ ...formData, selectedDecks: e.target.value })}
              input={<OutlinedInput label="Select Decks" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={availableDecks.find(d => d._id === value)?.name}
                      icon={<MenuBook />}
                    />
                  ))}
                </Box>
              )}
            >
              {availableDecks.map((deck) => (
                <MenuItem key={deck._id} value={deck._id}>
                  <Checkbox checked={formData.selectedDecks.includes(deck._id)} />
                  <ListItemText primary={deck.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
            >
              {id ? 'Update' : 'Create'} Team
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/classes')}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default ClassForm;
