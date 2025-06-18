import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import config from '../config';

const MessageBubble = ({ message }) => {
  const { user } = useAuth();
  const isMine = message.sender?._id === user._id || message.sender === user._id;
  
  // Check if message is an image
  const isImage = message.type === 'image' || 
                  (message.fileUrl && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(message.fileUrl));
  
  // Check if message has any file attachment
  const hasFile = message.fileUrl && message.fileUrl.trim() !== '';

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      mb: 1,
    }}>
      <Avatar src={message.sender?.avatar ? `${config.BACKEND_URL}${message.sender.avatar}` : undefined} sx={{ width: 32, height: 32, mx: 1 }}>
        {!message.sender?.avatar && message.sender?.name?.[0]}
      </Avatar>
      <Box sx={{
        maxWidth: '60%',
        bgcolor: isMine ? '#dcf8c6' : 'white',
        color: 'black',
        borderRadius: 2,
        p: 1.2,
        boxShadow: 1,
        ml: isMine ? 0 : 1,
        mr: isMine ? 1 : 0,
        wordBreak: 'break-word',
        position: 'relative',
      }}>
        {/* Render image if it's an image type */}
        {isImage && hasFile ? (
          <Box>
            <img 
              src={`${config.BACKEND_URL}${message.fileUrl}`} 
              alt="attachment" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px',
                borderRadius: 8, 
                marginBottom: 4,
                objectFit: 'cover'
              }} 
              onError={(e) => {
                console.error('Image failed to load:', message.fileUrl);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            {/* Fallback text if image fails to load */}
            <Typography 
              variant="body2" 
              sx={{ display: 'none', fontStyle: 'italic', color: 'grey.600' }}
            >
              📷 Image attachment
            </Typography>
            {/* Show content text if available along with image */}
            {message.content && (
              <Typography variant="body1" sx={{ mt: 1 }}>
                {message.content}
              </Typography>
            )}
          </Box>
        ) : hasFile && !isImage ? (
          /* Render non-image file as download link */
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              📎 <a 
                href={`${config.BACKEND_URL}${message.fileUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {message.content || 'Download file'}
              </a>
            </Typography>
          </Box>
        ) : (
          /* Render text message */
          message.content && (
            <Typography variant="body1">{message.content}</Typography>
          )
        )}
        
        {/* Timestamp and seen indicators */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'grey.600', mr: 0.5 }}>
            {moment(message.createdAt).format('h:mm A')}
          </Typography>
          {isMine && (
            message.seen ? <DoneAllIcon fontSize="small" color="primary" /> : <DoneIcon fontSize="small" color="disabled" />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MessageBubble;