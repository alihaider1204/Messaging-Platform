import express from 'express';
import Chat from '../models/Chat.js';
import authMiddleware from '../utils/authMiddleware.js';

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Create or get a chat between two users
router.post('/', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    if (!userId1 || !userId2) {
      return res.status(400).json({ message: 'Both userId1 and userId2 are required' });
    }
    let chat = await Chat.findOne({
      users: { $all: [userId1, userId2], $size: 2 },
      isGroup: false,
    }).populate('users', '-password');

    if (!chat) {
      chat = await Chat.create({ users: [userId1, userId2] });
      chat = await Chat.findById(chat._id).populate('users', '-password');
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all chats for a user
router.get('/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ users: req.params.userId })
      .populate('users', '-password')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific chat by ID
router.get('/chat/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate('users', '-password');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
