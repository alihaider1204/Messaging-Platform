import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Avatar, CircularProgress } from '@mui/material';
import Modal from '@mui/material/Modal';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import socket from '../utils/socket';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import MessageBubble from './MessageBubble';
import { chatAppBarSx } from '../chatAppBar';
import ChatShellSkeleton from './ChatShellSkeleton';

const ChatWindow = ({ selectedChat, selectedUser, onlineUsers, onBack, bootstrapSkeleton }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeout = useRef();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  // Track IDs of messages that have been delivered to the recipient this session
  const [deliveredIds, setDeliveredIds] = useState(new Set());
  const [sending, setSending] = useState(false);

  // ALL hooks declared unconditionally first
  const chatUser = selectedChat?.users?.find(u => u._id !== user?._id) || selectedUser;
  const chatId = selectedChat?._id;
  const isReceiverOnline = !!(chatUser?._id && onlineUsers?.includes(chatUser._id));

  // Fetch messages when chat changes
  useEffect(() => {
    if (!user?._id) return;
    if (!selectedChat && !selectedUser) return;
    setLoading(true);
    const fetchMessages = async () => {
      try {
        let cId = selectedChat?._id;
        if (!cId && selectedUser) {
          const res = await api.post('/chats', { userId1: user._id, userId2: selectedUser._id });
          cId = res.data._id;
        }
        if (cId) {
          const res = await api.get(`/messages/${cId}`);
          setMessages(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [selectedChat, selectedUser, user]);

  // Real-time message receiving + emit delivery confirmation to sender
  useEffect(() => {
    if (!user?._id) return;
    const handleReceive = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      if (senderId !== user._id) {
        setMessages((prev) => [...prev, msg]);
        // Tell the sender their message was delivered
        socket.emit('message-delivered', { messageId: msg._id, senderId });
      }
    };
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [user?._id]);

  // Listen for delivery confirmations on messages WE sent
  useEffect(() => {
    const handleDelivered = ({ messageId }) => {
      setDeliveredIds((prev) => new Set([...prev, messageId]));
    };
    socket.on('message-delivered', handleDelivered);
    return () => socket.off('message-delivered', handleDelivered);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator listeners
  useEffect(() => {
    const handleTypingEvent = ({ senderId }) => {
      if (chatUser && senderId === chatUser._id) setOtherTyping(true);
    };
    const handleStopTyping = ({ senderId }) => {
      if (chatUser && senderId === chatUser._id) setOtherTyping(false);
    };
    socket.on('typing', handleTypingEvent);
    socket.on('stop-typing', handleStopTyping);
    return () => {
      socket.off('typing', handleTypingEvent);
      socket.off('stop-typing', handleStopTyping);
    };
  }, [chatUser]);

  // Mark messages as seen
  useEffect(() => {
    if (!chatUser || !selectedChat?._id || !user?._id) return;
    api.patch(`/messages/seen/${selectedChat._id}/${user._id}`).catch(() => {});
    socket.emit('seen-messages', { chatId: selectedChat._id, userId: user._id, senderId: chatUser._id });
  }, [messages, chatUser, selectedChat, user]);

  // Listen for messages-seen to update seen status
  useEffect(() => {
    const handleMessagesSeen = ({ chatId: seenChatId }) => {
      if (selectedChat && seenChatId === selectedChat._id) {
        setMessages((msgs) => msgs.map(m => ({ ...m, seen: true })));
      }
    };
    socket.on('messages-seen', handleMessagesSeen);
    return () => socket.off('messages-seen', handleMessagesSeen);
  }, [selectedChat]);

  // Early return after all hooks
  if (!user?._id) return null;

  if (!selectedChat && !selectedUser) {
    if (bootstrapSkeleton) {
      return <ChatShellSkeleton showBackSkeleton={!!onBack} />;
    }
    return (
      <Box sx={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        bgcolor: '#f0f4f8',
      }}>
        <Typography variant="h6" sx={{ opacity: 0.6 }}>
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  const handleTyping = () => {
    if (!chatUser) return;
    socket.emit('typing', { chatId, senderId: user._id, receiverId: chatUser._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop-typing', { chatId, senderId: user._id, receiverId: chatUser._id });
    }, 1200);
  };

  const handleSend = async ({ content, file }) => {
    let chat_id = chatId;
    let isNewChat = false;
    setSending(true);
    try {
      if (!chat_id && selectedUser) {
        const res = await api.post('/chats', { userId1: user._id, userId2: selectedUser._id });
        chat_id = res.data._id;
        isNewChat = true;
      }
      let newMsg;
      const messageData = { chatId: chat_id, sender: user._id, content, type: file ? 'file' : 'text' };
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
      if (!newMsg.chat && newMsg.chatId) newMsg.chat = newMsg.chatId;

      setMessages((prev) => [...prev, newMsg]);

      // Deliver to the recipient in real-time
      if (chatUser?._id) {
        socket.emit('send-message', { message: newMsg, receiverId: chatUser._id });
      }
      // Update own sidebar with the sent message
      socket.emit('send-message', { message: newMsg, receiverId: user._id });

      if (isNewChat) {
        socket.emit('new-chat', { chatId: chat_id, users: [user._id, chatUser._id] });
      }
      socket.emit('stop-typing', { chatId: chat_id, senderId: user._id, receiverId: chatUser?._id });
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const handleImageClick = (url) => {
    setModalImageUrl(url);
    setImageModalOpen(true);
  };

  const handleModalClose = () => {
    setImageModalOpen(false);
    setModalImageUrl(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', bgcolor: '#ece5dd' }}>
      {/* Chat header — same bar height as Sidebar; back sits before avatar on mobile */}
      <Box sx={{ ...chatAppBarSx, gap: onBack ? 1 : 1.5 }}>
        {onBack && (
          <IconButton
            onClick={onBack}
            size="small"
            aria-label="Back to chats"
            edge="start"
            sx={{ color: 'white', p: 0.75, flexShrink: 0 }}
          >
            <ArrowBackIcon sx={{ fontSize: 22 }} />
          </IconButton>
        )}
        <Avatar src={chatUser?.avatar || undefined} sx={{ width: 36, height: 36, flexShrink: 0 }}>
          {!chatUser?.avatar && chatUser?.name?.[0]}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'white' }} noWrap component="span">
            {chatUser?.name}
            {otherTyping && (
              <Box component="span" sx={{ color: '#b2fefa', fontWeight: 400, fontSize: '0.8rem', ml: 0.75 }}>
                typing…
              </Box>
            )}
          </Typography>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1, sm: 2 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg._id}
                message={msg}
                onImageClick={handleImageClick}
                otherUser={chatUser}
                isDelivered={deliveredIds.has(msg._id) || isReceiverOnline}
                isReceiverOnline={isReceiverOnline}
              />
            ))}
            {otherTyping && <TypingIndicator isTyping={true} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Message Input */}
      <Box sx={{ p: { xs: 1, sm: 2 }, borderTop: 1, borderColor: 'divider', bgcolor: '#f0f0f0' }}>
        <MessageInput onSend={handleSend} disabled={!chatUser} sending={sending} onInput={handleTyping} />
      </Box>

      {/* Image Modal */}
      <Modal
        open={imageModalOpen}
        onClose={handleModalClose}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
      >
        <Box sx={{ position: 'relative', outline: 'none', maxWidth: '95vw', maxHeight: '95vh' }}>
          <IconButton
            onClick={handleModalClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.55)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={modalImageUrl}
            alt="Full size"
            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', display: 'block', borderRadius: 8 }}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default ChatWindow;
