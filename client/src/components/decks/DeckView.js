import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DeckView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    const fetchDeck = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/decks/${id}`);
        setDeck(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch deck');
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [id]);

  const handleCardClick = (cardId) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleMenuClick = (event, card) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCard(card);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCard(null);
  };

  const handleEditCard = () => {
    handleMenuClose();
    navigate(`/decks/${id}/cards/${selectedCard._id}/edit`);
  };

  const handleDeleteCard = async () => {
    try {
      await api.delete(`/cards/${selectedCard._id}`);
      setDeck({
        ...deck,
        cards: deck.cards.filter(c => c._id !== selectedCard._id)
      });
      handleMenuClose();
    } catch (err) {
      setError('Failed to delete card');
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      1: 'success',
      2: 'info',
      3: 'warning'
    };
    return colors[difficulty] || 'default';
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!deck) return <Typography>Deck not found</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{deck.name}</Typography>
        <Box>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={() => navigate(`/decks/${id}/study`)}
            sx={{ mr: 2 }}
          >
            Study Deck
          </Button>
          <Button 
            variant="contained" 
            onClick={() => navigate(`/decks/${id}/cards/new`)}
          >
            Add Card
          </Button>
        </Box>
      </Box>

      <Typography color="text.secondary" gutterBottom>
        {deck.description}
      </Typography>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Cards ({deck.cards?.length || 0})
      </Typography>

      <Grid container spacing={2}>
        {deck.cards?.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card._id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.3s',
                '&:hover': { transform: 'scale(1.02)' }
              }}
              onClick={() => handleCardClick(card._id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={card.type} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Box>
                    <Chip 
                      label={`Level ${card.difficulty}`}
                      size="small"
                      color={getDifficultyColor(card.difficulty)}
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, card)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  {flippedCards[card._id] ? card.answer : card.question}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  {flippedCards[card._id] ? 'Answer' : 'Question'} 
                  (Click to {flippedCards[card._id] ? 'hide' : 'show'} {flippedCards[card._id] ? 'question' : 'answer'})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditCard}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteCard} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DeckView;
