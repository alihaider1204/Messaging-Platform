import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, CircularProgress } from '@mui/material';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import socket from '../utils/socket';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import MessageBubble from './MessageBubble';
import config from '../config';
import Modal from '@mui/material/Modal';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const ChatWindow = ({ selectedChat, selectedUser }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeout = useRef();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);

  // Define chatUser at the top before any useEffect
  const chatUser = selectedUser || selectedChat?.users?.find(u => u._id !== user._id);
  const chatId = selectedChat?._id;

  // Fetch messages when chat changes
  useEffect(() => {
    if (!selectedChat && !selectedUser) return;
    setLoading(true);
    const fetchMessages = async () => {
      let chatId = selectedChat?._id;
      if (!chatId && selectedUser) {
        // Create or get chat with selectedUser
        const res = await api.post('/chats', { userId1: user._id, userId2: selectedUser._id });
        chatId = res.data._id;
      }
      if (chatId) {
        const res = await api.get(`/messages/${chatId}`);
        setMessages(res.data);
      }
      setLoading(false);
    };
    fetchMessages();
  }, [selectedChat, selectedUser, user]);

  // Real-time message receiving
  useEffect(() => {
    const handleReceive = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator logic
  const handleTyping = () => {
    if (!chatUser) return;
    socket.emit('typing', { chatId, senderId: user._id, receiverId: chatUser._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop-typing', { chatId, senderId: user._id, receiverId: chatUser._id });
    }, 1200);
  };

  useEffect(() => {
    const handleTypingEvent = ({ chatId: tChatId, senderId }) => {
      if (chatUser && senderId === chatUser._id) setOtherTyping(true);
    };
    const handleStopTyping = ({ chatId: tChatId, senderId }) => {
      if (chatUser && senderId === chatUser._id) setOtherTyping(false);
    };
    socket.on('typing', handleTypingEvent);
    socket.on('stop-typing', handleStopTyping);
    return () => {
      socket.off('typing', handleTypingEvent);
      socket.off('stop-typing', handleStopTyping);
    };
  }, [chatUser]);

  // Send message
  const handleSend = async ({ content, file }) => {
    let chat_id = chatId;
    let isNewChat = false;
    if (!chat_id && selectedUser) {
      // Create chat if not exists
      const res = await api.post('/chats', { userId1: user._id, userId2: selectedUser._id });
      chat_id = res.data._id;
      isNewChat = true;
    }
    let messageData = { chatId: chat_id, sender: user._id, content, type: file ? 'file' : 'text' };
    let newMsg;
    if (file) {
      const formData = new FormData();
      Object.entries(messageData).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', file);
      const res = await api.post('/messages', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      newMsg = res.data;
    } else {
      const res = await api.post('/messages', messageData);
      newMsg = res.data;
    }
    // Ensure newMsg has a 'chat' property for socket events
    if (!newMsg.chat && newMsg.chatId) newMsg.chat = newMsg.chatId;
    setMessages((prev) => [...prev, newMsg]);
    socket.emit('send-message', { message: newMsg, receiverId: chatUser._id });
    socket.emit('send-message', { message: newMsg, receiverId: user._id });
    if (isNewChat) {
      // Notify both users to refresh their chat list
      socket.emit('new-chat', { chatId: chat_id, users: [user._id, chatUser._id] });
    }
    socket.emit('stop-typing', { chatId: chat_id, senderId: user._id, receiverId: chatUser._id });
  };

  // Mark messages as seen when chat is open and messages are received
  useEffect(() => {
    if (!chatUser) return;
    if (!selectedChat && !selectedUser) return;
    const chat_id = selectedChat?._id;
    if (!chat_id) return;
    // Patch API to mark as seen
    api.patch(`/messages/seen/${chat_id}/${user._id}`);
    // Emit socket event
    socket.emit('seen-messages', { chatId: chat_id, userId: user._id, senderId: chatUser._id });
  }, [messages, chatUser, selectedChat, selectedUser, user]);

  // Listen for 'messages-seen' to update seen status
  useEffect(() => {
    const handleMessagesSeen = ({ chatId }) => {
      if (selectedChat && chatId === selectedChat._id) {
        setMessages((msgs) => msgs.map(m => ({ ...m, seen: true })));
      }
    };
    socket.on('messages-seen', handleMessagesSeen);
    return () => socket.off('messages-seen', handleMessagesSeen);
  }, [selectedChat]);

  const handleImageClick = (url) => {
    setModalImageUrl(url);
    setImageModalOpen(true);
  };
  const handleModalClose = () => {
    setImageModalOpen(false);
    setModalImageUrl(null);
  };

  if (!selectedChat && !selectedUser) {
    return (
      <Box sx={{ flex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
        <Typography variant="h6" sx={{ opacity: 0.7 }}>
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#ece5dd' }}>
      {/* Chat header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: '#f0f0f0' }}>
        <Avatar src={chatUser?.avatar ? `${config.BACKEND_URL}${chatUser.avatar}` : undefined} sx={{ mr: 2 }}>
          {!chatUser?.avatar && chatUser?.name?.[0]}
        </Avatar>
        <Box>
          <Typography variant="h6">{chatUser?.name}</Typography>
          {otherTyping && <Typography variant="body2" color="primary">typing...</Typography>}
        </Box>
      </Box>
      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {loading ? <CircularProgress /> : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg._id} message={msg} onImageClick={handleImageClick} />
            ))}
            {/* Show animated typing indicator in message area if other user is typing */}
            {otherTyping && <TypingIndicator isTyping={true} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>
      {/* Typing indicator and MessageInput */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f0f0f0' }}>
        <MessageInput onSend={handleSend} disabled={!chatUser} onInput={handleTyping} />
      </Box>
      {/* Image Modal */}
      <Modal
        open={imageModalOpen}
        onClose={handleModalClose}
        aria-labelledby="image-modal-title"
        aria-describedby="image-modal-description"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{ position: 'relative', outline: 'none' }}>
          <IconButton
            onClick={handleModalClose}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, bgcolor: 'rgba(255,255,255,0.7)' }}
            aria-label="Close"
          >
            <CloseIcon fontSize="large" />
          </IconButton>
          {modalImageUrl && (
            <img
              src={modalImageUrl}
              alt="Enlarged preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: 12,
                boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
                display: 'block',
              }}
            />
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default ChatWindow;