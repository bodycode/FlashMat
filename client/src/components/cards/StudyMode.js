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

  const currentCard = remainingCards[currentCardIndex] || remainingCards[0];

  const updateDeckStats = async (stats) => {
    try {
      console.log('Sending user-specific stats to server:', stats);

      // This endpoint now updates the UserProgress collection for this specific user
      const response = await api.put(`/decks/${deckId}/stats`, {
        masteryPercentage: stats.masteryPercentage,
        averageRating: stats.averageRating
      });

      console.log('Stats update response from server:', response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to update deck stats:', err);
      throw err;
    }
  };

  const handleStopStudying = async () => {
    const stats = calculateSessionStats(); // Calculate final stats
    
    try {
      // Update user-specific stats on the server
      const response = await updateDeckStats({
        masteryPercentage: stats.masteryPercentage,
        averageRating: stats.averageRating,
        lastStudied: new Date()
      });
      
      // Use the returned stats from the server which include the user's progress
      if (response && response.stats) {
        setSessionStats({
          ...stats,
          masteryPercentage: response.stats.masteryPercentage,
          averageRating: response.stats.averageRating
        });
      }
      
      setShowCompletionDialog(true);
    } catch (error) {
      console.error('Error saving progress:', error);
      // Still show dialog with local stats if server update fails
      setShowCompletionDialog(true);
    }
  };

  const handleExitWithoutSaving = () => {
    navigate(`/decks/${deckId}`); // Simply return to deck without saving stats
  };

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        // This endpoint now returns deck with user-specific stats
        const response = await api.get(`/decks/${deckId}`);
        
        console.log('Fetched deck with user-specific stats:', {
          deckId: response.data._id,
          userStats: response.data.stats,
          cards: response.data.cards.length
        });
        
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

  // Fix the issue where the answer for the next card is visible briefly

// Update the handleRating function to fully complete the transition before changing cards
const handleRating = async (rating) => {
  // For self-rated cards, track the rating as given
  setScore(prev => ({
    ...prev,
    ratings: {...prev.ratings, [currentCard._id]: rating}
  }));
  
  try {
    // First set isFlipped to false to hide the answer
    setIsFlipped(false);
    
    // Store the rating request in a variable to send later
    const ratingRequest = api.post(`/cards/${currentCard._id}/rate`, { rating });
    
    // Remove card only if rated 5, otherwise put back in deck
    const updatedCards = remainingCards.filter(c => c._id !== currentCard._id);
    
    // Wait for flip animation to complete before changing cards
    // This prevents seeing the next card's answer briefly
    setTimeout(async () => {
      // Now send the rating request
      await ratingRequest;
      
      // Card "mastery" logic - only consider it mastered for rating 5
      if (rating === 5) {
        // Treat as mastered - remove from deck
        if (updatedCards.length === 0) {
          // Final card - calculate stats
          const ratings = {...score.ratings, [currentCard._id]: rating};
          
          // Calculate mastery points
          const masteryPoints = Object.values(ratings).reduce((sum, r) => {
            switch (r) {
              case 5: return sum + 1;     // 100% mastery
              case 4: return sum + 0.75;  // 75% mastery
              case 3: return sum + 0.5;   // 50% mastery
              case 2: return sum + 0.25;  // 25% mastery
              case 1: return sum;         // 0% mastery
              default: return sum;        // unrated
            }
          }, 0);
          
          const masteryPercent = Math.round((masteryPoints / deck.cards.length) * 100);
          const avgRating = Math.round((Object.values(ratings).reduce((a,b) => a+b, 0) / deck.cards.length) * 10) / 10;
          
          const response = await api.put(`/decks/${deckId}/stats`, {
            masteryPercentage: masteryPercent,
            averageRating: avgRating
          });
          
          setSessionStats({
            masteryPercentage: response.data.stats.masteryPercentage,
            averageRating: response.data.stats.averageRating
          });
          setShowCompletionDialog(true);
        } else {
          setRemainingCards(updatedCards);
          setCurrentCardIndex(0);
        }
      } else {
        // Not mastered - add back to deck
        setRemainingCards([...updatedCards, currentCard]);
        setCurrentCardIndex(0);
      }
    }, 400); // Allow enough time for the flip animation to complete
  } catch (err) {
    console.error('Error processing rating:', err);
  }
};

  const calculateSessionStats = () => {
    const ratings = score.ratings || {};
    
    // Debug log of all ratings first
    console.log('Calculating final session stats:', {
      ratingsReceived: Object.keys(ratings).length,
      totalCardsInDeck: deck.cards.length,
      allRatings: ratings
    });

    const cardMasteryPoints = deck.cards.map(card => {
      const rating = ratings[card._id] ?? 0; // Default to 0 if not rated
      switch (rating) {
        case 5: return 1;     // 100% mastery
        case 4: return 0.75;  // 75% mastery
        case 3: return 0.5;   // 50% mastery
        case 2: return 0.25;  // 25% mastery
        case 1: return 0;     // 0% mastery
        default: return 0;    // unrated
      }
    });

    const totalMasteryPoints = cardMasteryPoints.reduce((sum, points) => sum + points, 0);
    const masteryPercentage = Math.round((totalMasteryPoints / deck.cards.length) * 100);

    // Calculate average rating
    const averageRating = Math.round((Object.values(ratings).reduce((a, b) => a + b, 0) / deck.cards.length) * 10) / 10;

    const stats = {
      totalCards: deck.cards.length,
      masteryPercentage,
      averageRating
    };

    console.log('Final stats calculation:', {
      ...stats,
      cardMasteryPoints,
      totalMasteryPoints,
      allRatings: ratings
    });

    setSessionStats(stats);
    return stats;
  };

  const calculateCurrentStats = () => {
    const ratings = score.ratings || {};
    const ratedCards = Object.keys(ratings).length;
    
    // Count mastered cards (rating 5 only)
    const masteredCards = Object.values(ratings).filter(r => r === 5).length;
    const masteryPercentage = (masteredCards / deck.cards.length) * 100;
    
    // Calculate average across all ratings
    const avgRating = ratedCards > 0
      ? Object.values(ratings).reduce((a, b) => a + b, 0) / ratedCards
      : 0;

    const stats = {
      mastery: Math.round(masteryPercentage),
      average: Math.round(avgRating * 10) / 10,
      rated: ratedCards
    };

    console.log('Current stats calculated:', {
      ...stats,
      masteredCards,  // Replace undefined totalMasteryPoints with this
      possiblePoints: deck.cards.length,
      ratings: Object.values(ratings)
    });

    return stats;
  };

  // Replace the getImageUrl function with this more robust version:
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    console.log('Original image URL:', imageUrl);
    
    // First, try the direct URL (works if your server and client are on same origin)
    if (imageUrl.startsWith('/uploads/')) {
      const directUrl = `http://localhost:5000${imageUrl}`;
      console.log('Using direct URL:', directUrl);
      return directUrl;
    }
    
    // If it already has the full URL, use it
    if (imageUrl.startsWith('http')) {
      console.log('URL already absolute:', imageUrl);
      return imageUrl;
    }
    
    // Otherwise, construct a full URL
    const baseUrl = 'http://localhost:5000'; // Hardcode this for reliability
    const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    const fullUrl = `${baseUrl}${normalizedPath}`;
    
    console.log('Constructed full URL:', fullUrl);
    return fullUrl;
  };

  useEffect(() => {
    // Debug logging for current card
    if (currentCard?.questionImage?.url) {
      console.log('Current card image URL:', currentCard.questionImage.url);
      console.log('Full image URL:', getImageUrl(currentCard.questionImage.url));
    }
  }, [currentCard]);

  // Reset scores when starting a new session
  useEffect(() => {
    setScore({ correct: 0, incorrect: 0, ratings: {} });
  }, [deckId]);

  // Add guard clause for empty remaining cards
  if (loading || !deck) return <LinearProgress />;
  if (deck.cards.length === 0) return <Typography>No cards in this deck</Typography>;
  if (remainingCards.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Congratulations! 🎉
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

  const progress = ((deck.cards.length - remainingCards.length) / deck.cards.length) * 100;
  const isLastCard = currentCardIndex === deck.cards.length - 1;

  const handleCompletionFinish = () => {
    navigate('/decks'); // Go to list of all decks instead
  };

  const handleLastCard = async () => {
    try {
      console.log('FINAL CARD - Processing completion...');
      
      // Calculate final stats
      const stats = calculateSessionStats();
      
      // Update user-specific stats on server
      const response = await updateDeckStats({
        masteryPercentage: stats.masteryPercentage,
        averageRating: stats.averageRating
      });
      
      // Use server-returned stats in the UI
      if (response && response.stats) {
        setSessionStats({
          masteryPercentage: response.stats.masteryPercentage,
          averageRating: response.stats.averageRating,
          totalCards: deck.cards.length
        });
      }
      
      setShowCompletionDialog(true);
    } catch (err) {
      console.error('Final stats calculation error:', err);
      setShowCompletionDialog(true);
    }
  };

  // Fix the card height and rating stars positioning

  // Update the main container to have a slightly shorter height
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
            variant="contained" 
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
          onClick={handleFlip}
          sx={{
            position: 'relative',
            minHeight: 360, // Reduced from 400 by 10%
            maxHeight: '90vh', // Limit maximum height to 90% of viewport height
            display: 'flex', // Add flex display
            flexDirection: 'column', // Stack children vertically
            backgroundColor: 'transparent',
            transition: 'all 0.3s ease-in-out',
            opacity: isFlipped ? 0.95 : 1,
            cursor: 'pointer',
            overflow: 'hidden' // Prevent content from spilling outside the card
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              flex: 1, // Take up all available space
              textAlign: 'center',
              transition: 'transform 0.8s',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : '',
              display: 'flex', // Add flex display
              flexDirection: 'column' // Stack children vertically
            }}
          >
            {/* Front - Update styles to fill entire card */}
            <CardContent
              sx={{
                position: 'relative',
                width: '100%', 
                height: '100%',
                flex: 1, // Take up all available space
                backfaceVisibility: 'hidden',
                bgcolor: 'background.paper', // This is the white color
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                p: 4,
                margin: 0,
                boxSizing: 'border-box' // Include padding in size calculation
              }}
            >
              {!isFlipped && currentCard.questionImage?.url && (
                <Box sx={{ mb: 3, width: '100%', display: 'flex', justifyContent: 'center', height: '180px' }}>
                  <img
                    src={getImageUrl(currentCard.questionImage.url)}
                    alt={currentCard.questionImage.alt || "Question image"}
                    style={{
                      maxWidth: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      console.error('Image failed to load:', e.target.src);
                      
                      // Try each possible URL variation as fallbacks
                      const fallbackUrls = [
                        `http://localhost:5000${currentCard.questionImage.url}`,
                        currentCard.questionImage.url.replace('/uploads/', 'http://localhost:5000/uploads/'),
                        `http://localhost:5000/uploads/${currentCard.questionImage.url.split('/').pop()}`
                      ];
                      
                      console.log('Trying fallback URLs:', fallbackUrls);
                      
                      // Try the next fallback URL
                      const currentSrc = e.target.src;
                      const currentIndex = fallbackUrls.indexOf(currentSrc);
                      const nextIndex = currentIndex + 1;
                      
                      if (nextIndex < fallbackUrls.length) {
                        e.target.src = fallbackUrls[nextIndex];
                      } else {
                        // All fallbacks failed, show error message
                        e.target.style.display = 'none';
                        const errorText = document.createElement('div');
                        errorText.textContent = 'Image could not be loaded';
                        errorText.style.color = 'gray';
                        errorText.style.fontStyle = 'italic';
                        e.target.parentNode.appendChild(errorText);
                        
                        // Log the failure details for debugging
                        console.error('All image fallbacks failed:', {
                          originalUrl: currentCard.questionImage.url,
                          triedUrls: [getImageUrl(currentCard.questionImage.url), ...fallbackUrls]
                        });
                      }
                    }}
                  />
                </Box>
              )}
              <Typography variant="h5" sx={{ mb: 0, maxWidth: '90%' }}>
                {currentCard.question}
              </Typography>
              
              {/* Add rating UI at the bottom when card is flipped */}
              {isFlipped && (
                <Box 
                  sx={{ 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    padding: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                    textAlign: 'center',
                    zIndex: 10, // Ensure it's above other content
                  }}
                  // This onClick handler prevents the event from reaching the card
                  onClick={(e) => e.stopPropagation()}
                >
                  <Typography variant="body2" gutterBottom>Rate your knowledge:</Typography>
                  <Rating
                    size="large"
                    max={5}
                    onChange={(_, value) => handleRating(value)}
                    sx={{
                      fontSize: '1.75rem',
                      '& .MuiRating-iconFilled': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>

            {/* Back - Update styles to fill entire card */}
            <CardContent
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%', 
                backfaceVisibility: 'hidden',
                bgcolor: 'background.paper', // This is the white color
                transform: 'rotateY(180deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                margin: 0,
                boxSizing: 'border-box' // Include padding in size calculation
              }}
            >
              <Typography variant="h5" sx={{ maxWidth: '90%' }}>
                {currentCard.answer}
              </Typography>
              
              {/* Add rating UI at the bottom when card is flipped */}
              {isFlipped && (
                <Box 
                  sx={{ 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    padding: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                    textAlign: 'center',
                    zIndex: 10,
                  }}
                  // This onClick handler prevents the event from reaching the card
                  onClick={(e) => e.stopPropagation()}
                >
                  <Typography variant="body2" gutterBottom>Rate your knowledge:</Typography>
                  <Rating
                    size="large"
                    max={5}
                    onChange={(_, value) => handleRating(value)}
                    sx={{
                      fontSize: '1.75rem',
                      '& .MuiRating-iconFilled': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Box>
        </Card>
      </Box>

      <Dialog 
        open={showCompletionDialog} 
        onClose={handleCompletionFinish}
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
              Mastery Progress: {sessionStats.masteryPercentage}%
            </Typography>
            <Typography>
              Average Rating: {sessionStats.averageRating}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={handleCompletionFinish}
          >
            Back to Decks
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
