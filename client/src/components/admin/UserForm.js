import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Autocomplete
} from '@mui/material';
import api from '../../services/api';

const UserForm = ({ open, onClose, onSubmit, user = null }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    classes: []
  });
  const [availableTeams, setAvailableTeams] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        role: user.role || 'student',
        classes: user.classes || []
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'student',
        classes: []
      });
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/classes');
      setAvailableTeams(response.data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.username || !formData.email || (!user && !formData.password)) {
        setError('Please fill in all required fields');
        return;
      }

      const userData = {
        ...formData,
        classes: formData.classes.map(c => typeof c === 'string' ? c : c._id)
      };

      if (user) {
        // Remove password if empty on edit
        if (!userData.password) {
          delete userData.password;
        }
      }

      onSubmit(userData);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {user ? 'Edit User' : 'Create New User'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            {!user && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            )}
            <FormControl>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              options={availableTeams}
              getOptionLabel={(option) => option.name}
              value={formData.classes}
              onChange={(_, newValue) => {
                setFormData({ ...formData, classes: newValue });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assigned Teams"
                  placeholder="Select teams"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {user ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserForm;
