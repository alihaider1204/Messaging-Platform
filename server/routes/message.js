import express from 'express';
import multer from 'multer';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Send a message (text or file/image)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { chatId, sender, content, type } = req.body;
    let fileUrl = '';
    let msgType = type || 'text';
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      // Detect if file is an image
      if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
        msgType = 'image';
      } else {
        msgType = 'file';
      }
    }
    const message = await Message.create({
      chat: chatId,
      sender,
      content,
      type: msgType,
      fileUrl
    });
    await Chat.findByIdAndUpdate(chatId, { $set: { updatedAt: new Date() } });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all messages for a chat
router.get('/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId }).populate('sender', '-password');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all messages in a chat as seen by the recipient
router.patch('/seen/:chatId/:userId', async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    await Message.updateMany({ chat: chatId, sender: { $ne: userId }, seen: false }, { $set: { seen: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 