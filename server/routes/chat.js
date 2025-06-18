import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

const router = express.Router();

// Create or get a chat between two users
router.post('/', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    let chat = await Chat.findOne({ users: { $all: [userId1, userId2], $size: 2 }, isGroup: false });
    if (!chat) {
      chat = await Chat.create({ users: [userId1, userId2] });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all chats for a user
router.get('/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ users: req.params.userId }).populate('users', '-password');
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a chat by ID
router.get('/chat/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate('users', '-password');
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 