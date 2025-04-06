import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, Grid, Autocomplete, Chip, CircularProgress } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const DeckForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  
  // For Users and Teams assignments
  const [allUsers, setAllUsers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Load deck data when editing + fetch available users and teams
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoading(true);
        
        // First fetch all available users and teams for dropdown options
        let availableUsers = [];
        let availableTeams = [];
        
        try {
          const usersResponse = await api.get('/users');
          availableUsers = usersResponse.data || [];
          setAllUsers(availableUsers);
          console.log(`Loaded ${availableUsers.length} available users`);
        } catch (err) {
          console.error('Error loading users:', err);
        }
        
        try {
          const teamsResponse = await api.get('/classes');
          availableTeams = teamsResponse.data || [];
          setAllTeams(availableTeams);
          console.log(`Loaded ${availableTeams.length} available teams`);
        } catch (err) {
          console.error('Error loading teams:', err);
        }
        
        // If editing, load existing deck data
        if (id) {
          try {
            // Get basic deck info
            const regularResponse = await api.get(`/decks/${id}`);
            const { name, description } = regularResponse.data;
            
            setFormData({
              name: name || '',
              description: description || ''
            });
            
            // Get assigned users - users who have this deck in their decks array
            try {
              const assignedUsersResponse = await api.get(`/users?deck=${id}`);
              if (assignedUsersResponse.data && assignedUsersResponse.data.length > 0) {
                // Only set actually assigned users
                setSelectedUsers(assignedUsersResponse.data);
                console.log(`Loaded ${assignedUsersResponse.data.length} assigned users`);
              } else {
                // Make sure it's empty if none are assigned
                setSelectedUsers([]);
              }
            } catch (err) {
              console.error('Error loading assigned users:', err);
              setSelectedUsers([]);
            }
            
            // Get assigned teams - teams who have this deck in their decks array
            try {
              const assignedTeamsResponse = await api.get(`/classes?deck=${id}`);
              if (assignedTeamsResponse.data && assignedTeamsResponse.data.length > 0) {
                // Only set actually assigned teams
                setSelectedTeams(assignedTeamsResponse.data);
                console.log(`Loaded ${assignedTeamsResponse.data.length} assigned teams`);
              } else {
                // Make sure it's empty if none are assigned
                setSelectedTeams([]);
              }
            } catch (err) {
              console.error('Error loading assigned teams:', err);
              setSelectedTeams([]);
            }
          } catch (err) {
            console.error('Error loading deck data:', err);
            setError('Failed to load deck data. Please try again.');
          }
        }
      } catch (err) {
        console.error('Error in overall data loading:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Deck name is required');
      return;
    }
    
    setLoading(true);
    try {
      // Extract IDs correctly, ensuring they're strings
      const userIds = selectedUsers.map(user => user._id.toString());
      const teamIds = selectedTeams.map(team => team._id.toString());
      
      console.log('Submitting assignments:', {
        userIds: userIds.length,
        teamIds: teamIds.length
      });
      
      // Create submission data with assignments
      const submissionData = {
        ...formData,
        assignedUsers: userIds,
        assignedTeams: teamIds
      };
      
      if (id) {
        await api.put(`/decks/${id}`, submissionData);
        console.log('Deck updated successfully with assignments');
      } else {
        const response = await api.post('/decks', submissionData);
        console.log('New deck created with ID:', response.data._id);
      }
      
      navigate('/decks');
    } catch (err) {
      console.error('Error saving deck:', err);
      setError(err.response?.data?.message || 'Failed to save deck');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate to decks list instead of deck details
    navigate('/decks');
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {id ? 'Edit Deck' : 'Create New Deck'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        fullWidth
        label="Deck Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        required
      />

      <TextField
        fullWidth
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        margin="normal"
        multiline
        rows={4}
      />
      
      {/* Optional Users Assignment */}
      <Autocomplete
        multiple
        id="assigned-users"
        options={allUsers}
        getOptionLabel={(option) => option.username || option.email || ''}
        value={selectedUsers}
        onChange={(event, newValue) => {
          setSelectedUsers(newValue);
          console.log('Selected users changed:', newValue.length);
        }}
        isOptionEqualToValue={(option, value) => option._id === value._id}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Assign to Users (Optional)"
            placeholder="Select users"
            margin="normal"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option.username || option.email}
              {...getTagProps({ index })}
              key={option._id}
            />
          ))
        }
      />
      
      {/* Optional Teams Assignment */}
      <Autocomplete
        multiple
        id="assigned-teams"
        options={allTeams}
        getOptionLabel={(option) => option.name || ''}
        value={selectedTeams}
        onChange={(event, newValue) => {
          setSelectedTeams(newValue);
          console.log('Selected teams changed:', newValue.length);
        }}
        isOptionEqualToValue={(option, value) => option._id === value._id}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Assign to Teams (Optional)"
            placeholder="Select teams"
            margin="normal"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option.name}
              {...getTagProps({ index })}
              key={option._id}
            />
          ))
        }
      />

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={6}>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
          >
            {id ? 'Update Deck' : 'Create Deck'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DeckForm;
