import React, { useRef, useState } from 'react';
import { Box, TextField, IconButton, InputAdornment, Avatar } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';

const MessageInput = ({ onSend, disabled, onInput }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!content && !file) return;
    onSend({ content, file });
    setContent('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInput = (e) => {
    setContent(e.target.value);
    if (onInput) onInput();
  };

  return (
    <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton component="label" disabled={disabled}>
        <AttachFileIcon />
        <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} />
      </IconButton>
      {file && (
        <Avatar variant="rounded" sx={{ width: 32, height: 32, mx: 1 }} src={URL.createObjectURL(file)} />
      )}
      <TextField
        fullWidth
        size="small"
        placeholder="Type a message"
        value={content}
        onChange={handleInput}
        disabled={disabled}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton type="submit" color="primary" disabled={disabled || (!content && !file)}>
                <SendIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{ mx: 1, bgcolor: 'white', borderRadius: 2 }}
      />
    </Box>
  );
};

export default MessageInput; 