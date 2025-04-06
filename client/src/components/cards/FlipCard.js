import React from 'react';
import { Box } from '@mui/material';

const FlipCard = ({ children, isFlipped, onClick }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        perspective: '1000px',
        height: '100%',
        width: '100%',
        position: 'relative',
        '& > div': {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transition: 'transform 0.8s ease-in-out',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
        }
      }}
    >
      {children}
    </Box>
  );
};

export default FlipCard;
