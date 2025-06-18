import express from 'express';
import User from '../models/User.js';
import multer from 'multer';
import authMiddleware from '../utils/authMiddleware.js';

const router = express.Router();

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Get current user (for session management)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users (for chat sidebar)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user profile (name, avatar)
router.patch('/:userId', upload.single('avatar'), async (req, res) => {
  try {
    const { name } = req.body;
    const update = {};
    if (name) update.name = name;
    if (req.file) update.avatar = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 