import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';

function AuthTransitionOverlay({ children }) {
  const { authTransition } = useAuth();
  const label = authTransition === 'logging-in' ? 'Logging in…' : authTransition === 'logging-out' ? 'Logging out…' : '';

  return (
    <>
      {children}
      {authTransition && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 13000,
            bgcolor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            pointerEvents: 'auto',
          }}
        >
          <CircularProgress sx={{ color: '#b2fefa' }} size={44} thickness={4} />
          <Typography sx={{ color: 'white', fontWeight: 600, letterSpacing: 0.5 }}>{label}</Typography>
        </Box>
      )}
    </>
  );
}

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#075E54' }} />
      </Box>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#075E54' }} />
      </Box>
    );
  }

  return token ? <Navigate to="/" replace /> : children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CssBaseline />
        <AuthTransitionOverlay>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthTransitionOverlay>
      </AuthProvider>
    </Router>
  );
}

export default App;
