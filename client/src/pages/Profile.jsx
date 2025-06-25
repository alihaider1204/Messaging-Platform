import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Avatar, 
  TextField, 
  Button, 
  IconButton, 
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Set initial preview from user avatar
  useEffect(() => {
    if (user?.avatar) {
      console.log('Setting initial avatar preview:', user.avatar);
      setPreview(user.avatar);
    }
  }, [user]);

  // Cleanup object URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Cleanup previous preview URL if it's an object URL
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }

      setAvatar(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setError('');
      
      console.log('Avatar file selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: objectUrl
      });
    }
  };

  const handleRemoveAvatar = () => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setAvatar(null);
    setPreview(user?.avatar || '');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Check if there are any changes
      const hasNameChange = name !== user?.name;
      const hasAvatarChange = avatar !== null;

      if (!hasNameChange && !hasAvatarChange) {
        setError('No changes to save');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      
      if (hasNameChange) {
        formData.append('name', name);
      }
      
      if (hasAvatarChange) {
        formData.append('avatar', avatar);
      }

      console.log('Submitting profile update...', {
        hasNameChange,
        hasAvatarChange,
        userId: user._id
      });

      const res = await api.patch(`/users/${user._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Profile update response:', res.data);

      // Update user context with the new data
      setUser(res.data);
      
      // Update preview with the new Cloudinary URL if avatar was changed
      if (res.data.avatar) {
        // Cleanup any existing blob URL
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
        setPreview(res.data.avatar);
        console.log('Avatar updated to:', res.data.avatar);
      }
      
      setSuccess('Profile updated successfully!');
      setAvatar(null);
      
      // Navigate after a short delay
      setTimeout(() => navigate('/'), 1500);
      
    } catch (err) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Cleanup preview URL before navigating
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    navigate('/');
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ alignSelf: 'flex-start', mb: 2 }}>
          <IconButton onClick={handleBack} disabled={loading}>
            <ArrowBackIcon />
          </IconButton>
        </Box>
        
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Profile Settings
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
          <Box component="form" onSubmit={handleSubmit}>
            {/* Avatar Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar 
                src={preview || user?.avatar || undefined} 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mb: 2,
                  border: '3px solid #128C7E',
                  fontSize: '2rem'
                }}
              >
                {!preview && !user?.avatar && (user?.name?.[0] || 'U')}
              </Avatar>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  component="label" 
                  disabled={loading}
                  sx={{ 
                    bgcolor: '#128C7E',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#075E54'
                    },
                    '&:disabled': {
                      bgcolor: 'grey.300'
                    }
                  }}
                >
                  <PhotoCamera />
                  <input 
                    type="file" 
                    hidden 
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </IconButton>
                
                {avatar && (
                  <IconButton 
                    onClick={handleRemoveAvatar}
                    disabled={loading}
                    sx={{ 
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'error.dark'
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
              
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                Click camera icon to upload new avatar<br />
                (Max 5MB, images only)
              </Typography>
            </Box>

            {/* Name Field */}
            <TextField
              margin="normal"
              fullWidth
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              variant="outlined"
              placeholder="Enter your name"
            />

            {/* Submit Button */}
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              sx={{ 
                mt: 3,
                mb: 2,
                bgcolor: '#128C7E',
                '&:hover': {
                  bgcolor: '#075E54'
                },
                '&:disabled': {
                  bgcolor: 'grey.300'
                }
              }}
              disabled={loading || (!avatar && name === user?.name)}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>

            {/* Status Messages */}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Profile;