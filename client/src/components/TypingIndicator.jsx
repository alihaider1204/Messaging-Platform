import React from 'react';
import { Box } from '@mui/material';

const TypingIndicator = ({ isTyping }) => {
  if (!isTyping) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', height: 24, pl: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </Box>
      <style>{`
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin: 0 2px;
          background: #888;
          border-radius: 50%;
          animation: blink 1.4s infinite both;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
    </Box>
  );
};

export default TypingIndicator; 