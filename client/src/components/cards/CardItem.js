import React, { useState } from 'react';
import { Card, CardContent, CardActions, Button, Typography, Box } from '@mui/material';
import FlipCard from './FlipCard';

const CardItem = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <FlipCard isFlipped={isFlipped}>
      <Card 
        sx={{ 
          height: '200px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between' 
        }}
      >
        <CardContent>
          <Typography variant="h6" component="div">
            {isFlipped ? card.answer : card.question}
          </Typography>
          {card.image && (
            <Box
              component="img"
              sx={{
                maxHeight: 100,
                maxWidth: '100%',
                objectFit: 'contain',
                mt: 1
              }}
              src={card.image}
              alt="Card visual"
            />
          )}
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
