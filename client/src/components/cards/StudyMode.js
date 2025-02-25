import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Stack,
  Chip,
  Paper,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Celebration } from '@mui/icons-material';

const StudyMode = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    totalCards: 0,
    masteredCards: 0,
    averageRating: 0
  });
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [remainingCards, setRemainingCards] = useState([]);

  const updateDeckStats = async (stats) => {
    try {
      const response = await api.put(`/decks/${deckId}/stats`, {
        masteryPercentage: Math.round(stats.masteryPercentage * 100),
        averageRating: Math.round(stats.averageRating * 10) / 10,
        lastStudied: new Date()
      });

      if (!response.data) {
        throw new Error('Failed to update deck stats');
      }
    } catch (err) {
      console.error('Failed to update deck stats:', err);
    }
  };

  const handleStopStudying = async () => {
    const stats = calculateSessionStats();
    await updateDeckStats({
      masteryPercentage: stats.masteredCards,
      averageRating: stats.averageRating,
      lastStudied: new Date()
    });
    setShowCompletionDialog(true);
  };

  const handleExitWithoutSaving = () => {
    navigate(`/decks/${deckId}`); // Simply return to deck without saving stats
  };

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await api.get(`/decks/${deckId}`);
        setDeck(response.data);
        setRemainingCards([...response.data.cards]); // Initialize remaining cards
      } catch (error) {
        console.error('Error fetching deck:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [deckId]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleAnswer = (correct) => {
    setScore(prev => ({
      ...prev,
      [correct ? 'correct' : 'incorrect']: prev[correct ? 'correct' : 'incorrect'] + 1
    }));
    
    // First set isFlipped to false
    setIsFlipped(false);
    
    // Wait for flip animation to complete before changing card
    setTimeout(() => {
      if (currentCardIndex < deck.cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      }
    }, 300); // Half the transition time (0.8s/2 = 0.4s) for smooth transition
  };

  const handleOptionSelect = async (selectedOption) => {
    const isCorrect = selectedOption === currentCard.answer;
    const rating = isCorrect ? 5 : 1;
    
    // First update the score
    setScore(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'incorrect']: prev[isCorrect ? 'correct' : 'incorrect'] + 1
    }));

    // Then handle the card transition with proper timing
    setTimeout(() => {
      handleRating(rating);
    }, 300);
  };

  const handleRating = async (rating) => {
    try {
      await api.post(`/cards/${currentCard._id}/rate`, { rating });
      
      setScore(prev => ({
        ...prev,
        ratings: {
          ...prev.ratings,
          [currentCard._id]: rating
        }
      }));

      // First update remaining cards
      const updatedCards = remainingCards.filter(card => card._id !== currentCard._id);
      const newRemainingCards = rating === 5 ? updatedCards : [...updatedCards, currentCard];

      // Then handle the transition
      setIsFlipped(false);
      
      setTimeout(() => {
        setRemainingCards(newRemainingCards);
        if (newRemainingCards.length === 0) {
          const stats = calculateSessionStats();
          updateDeckStats(stats);
          setShowCompletionDialog(true);
        } else {
          setCurrentCardIndex(0);
        }
      }, 400); // Increased delay to ensure flip completes

    } catch (err) {
      console.error('Rating error:', err);
    }
  };

  const calculateSessionStats = () => {
    const ratings = score.ratings || {};
    const allCards = deck.cards;
    
    const masteryPercentages = allCards.map(card => {
      const rating = ratings[card._id] || 0;
      switch (rating) {
        case 5: return 1;      // 100%
        case 4: return 0.75;   // 75%
        case 3: return 0.5;    // 50%
        case 2: return 0.25;   // 25%
        default: return 0;     // 0% for rating 1 or no rating
      }
    });

    const totalMastery = masteryPercentages.reduce((sum, percent) => sum + percent, 0) / allCards.length;
    const ratingValues = Object.values(ratings);
    const avg = ratingValues.length > 0 
      ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length 
      : 0;

    const stats = {
      totalCards: deck.cards.length,
      masteredCards: totalMastery,  // Don't cap at 1 since we multiply by 100 later
      averageRating: Math.round(avg * 10) / 10
    };

    setSessionStats(stats);
    return stats;
  };

  const calculateCurrentStats = () => {
    const ratings = score.ratings || {};
    const ratedCards = Object.keys(ratings).length;
    const avgRating = ratedCards > 0 
      ? Object.values(ratings).reduce((a, b) => a + b, 0) / ratedCards 
      : 0;
    
    const masteryPercentage = (Object.values(ratings).reduce((sum, rating) => {
      switch (rating) {
        case 5: return sum + 1;
        case 4: return sum + 0.75;
        case 3: return sum + 0.5;
        case 2: return sum + 0.25;
        default: return sum;
      }
    }, 0) / deck.cards.length) * 100;

    return {
      mastery: Math.round(masteryPercentage),
      average: Math.round(avgRating * 10) / 10,
      rated: ratedCards
    };
  };

  // Add guard clause for empty remaining cards
  if (loading || !deck) return <LinearProgress />;
  if (deck.cards.length === 0) return <Typography>No cards in this deck</Typography>;
  if (remainingCards.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Congratulations! 🎉
        </Typography>
        <Typography>
          You have completed all cards in this deck.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate(`/decks/${deckId}`)}
          sx={{ mt: 2 }}
        >
          Back to Deck
        </Button>
      </Box>
    );
  }

  const currentCard = remainingCards[currentCardIndex] || remainingCards[0];
  const progress = ((deck.cards.length - remainingCards.length) / deck.cards.length) * 100;
  const isLastCard = currentCardIndex === deck.cards.length - 1;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{deck.name}</Typography>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="text" 
            color="inherit"
            onClick={handleExitWithoutSaving}
            sx={{ fontWeight: 'bold' }}
          >
            Whoops, Wrong Classroom! 😅
          </Button>
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={handleStopStudying}
            sx={{ fontWeight: 'bold' }}
          >
            End & Save Progress 🎯
          </Button>
        </Stack>
      </Box>

      <LinearProgress variant="determinate" value={progress} sx={{ mb: 3 }} />

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Chip 
          label={`Mastery: ${calculateCurrentStats().mastery}%`} 
          color="success"
          sx={{ minWidth: 120 }}
        />
        <Chip 
          label={`Avg Rating: ${calculateCurrentStats().average}`} 
          color="primary"
          sx={{ minWidth: 120 }}
        />
        <Chip 
          label={`Cards Rated: ${calculateCurrentStats().rated}/${deck.cards.length}`} 
          color="secondary"
          sx={{ minWidth: 120 }}
        />
      </Stack>

      <Box sx={{ perspective: '1000px' }}>
        <Card
          onClick={currentCard.type !== 'multipleChoice' ? handleFlip : undefined}
          sx={{
            height: 300,
            cursor: currentCard.type === 'multipleChoice' ? 'default' : 'pointer',
            position: 'relative',
            backgroundColor: 'transparent',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isFlipped ? 0.95 : 1,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',  // Take full height
              textAlign: 'center',
              transition: 'transform 0.8s',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : '',
            }}
          >
            {/* Front */}
            <CardContent
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',  // Take full height
                backfaceVisibility: 'hidden',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,  // Add padding
              }}
            >
              <Typography variant="h5" sx={{ mb: currentCard.type === 'multipleChoice' ? 4 : 0, maxWidth: '90%' }}>
                {currentCard.question}
              </Typography>

              {currentCard.type === 'multipleChoice' && (
                <Stack spacing={2} width="100%">
                  {currentCard.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      fullWidth
                      onClick={() => handleOptionSelect(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </Stack>
              )}
            </CardContent>

            {/* Back */}
            <CardContent
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',  // Take full height
                backfaceVisibility: 'hidden',
                bgcolor: 'background.paper',
                transform: 'rotateY(180deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,  // Add padding
              }}
            >
              <Typography variant="h5" sx={{ maxWidth: '90%' }}>
                {currentCard.answer}
              </Typography>
            </CardContent>
          </Box>
        </Card>
      </Box>

      {isFlipped && currentCard.type !== 'multipleChoice' && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography gutterBottom>Rate your knowledge of this card:</Typography>
          <Rating
            size="large"
            max={5}
            onChange={(_, value) => handleRating(value)}
            sx={{
              fontSize: '2rem',
              '& .MuiRating-iconFilled': {
                color: 'primary.main'
              }
            }}
          />
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              1 = Need more practice | 5 = Mastered
            </Typography>
          </Box>
        </Box>
      )}

      <Dialog 
        open={showCompletionDialog} 
        onClose={() => navigate(`/decks/${deckId}`)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <Celebration color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" component="div">
            Study Session Complete! 🎉
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" gutterBottom>
              Your Progress:
            </Typography>
            <Typography>
              Mastery Progress: {Math.round(sessionStats.masteredCards * 100)}%
            </Typography>
            <Typography>
              Average Rating: {sessionStats.averageRating}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate(`/decks/${deckId}`)}
          >
            Back to Deck
          </Button>
        </DialogActions>
      </Dialog>

      {isLastCard && isFlipped && (
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          sx={{ mt: 2 }}
          onClick={() => navigate(`/decks/${deckId}`)}
        >
          Finish Study Session
        </Button>
      )}
    </Box>
  );
};

export default StudyMode;
