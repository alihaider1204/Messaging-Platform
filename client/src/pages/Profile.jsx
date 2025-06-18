import React, { useState } from 'react';
import { Box, Container, Typography, Avatar, TextField, Button, IconButton, Alert } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user?.avatar ? `${config.BACKEND_URL}${user.avatar}` : '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatar(file);
    setPreview(file ? URL.createObjectURL(file) : (user.avatar ? `${config.BACKEND_URL}${user.avatar}` : ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (avatar) formData.append('avatar', avatar);
      const res = await api.patch(`/users/${user._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(res.data);
      setSuccess('Profile updated!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ alignSelf: 'flex-start', mb: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
        </Box>
        <Typography component="h1" variant="h5">Profile</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Avatar src={preview} sx={{ width: 80, height: 80, mb: 1 }} />
            <IconButton component="label">
              <PhotoCamera />
              <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
            </IconButton>
          </Box>
          <TextField
            margin="normal"
            fullWidth
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
            Save
          </Button>
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </Box>
    </Container>
  );
};

export default Profile; 