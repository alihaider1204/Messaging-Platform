import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

/** Fullscreen overlay duration before routes change (~2–3s) */
const AUTH_TRANSITION_MS = 2600;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  /** null | 'logging-in' | 'logging-out' — drives global overlay */
  const [authTransition, setAuthTransition] = useState(null);
  const navigate = useNavigate();

  const updateUser = (userData) => {
    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);

      const stored = localStorage.getItem('user');
      if (stored) {
        try { updateUser(JSON.parse(stored)); } catch { /* ignore */ }
      }

      api.get('/users/me')
        .then((res) => {
          updateUser(res.data);
        })
        .catch(() => {
          updateUser(null);
          setToken(null);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          navigate('/login');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      updateUser(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setAuthTransition('logging-in');
    try {
      await delay(AUTH_TRANSITION_MS);
      updateUser(res.data.user);
      setToken(res.data.token);
      return res.data.user;
    } finally {
      setAuthTransition(null);
    }
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    setAuthTransition('logging-in');
    try {
      await delay(AUTH_TRANSITION_MS);
      updateUser(res.data.user);
      setToken(res.data.token);
      return res.data.user;
    } finally {
      setAuthTransition(null);
    }
  };

  const logout = () => {
    setAuthTransition('logging-out');
    window.setTimeout(() => {
      updateUser(null);
      setToken(null);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setAuthTransition(null);
      navigate('/login');
    }, AUTH_TRANSITION_MS);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authTransition,
        login,
        register,
        logout,
        setUser: updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
