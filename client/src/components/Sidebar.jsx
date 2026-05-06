import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemAvatar, ListItemText,
  Avatar, Typography, Badge, Divider, IconButton, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Skeleton,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import socket from '../utils/socket';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { chatAppBarSx } from '../chatAppBar';

const Sidebar = ({ selectedChat, onSelectChat, onlineUsers, onBack, isMobile, onSidebarDataReadyChange }) => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarBootstrapDone, setSidebarBootstrapDone] = useState(false);
  const navigate = useNavigate();

  // Fetch users and chats on mount / when user changes
  useEffect(() => {
    if (!user) return;
    setSidebarBootstrapDone(false);
    onSidebarDataReadyChange?.(false);
    const fetchData = async () => {
      try {
        const [usersRes, chatsRes] = await Promise.all([
          api.get('/users'),
          api.get(`/chats/${user._id}`),
        ]);
        setUsers(usersRes.data.filter(u => u._id !== user._id));
        setChats(chatsRes.data);

        // Fetch last message for each chat (parallel)
        const lastMsgs = {};
        const unreadMap = {};
        await Promise.all(
          chatsRes.data.map(async (chat) => {
            const res = await api.get(`/messages/${chat._id}`);
            const messages = res.data || [];
            if (messages.length > 0) {
              lastMsgs[chat._id] = messages[messages.length - 1];
              unreadMap[chat._id] = messages.filter(
                (msg) =>
                  !msg.seen &&
                  (msg.sender?._id || msg.sender) !== user._id
              ).length;
            }
          })
        );
        setLastMessages(lastMsgs);
        setUnreadCounts(unreadMap);
      } catch (err) {
        console.error('Failed to fetch sidebar data:', err);
      } finally {
        setSidebarBootstrapDone(true);
        onSidebarDataReadyChange?.(true);
      }
    };
    fetchData();
  }, [user, onSidebarDataReadyChange]);

  // Real-time sidebar updates
  useEffect(() => {
    if (!user) return;

    const handleReceive = (msg) => {
      const chatId = msg.chat || msg.chatId;
      setLastMessages((prev) => ({ ...prev, [chatId]: msg }));
      const senderId = msg.sender?._id || msg.sender;
      if (senderId !== user._id && selectedChat?._id !== chatId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || 0) + 1,
        }));
      }
      setChats((prevChats) => {
        if (!prevChats.find((c) => c._id === chatId)) {
          api.get(`/chats/${user._id}`).then((res) => setChats(res.data)).catch(() => {});
        }
        return prevChats;
      });
    };

    const handleSend = (data) => {
      const message = data.message || data;
      const chatId = message.chat || message.chatId;
      setLastMessages((prev) => ({ ...prev, [chatId]: message }));
      setChats((prevChats) => {
        if (!prevChats.find((c) => c._id === chatId)) {
          api.get(`/chats/${user._id}`).then((res) => setChats(res.data)).catch(() => {});
        }
        return prevChats;
      });
    };

    const handleNewChat = ({ users: chatUsers }) => {
      if (chatUsers.includes(user._id)) {
        api.get(`/chats/${user._id}`).then((res) => setChats(res.data)).catch(() => {});
      }
    };

    socket.on('receive-message', handleReceive);
    socket.on('send-message', handleSend);
    socket.on('new-chat', handleNewChat);

    return () => {
      socket.off('receive-message', handleReceive);
      socket.off('send-message', handleSend);
      socket.off('new-chat', handleNewChat);
    };
  }, [user, selectedChat]);

  // Clear unread count when a chat is opened
  useEffect(() => {
    if (!selectedChat?._id) return;
    setUnreadCounts((prev) => ({
      ...prev,
      [selectedChat._id]: 0,
    }));
  }, [selectedChat]);

  const sortedNewChatUsers = useMemo(() => {
    const ou = onlineUsers ?? [];
    const rankOnline = (id) => {
      const i = ou.indexOf(id);
      return i === -1 ? -1 : i;
    };
    const isOnline = (u) => ou.includes(u._id) || !!u.online;

    return [...users].sort((a, b) => {
      const aOn = isOnline(a);
      const bOn = isOnline(b);
      if (aOn !== bOn) return aOn ? -1 : 1;
      if (aOn && bOn) {
        return rankOnline(b._id) - rankOnline(a._id);
      }
      const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (aT !== bT) return bT - aT;
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
  }, [users, onlineUsers]);

  if (!user) return null;

  const handleConfirmLogout = () => {
    setLogoutOpen(false);
    logout();
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header — same height / padding as ChatWindow (see chatAppBar.js) */}
      <Box sx={{ ...chatAppBarSx, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {isMobile && onBack && (
            <IconButton onClick={onBack} sx={{ mr: 1, color: 'white', p: 0.75 }} size="small">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </IconButton>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'white' }} noWrap>
            Chats
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Tooltip title="Profile">
            <IconButton onClick={() => navigate('/profile')} size="small" sx={{ color: 'white', p: 0.75 }}>
              <AccountCircleIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={() => setLogoutOpen(true)} size="small" sx={{ color: 'white', p: 0.75 }}>
              <LogoutIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Chat list + new chat (skeleton until users/chats load) */}
      {!sidebarBootstrapDone ? (
        <>
          <List sx={{ flex: 1, overflowY: 'hidden', py: 0 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ListItem key={i} divider sx={{ py: 1.25 }}>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} animation="wave" />
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton variant="text" width="72%" animation="wave" />}
                  secondary={<Skeleton variant="text" width="40%" animation="wave" />}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 1.5, pb: 1 }}>
            <Skeleton variant="rounded" width={76} height={14} sx={{ borderRadius: 1 }} animation="wave" />
          </Box>
          <List dense sx={{ overflowY: 'hidden', maxHeight: 220, py: 0 }}>
            {[1, 2, 3, 4].map((i) => (
              <ListItem key={i} sx={{ py: 1 }}>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={36} height={36} animation="wave" />
                </ListItemAvatar>
                <Skeleton variant="text" width={`${52 + i * 8}%`} animation="wave" />
              </ListItem>
            ))}
          </List>
        </>
      ) : (
        <>
          <List sx={{ flex: 1, overflowY: 'auto', py: 0 }}>
            {chats.map((chat) => {
              const otherUser = chat.users?.find((u) => u._id !== user._id);
              if (!otherUser) return null;
              const lastMsg = lastMessages[chat._id];
              const isOnline = onlineUsers?.includes(otherUser._id);
              const unreadCount = unreadCounts[chat._id] || 0;

              return (
                <ListItem key={chat._id} disablePadding divider>
                  <ListItemButton
                    selected={selectedChat?._id === chat._id}
                    onClick={() => onSelectChat(chat)}
                    sx={{ py: 1.5 }}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="success"
                        variant={isOnline ? 'dot' : undefined}
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar src={otherUser.avatar || undefined}>
                          {!otherUser.avatar && (otherUser.name?.[0] || '?')}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={otherUser.name}
                      primaryTypographyProps={{ noWrap: true, fontWeight: 500 }}
                      secondary={
                        lastMsg ? (
                          <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                              {lastMsg.type === 'file' || lastMsg.type === 'image' || lastMsg.fileUrl
                                ? '📎 Attachment'
                                : lastMsg.content}
                            </span>
                            <span style={{ color: unreadCount > 0 ? '#128C7E' : '#888', fontSize: 11, flexShrink: 0 }}>
                              {moment(lastMsg.createdAt).format('h:mm A')}
                            </span>
                          </span>
                        ) : null
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    {unreadCount > 0 && (
                      <Box
                        sx={{
                          minWidth: 20,
                          height: 20,
                          px: unreadCount > 9 ? 0.8 : 0,
                          borderRadius: 10,
                          bgcolor: '#25D366',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          ml: 1,
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Box>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Divider />

          <Box sx={{ p: 1.5, pb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              New Chat
            </Typography>
          </Box>
          <List dense sx={{ overflowY: 'auto', maxHeight: 220, py: 0 }}>
            {sortedNewChatUsers.map((u) => (
              <ListItem key={u._id} disablePadding>
                <ListItemButton onClick={() => onSelectChat(null, u)} sx={{ py: 1 }}>
                  <ListItemAvatar>
                    <Badge
                      color="success"
                      variant={onlineUsers?.includes(u._id) ? 'dot' : undefined}
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                      <Avatar src={u.avatar || undefined} sx={{ width: 36, height: 36 }}>
                        {!u.avatar && (u.name?.[0] || '?')}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.name}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)} aria-labelledby="logout-dialog-title">
        <DialogTitle id="logout-dialog-title">Log out?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You will need to sign in again to view your chats.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setLogoutOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmLogout} variant="contained" color="error" disableElevation>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sidebar;
