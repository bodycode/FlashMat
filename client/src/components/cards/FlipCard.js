import React from 'react';
import { Box } from '@mui/material';

const FlipCard = ({ children, isFlipped }) => {
  return (
    <Box
      sx={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
        height: '100%',
        width: '100%',
        position: 'relative'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default FlipCard;
