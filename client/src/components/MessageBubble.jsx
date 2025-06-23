import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import config from '../config';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import ArchiveIcon from '@mui/icons-material/Archive';

const MessageBubble = ({ message, onImageClick }) => {
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
              src={message.fileUrl} 
              alt="attachment" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px',
                borderRadius: 8, 
                marginBottom: 4,
                objectFit: 'cover',
                cursor: onImageClick ? 'pointer' : 'default',
              }} 
              onClick={onImageClick ? () => onImageClick(message.fileUrl) : undefined}
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
          /* Render non-image file as download link with icon and file name */
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {/* File type icon */}
            {(() => {
              const ext = message.fileUrl.split('.').pop().toLowerCase();
              if (["pdf"].includes(ext)) return <PictureAsPdfIcon color="error" sx={{ mr: 1 }} />;
              if (["doc", "docx"].includes(ext)) return <DescriptionIcon color="primary" sx={{ mr: 1 }} />;
              if (["xls", "xlsx", "csv"].includes(ext)) return <TableChartIcon color="success" sx={{ mr: 1 }} />;
              if (["txt", "md"].includes(ext)) return <TextSnippetIcon color="action" sx={{ mr: 1 }} />;
              if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return <ArchiveIcon color="secondary" sx={{ mr: 1 }} />;
              return <InsertDriveFileIcon sx={{ mr: 1 }} />;
            })()}
            {/* File name as download link */}
            <Typography variant="body2" component="span">
              <a 
                href={message.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                download
                style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 500 }}
              >
                {message.fileUrl.split('/').pop()}
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