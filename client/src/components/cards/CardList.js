import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, CircularProgress } from '@mui/material';
import CardItem from './CardItem';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const CardList = ({ deckId }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await axios.get(`/api/cards?deckId=${deckId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCards(response.data);
      } catch (err) {
        setError('Failed to fetch cards');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [deckId, token]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (cards.length === 0) return <Typography>No cards found in this deck.</Typography>;

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card._id}>
            <CardItem card={card} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CardList;
