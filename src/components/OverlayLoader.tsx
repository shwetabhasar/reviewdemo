import React from 'react';

import { Box } from '@mui/material';

import CircularProgressWithLabel from './CircularWithValueLabel'; // Import the CircularProgressWithLabel

interface OverlayLoaderProps {
  progress: number;
}

const OverlayLoader = ({ progress }: OverlayLoaderProps) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <CircularProgressWithLabel value={progress} />
    </Box>
  );
};

export default OverlayLoader;
