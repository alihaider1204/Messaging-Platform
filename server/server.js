// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// Debug: Check if env vars are loaded
console.log('Environment check:', {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '***' : 'undefined',
  MONGO_URI: process.env.MONGO_URI ? '***' : 'undefined',
  JWT_SECRET: process.env.JWT_SECRET ? '***' : 'undefined',
  PORT: process.env.PORT
});

// Import modules (including cloudinary utilities)
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

// NOW verify Cloudinary configuration (after imports)
try {
  verifyCloudinaryConfig();
} catch (error) {
  console.error('Failed to verify Cloudinary configuration:', error.message);
  console.log('Server will continue, but file uploads may not work properly');
}

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', usersRoutes);

app.get('/', (req, res) => {
  res.send('WhatsApp Clone API Running');
});

// --- Socket.IO Real-Time Logic ---
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their userId
  socket.on('join', async (userId) => {
    try {
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { online: true });
      io.emit('online-users', Array.from(onlineUsers.keys()));
      console.log(`User ${userId} joined with socket ${socket.id}`);
    } catch (error) {
      console.error('Error in join event:', error);
    }
  });

  // Typing indicator
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

  // Send message
  socket.on('send-message', ({ message, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive-message', message);
    }
  });

  // Mark messages as seen
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

  // Handle new chat creation
  socket.on('new-chat', ({ chatId, users }) => {
    users.forEach(userId => {
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
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
      io.emit('online-users', Array.from(onlineUsers.keys()));
      console.log('User disconnected:', socket.id);
    } catch (error) {
      console.error('Error in disconnect event:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});