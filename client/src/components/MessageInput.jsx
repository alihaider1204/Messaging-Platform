import React, { useRef, useState, useEffect } from 'react';
import { Box, TextField, IconButton, InputAdornment, Avatar, CircularProgress, Typography, LinearProgress } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

const MessageInput = ({ onSend, disabled, sending, onInput }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef();

  // Manage Object URL lifecycle to prevent memory leaks
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isBusy = disabled || sending;

  const submitMessage = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (sending || disabled) return;
    if (!content.trim() && !file) return;
    const payload = { content: content.trim(), file };
    try {
      await onSend(payload);
      setContent('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // Keep draft — parent already logged; user can retry
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(e);
    }
  };

  const handleInput = (e) => {
    setContent(e.target.value);
    if (onInput) onInput();
  };

  return (
    <Box sx={{ width: '100%' }}>
      {sending && (
        <LinearProgress sx={{ mb: 0.75, borderRadius: 1, bgcolor: 'rgba(7,94,84,0.12)', '& .MuiLinearProgress-bar': { bgcolor: '#128C7E' } }} />
      )}
      <Box component="form" onSubmit={submitMessage} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton component="label" disabled={isBusy} size="small">
          <AttachFileIcon />
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} disabled={isBusy} />
        </IconButton>

        {file && filePreview && (
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              variant="rounded"
              sx={{ width: 36, height: 36 }}
              src={file.type.startsWith('image/') ? filePreview : undefined}
            >
              {!file.type.startsWith('image/') && <AttachFileIcon fontSize="small" />}
            </Avatar>
            <IconButton
              size="small"
              onClick={handleRemoveFile}
              disabled={isBusy}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 16,
                height: 16,
                bgcolor: 'error.main',
                color: 'white',
                '&:hover': { bgcolor: 'error.dark' },
                p: 0,
              }}
            >
              <CloseIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          placeholder={sending ? 'Sending…' : 'Type a message'}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          multiline
          maxRows={4}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={isBusy || (!content.trim() && !file)}
                  size="small"
                  aria-label={sending ? 'Sending message' : 'Send message'}
                >
                  {sending ? (
                    <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: 'white', borderRadius: 2 }}
        />
      </Box>
      {sending && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, px: 0.5, color: 'text.secondary' }}>
          Sending your message…
        </Typography>
      )}
    </Box>
  );
};

export default MessageInput;
