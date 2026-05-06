import React, { useEffect, useState, useCallback } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import socket from '../utils/socket';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarDataReady, setSidebarDataReady] = useState(false);
  const isMobile = useMediaQuery('(max-width:960px)');

  useEffect(() => {
    if (user?._id) setSidebarDataReady(false);
  }, [user?._id]);

  const handleSidebarDataReadyChange = useCallback((ready) => {
    setSidebarDataReady(!!ready);
  }, []);

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
  };

  const handleBack = () => {
    setSelectedChat(null);
    setSelectedUser(null);
  };

  const hasActiveChat = selectedChat || selectedUser;

  return (
    <Box sx={{ height: '100dvh', width: '100vw', overflow: 'hidden', display: 'flex' }}>
      {isMobile ? (
        /* Mobile / Tablet: show sidebar OR chat, not both */
        <>
          {!hasActiveChat && (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Sidebar
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                onlineUsers={onlineUsers}
                isMobile={isMobile}
                onSidebarDataReadyChange={handleSidebarDataReadyChange}
              />
            </Box>
          )}
          {hasActiveChat && (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <ChatWindow
                selectedChat={selectedChat}
                selectedUser={selectedUser}
                onlineUsers={onlineUsers}
                onBack={handleBack}
                bootstrapSkeleton={!sidebarDataReady}
              />
            </Box>
          )}
        </>
      ) : (
        /* Desktop: sidebar + chat side-by-side, both are equal-height flex children */
        <>
          <Box sx={{
            width: 320,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Sidebar
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
              onlineUsers={onlineUsers}
              onSidebarDataReadyChange={handleSidebarDataReadyChange}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <ChatWindow
              selectedChat={selectedChat}
              selectedUser={selectedUser}
              onlineUsers={onlineUsers}
              bootstrapSkeleton={!sidebarDataReady}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default Chat;
