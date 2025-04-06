import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper, Rating, Grid } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CardList = ({ deckId }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await api.get(`/api/cards?deckId=${deckId}`);
        
        // Sort cards alphabetically by question
        const sortedCards = response.data.sort((a, b) => {
          // Handle null/undefined questions gracefully
          const questionA = (a.question || '').toLowerCase();
          const questionB = (b.question || '').toLowerCase();
          
          // Alpha-numeric sorting
          return questionA.localeCompare(questionB, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        setCards(sortedCards);
        console.log(`Loaded ${sortedCards.length} cards (sorted alphabetically)`);
      } catch (err) {
        setError('Failed to fetch cards');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [deckId, token]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
      <CircularProgress />
    </Box>
  );
  
  if (error) return <Typography color="error">{error}</Typography>;
  
  if (cards.length === 0) return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6">No cards found in this deck.</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Add some cards to get started studying!
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Cards in this Deck
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Displaying {cards.length} cards in alphabetical order
      </Typography>
      
      {cards.map((card, index) => (
        <Paper 
          key={card._id} 
          elevation={2} 
          sx={{ 
            mb: 4, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {/* Card number badge */}
          <Box sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            py: 0.5, 
            px: 2,
            display: 'inline-block'
          }}>
            Card #{index + 1}
          </Box>
          
          <Grid container>
            {/* Question side */}
            <Grid item xs={12} md={6} sx={{
              borderRight: { md: '1px solid', xs: 'none' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ p: 3, flex: '1 0 auto' }}>
                <Typography 
                  variant="subtitle1" 
                  color="text.secondary" 
                  sx={{ mb: 1, fontWeight: 'bold' }}
                >
                  Question
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {card.question}
                </Typography>
                
                {/* Display question image if available */}
                {card.questionImage?.url && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <img 
                      src={card.questionImage.url} 
                      alt="Question illustration"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '200px',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
            
            {/* Answer side */}
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 3 }}>
                <Typography 
                  variant="subtitle1" 
                  color="text.secondary" 
                  sx={{ mb: 1, fontWeight: 'bold' }}
                >
                  Answer
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {card.answer}
                </Typography>
                
                {/* User rating for this card */}
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Your rating:
                  </Typography>
                  <Rating 
                    value={card.userRating || 0} 
                    readOnly 
                    precision={0.5}
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
};

export default CardList;
