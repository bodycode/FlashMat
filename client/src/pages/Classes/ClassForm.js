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
  
  // Simplified form data without privacy options - all teams are private (invite-only)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    invitedMembers: [],
    selectedDecks: [],
    joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    // Set private privacy by default - no longer user configurable
    privacy: 'private'
  });

  // Fetch available users and decks
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching form data...');
        
        // FIX: Use includeAssigned=true&all=true to get ALL decks 
        const [usersRes, decksRes] = await Promise.all([
          api.get('/users'),
          api.get('/decks?includeAssigned=true&all=true') // Modified to get ALL decks
        ]);
        
        console.log(`Fetched ${decksRes.data.length} total decks for team assignment`);
        
        // Filter out any decks with empty or null names
        const validDecks = decksRes.data.filter(deck => deck && deck.name && deck.name.trim() !== '');
        
        // Debug logging
        console.log('Total decks received:', decksRes.data.length);
        console.log('Valid decks after filtering:', validDecks.length);
        
        // If there was filtering, log the invalid deck
        if (validDecks.length < decksRes.data.length) {
          const invalidDecks = decksRes.data.filter(d => !d || !d.name || d.name.trim() === '');
          console.warn('Found invalid decks:', invalidDecks);
        }
        
        // Sort decks alphabetically by name for better usability
        validDecks.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        setAvailableUsers(usersRes.data);
        setAvailableDecks(validDecks);
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
            // Always set privacy to private regardless of what's in the database
            privacy: 'private',
            invitedMembers: response.data.students?.map(s => typeof s === 'object' ? s._id : s) || [],
            selectedDecks: response.data.decks?.map(d => typeof d === 'object' ? d._id : d) || [],
            joinCode: response.data.joinCode || Math.random().toString(36).substring(2, 8).toUpperCase()
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
      
      // Filter out any invalid deck IDs that might have been selected
      const validSelectedDecks = formData.selectedDecks.filter(deckId => {
        const exists = availableDecks.some(d => d._id === deckId);
        if (!exists) {
          console.warn(`Removing invalid deck ID from selection: ${deckId}`);
        }
        return exists;
      });
      
      // Check if we filtered anything
      if (validSelectedDecks.length !== formData.selectedDecks.length) {
        console.log('Filtered out invalid decks:', {
          before: formData.selectedDecks.length,
          after: validSelectedDecks.length
        });
      }
      
      // Ensure privacy is set to 'private' before sending
      const submissionData = {
        ...formData,
        selectedDecks: validSelectedDecks,
        privacy: 'private' // Force private setting
      };
      
      await api[method](endpoint, submissionData);
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
                      size="small"
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Choose from {availableDecks.length} available study decks to assign to this team.
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Decks</InputLabel>
            <Select
              multiple
              value={formData.selectedDecks}
              onChange={(e) => setFormData({ ...formData, selectedDecks: e.target.value })}
              input={<OutlinedInput label="Select Decks" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const deck = availableDecks.find(d => d._id === value);
                    // Skip rendering if deck is not found
                    if (!deck || !deck.name) {
                      console.warn(`Selected deck not found in available decks: ${value}`);
                      return null;
                    }
                    return (
                      <Chip 
                        key={value} 
                        label={deck.name}
                        size="small"
                        sx={{ 
                          '& .MuiChip-label': { maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' } 
                        }}
                      />
                    );
                  }).filter(Boolean)} {/* Filter out null values */}
                </Box>
              )}
            >
              {availableDecks.map((deck) => (
                <MenuItem key={deck._id} value={deck._id}>
                  <Checkbox checked={formData.selectedDecks.includes(deck._id)} />
                  <ListItemText 
                    primary={deck.name} 
                  />
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
