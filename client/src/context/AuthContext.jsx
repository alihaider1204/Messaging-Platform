import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  // Function to update user data
  const updateUser = (userData) => {
    if (userData) {
      // Ensure we're using the server's user data directly
      setUser(userData);
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    // Try to get user from localStorage first
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      updateUser(JSON.parse(storedUser));
    }

    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch fresh user data from server
      api.get('/users/me')
        .then(res => updateUser(res.data))
        .catch(() => {
          updateUser(null);
          setToken(null);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          navigate('/login');
        });
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      updateUser(null);
    }
    // eslint-disable-next-line
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    updateUser(res.data.user);
    setToken(res.data.token);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    updateUser(res.data.user);
    setToken(res.data.token);
    return res.data.user;
  };

  const logout = () => {
    updateUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  // Expose updateUser in the context so components can update user data
  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      setUser: updateUser // Use updateUser instead of setUser directly
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 