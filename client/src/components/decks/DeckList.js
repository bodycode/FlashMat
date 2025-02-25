import React, { useState, useEffect } from 'react';
import { Grid, Typography, Box, CircularProgress, Button } from '@mui/material';
import DeckCard from './DeckCard';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Add } from '@mui/icons-material';

const DeckList = () => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchDecks = async () => {
    try {
      const response = await api.get('/decks');
      setDecks(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching decks:', err);
      setError('Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
    const interval = setInterval(fetchDecks, 5000); // Poll more frequently
    return () => clearInterval(interval);
  }, []);

  const handleDeckDelete = (deletedDeckId) => {
    setDecks(prevDecks => prevDecks.filter(deck => deck._id !== deletedDeckId));
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          My Decks
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/decks/new')}
          startIcon={<Add />}
        >
          Create New Deck
        </Button>
      </Box>

      {decks.length === 0 ? (
        <Typography>No decks found. Create your first deck!</Typography>
      ) : (
        <Grid container spacing={3}>
          {decks.map((deck) => (
            <Grid item xs={12} sm={6} md={4} key={deck._id}>
              <DeckCard 
                deck={deck} 
                onDelete={handleDeckDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default DeckList;
