import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Radio, RadioGroup, FormControlLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const CardStudy = ({ cards = [], onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [score, setScore] = useState(0);
  const navigate = useNavigate();

  const currentCard = cards[currentIndex];

  useEffect(() => {
    if (cards.length === 0) {
      navigate('/decks');
    }
  }, [cards, navigate]);

  const handleNext = () => {
    if (currentCard.multipleChoice) {
      if (selectedChoice === currentCard.answer) {
        setScore(score + 1);
      }
    }

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setSelectedChoice('');
    } else {
      onComplete?.(score);
    }
  };

  const handleChoiceSelect = (event) => {
    setSelectedChoice(event.target.value);
  };

  if (!currentCard) return null;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Card {currentIndex + 1} of {cards.length}
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3, minHeight: 200 }}>
        <Typography variant="h5" gutterBottom>
          {currentCard.question}
        </Typography>

        {currentCard.image && (
          <Box
            component="img"
            src={currentCard.image}
            alt="Card visual"
            sx={{
              maxWidth: '100%',
              maxHeight: 200,
              objectFit: 'contain',
              my: 2
            }}
          />
        )}

        {currentCard.multipleChoice ? (
          <RadioGroup value={selectedChoice} onChange={handleChoiceSelect}>
            {currentCard.choices.map((choice, index) => (
              <FormControlLabel
                key={index}
                value={choice}
                control={<Radio />}
                label={choice}
                disabled={showAnswer}
              />
            ))}
          </RadioGroup>
        ) : (
          showAnswer && (
            <Typography 
              variant="body1" 
              sx={{ 
                mt: 2,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1
              }}
            >
              {currentCard.answer}
            </Typography>
          )
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {!currentCard.multipleChoice && (
          <Button
            variant="outlined"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </Button>
        )}

        <Button
          variant="contained"
          onClick={handleNext}
          disabled={currentCard.multipleChoice && !selectedChoice}
        >
          {currentIndex + 1 === cards.length ? 'Finish' : 'Next Card'}
        </Button>
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Score: {score} / {currentIndex + (currentCard.multipleChoice ? 1 : 0)}
      </Typography>
    </Box>
  );
};

export default CardStudy;
