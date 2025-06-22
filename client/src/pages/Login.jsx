import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, InputAdornment, IconButton } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (e) => e.preventDefault();

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', position: 'relative', overflow: 'auto' }}>
      {/* Background Layer */}
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          background: 'radial-gradient(circle at 70% 30%, #2af598 0%, #009efd 100%)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />
      {/* Foreground Content */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: 350,
            bgcolor: 'rgba(0, 0, 0, 0.45)',
            borderRadius: 4,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ color: '#b2fefa', mb: 3, letterSpacing: 2, fontWeight: 600 }}>
            MEMBER LOGIN
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              margin="normal"
              required
              fullWidth
              placeholder="Email"
              type="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#b2fefa' }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'rgba(0,0,0,0.25)',
                  borderRadius: 1,
                  input: { color: '#fff' },
                },
              }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#b2fefa' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      tabIndex={-1}
                      sx={{ color: '#b2fefa' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'rgba(0,0,0,0.25)',
                  borderRadius: 1,
                  input: { color: '#fff' },
                },
              }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: 'rgba(178,254,250,0.9)',
                color: '#222',
                fontWeight: 600,
                letterSpacing: 1,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#2af598', color: '#111' },
              }}
            >
              LOGIN
            </Button>
          </Box>
          <Button
            component={Link}
            to="/register"
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              bgcolor: '#2af598',
              color: '#111',
              fontWeight: 600,
              letterSpacing: 1,
              borderRadius: 1,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#009efd', color: '#fff' },
            }}
          >
            REGISTER
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Login; 