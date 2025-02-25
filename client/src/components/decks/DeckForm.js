import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
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

  // Add useEffect to load deck data when editing
  useEffect(() => {
    const loadDeck = async () => {
      if (id) {
        setLoading(true);
        try {
          const response = await api.get(`/decks/${id}`);
          const { name, description } = response.data;
          setFormData({ name, description });
        } catch (err) {
          setError('Failed to load deck');
        } finally {
          setLoading(false);
        }
      }
    };

    loadDeck();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        await api.put(`/decks/${id}`, formData);
      } else {
        await api.post('/decks', formData);
      }
      navigate('/decks');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save deck');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {id ? 'Edit Deck' : 'Create New Deck'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        fullWidth
        label="Deck Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        margin="normal"
        required
      />

      <TextField
        fullWidth
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        margin="normal"
        multiline
        rows={4}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 3 }}
      >
        {id ? 'Update Deck' : 'Create Deck'}
      </Button>
    </Box>
  );
};

export default DeckForm;
