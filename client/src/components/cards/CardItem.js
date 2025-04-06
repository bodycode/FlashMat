import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Button, Typography, Box } from '@mui/material';
import FlipCard from './FlipCard';

const CardItem = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    console.log('Building URL for:', imageUrl);
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${imageUrl}`;
  };

  useEffect(() => {
    // Debug logging
    if (card.questionImage?.url) {
      console.log('Image URL:', card.questionImage.url);
      console.log('Full URL:', getImageUrl(card.questionImage.url));
    }
  }, [card]);

  useEffect(() => {
    if (card.questionImage) {
      console.log('Card image data:', {
        card: card._id,
        imageData: card.questionImage,
        fullUrl: getImageUrl(card.questionImage.url)
      });
    }
  }, [card]);

  return (
    <FlipCard isFlipped={isFlipped}>
      <Card 
        sx={{ 
          height: '280px', // Increased to accommodate image
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between' 
        }}
      >
        <CardContent>
          {!isFlipped && card.questionImage?.url && !imageError && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', height: '120px' }}>
              <img 
                src={getImageUrl(card.questionImage.url)} 
                alt="Question" 
                style={{ 
                  maxWidth: '100%', 
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
                onError={(e) => {
                  console.error('Image load error:', card.questionImage.url);
                  setImageError(true);
                }}
              />
            </Box>
          )}
          <Typography variant="h6" component="div">
            {isFlipped ? card.answer : card.question}
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small" onClick={handleFlip}>
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </Button>
        </CardActions>
      </Card>
    </FlipCard>
  );
};

export default CardItem;
