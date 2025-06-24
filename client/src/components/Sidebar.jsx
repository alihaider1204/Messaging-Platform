import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemAvatar, ListItemText, Avatar, Typography, Badge, Divider, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import socket from '../utils/socket';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const Sidebar = ({ selectedChat, onSelectChat, onlineUsers }) => {
  // ALL hooks must be declared at the top level, unconditionally
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const navigate = useNavigate();

  // Fetch users and chats
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const usersRes = await api.get('/users');
      setUsers(usersRes.data.filter(u => u._id !== user._id));
      const chatsRes = await api.get(`/chats/${user._id}`);
      setChats(chatsRes.data);
      // Fetch last message for each chat
      const lastMsgs = {};
      await Promise.all(chatsRes.data.map(async chat => {
        const res = await api.get(`/messages/${chat._id}`);
        if (res.data.length > 0) {
          lastMsgs[chat._id] = res.data[res.data.length - 1];
        }
      }));
      setLastMessages(lastMsgs);
    };
    fetchData();
  }, [user]);

  // Listen for new messages and update last message in real time
  useEffect(() => {
    if (!user) return;
    const handleReceive = (msg) => {
      setLastMessages(prev => ({ ...prev, [msg.chat]: msg }));
      // If chat is not in the list, refetch chats
      if (!chats.find(c => c._id === msg.chat)) {
        api.get(`/chats/${user._id}`).then(res => setChats(res.data));
      }
    };
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [chats, user]);

  // Also update last message when you send a message
  useEffect(() => {
    if (!user) return;
    const handleSend = (msg) => {
      setLastMessages(prev => ({ ...prev, [msg.chat]: msg }));
      if (!chats.find(c => c._id === msg.chat)) {
        api.get(`/chats/${user._id}`).then(res => setChats(res.data));
      }
    };
    socket.on('send-message', handleSend);
    return () => socket.off('send-message', handleSend);
  }, [chats, user]);

  // Early return ONLY after ALL hooks are declared
  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  return (
    <Box sx={{ width: 320, bgcolor: 'background.paper', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Chats</Typography>
        <Box>
          <Tooltip title="Profile/Settings">
            <IconButton onClick={handleProfile} size="large">
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} size="large">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <List sx={{ flex: 1, overflowY: 'auto' }}>
        {chats.map(chat => {
          const otherUser = chat.users.find(u => u._id !== user._id);
          const lastMsg = lastMessages[chat._id];
          return (
            <ListItem button key={chat._id} selected={selectedChat?._id === chat._id} onClick={() => onSelectChat(chat)} alignItems="flex-start">
              <ListItemAvatar>
                <Badge
                  color="success"
                  variant={onlineUsers?.includes(otherUser._id) ? 'dot' : undefined}
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <Avatar src={otherUser.avatar ? `${config.BACKEND_URL}${otherUser.avatar}` : undefined}>
                    {!otherUser.avatar && otherUser.name[0]}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={otherUser.name}
                secondary={lastMsg ? (
                  <span>
                    {(lastMsg.type === 'file' || lastMsg.type === 'image' || lastMsg.fileUrl) ? '📎 Attachment' : lastMsg.content}
                    <span style={{ float: 'right', color: '#888', fontSize: 12 }}>
                      {moment(lastMsg.createdAt).format('h:mm A')}
                    </span>
                  </span>
                ) : null}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">Start new chat</Typography>
        <List dense>
          {users.map(u => (
            <ListItem button key={u._id} onClick={() => onSelectChat(null, u)}>
              <ListItemAvatar>
                <Badge
                  color="success"
                  variant={onlineUsers?.includes(u._id) ? 'dot' : undefined}
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                  <Avatar src={u.avatar ? `${config.BACKEND_URL}${u.avatar}` : undefined}>
                    {!u.avatar && u.name[0]}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText primary={u.name} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;