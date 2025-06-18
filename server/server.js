import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import messageRoutes from './routes/message.js';
import User from './models/User.js';
import usersRoutes from './routes/users.js';
import Message from './models/Message.js';

// Load environment variables
dotenv.config();

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
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Ensure uploads directory exists
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

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
  // User joins with their userId
  socket.on('join', async (userId) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { online: true });
    io.emit('online-users', Array.from(onlineUsers.keys()));
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
    await Message.updateMany({ chat: chatId, sender: { $ne: userId }, seen: false }, { $set: { seen: true } });
    const senderSocket = onlineUsers.get(senderId);
    if (senderSocket) {
      io.to(senderSocket).emit('messages-seen', { chatId });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { online: false });
        break;
      }
    }
    io.emit('online-users', Array.from(onlineUsers.keys()));
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 