import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import messageRoutes from './routes/message.js';
import User from './models/User.js';
import usersRoutes from './routes/users.js';
import Message from './models/Message.js';
import { verifyCloudinaryConfig } from './utils/cloudinary.js';

// Verify Cloudinary config on startup
try {
  verifyCloudinaryConfig();
} catch (error) {
  console.error('Cloudinary configuration error:', error.message);
  console.log('File uploads may not work until Cloudinary is configured.');
}

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new SocketServer(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
}));
app.use(express.json());

// MongoDB connection (no deprecated options for Mongoose 7+)
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp-clone')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', usersRoutes);

app.get('/', (req, res) => {
  res.send('ChatSphere- Realtime Messaging App API Running');
});

// --- Socket.IO Real-Time Logic ---
const onlineUsers = new Map(); // userId -> socketId

// Helper: check if a string is a valid MongoDB ObjectId
const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

io.on('connection', (socket) => {
  // User joins — validate userId format before trusting it
  socket.on('join', async (userId) => {
    if (!userId || !isValidObjectId(userId)) return;
    try {
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { online: true });
      io.emit('online-users', Array.from(onlineUsers.keys()));
    } catch (error) {
      console.error('Error in join event:', error);
    }
  });

  // Typing indicators — forward to receiver only
  socket.on('typing', ({ chatId, senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('typing', { chatId, senderId });
    }
  });

  socket.on('stop-typing', ({ chatId, senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('stop-typing', { chatId, senderId });
    }
  });

  // Deliver a message to the specified receiver
  socket.on('send-message', ({ message, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive-message', message);
    }
  });

  // Delivery confirmation — receiver tells sender the message arrived
  socket.on('message-delivered', ({ messageId, senderId }) => {
    const senderSocket = onlineUsers.get(senderId);
    if (senderSocket) {
      io.to(senderSocket).emit('message-delivered', { messageId });
    }
  });

  // Mark messages as seen and notify the sender
  socket.on('seen-messages', async ({ chatId, userId, senderId }) => {
    try {
      await Message.updateMany(
        { chat: chatId, sender: { $ne: userId }, seen: false },
        { $set: { seen: true } }
      );
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) {
        io.to(senderSocket).emit('messages-seen', { chatId });
      }
    } catch (error) {
      console.error('Error updating message seen status:', error);
    }
  });

  // Notify users when a new chat is created
  socket.on('new-chat', ({ chatId, users }) => {
    users.forEach((userId) => {
      const userSocket = onlineUsers.get(userId);
      if (userSocket) {
        io.to(userSocket).emit('chat-created', { chatId });
      }
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { online: false });
          break;
        }
      }
      io.emit('online-users', Array.from(onlineUsers.keys()));
    } catch (error) {
      console.error('Error in disconnect event:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
