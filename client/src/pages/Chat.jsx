import React, { useEffect, useState } from 'react';
import { Grid, useMediaQuery, Drawer, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import socket from '../utils/socket';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    if (!user) return;
    socket.connect();
    socket.emit('join', user._id);
    socket.on('online-users', setOnlineUsers);
    return () => {
      socket.off('online-users', setOnlineUsers);
      socket.disconnect();
    };
  }, [user]);

  const handleSelectChat = (chat, userToChat) => {
    setSelectedChat(chat);
    setSelectedUser(userToChat || null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleBack = () => {
    setSelectedChat(null);
    setSelectedUser(null);
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {isMobile ? (
        <>
          {(!selectedChat && !selectedUser) && (
            <Drawer open={true} variant="persistent" anchor="left" PaperProps={{ sx: { width: 320 } }}>
              <Sidebar selectedChat={selectedChat} onSelectChat={handleSelectChat} onlineUsers={onlineUsers} onBack={handleBack} isMobile={isMobile} />
            </Drawer>
          )}
          {(selectedChat || selectedUser) && (
            <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
              <IconButton onClick={handleBack} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, bgcolor: 'white' }}>
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ pt: 6 }}>
                <ChatWindow selectedChat={selectedChat} selectedUser={selectedUser} />
              </Box>
            </Box>
          )}
        </>
      ) : (
        <Grid container>
          <Grid item sx={{ width: 320, borderRight: 1, borderColor: 'divider' }}>
            <Sidebar selectedChat={selectedChat} onSelectChat={handleSelectChat} onlineUsers={onlineUsers} />
          </Grid>
          <Grid item xs>
            <ChatWindow selectedChat={selectedChat} selectedUser={selectedUser} />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Chat; 