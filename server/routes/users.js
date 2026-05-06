import express from 'express';
import User from '../models/User.js';
import multer from 'multer';
import authMiddleware from '../utils/authMiddleware.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for avatar'), false);
      }
    } else {
      cb(null, true);
    }
  },
});

// Get current user (protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users (protected — requires login to see the user list)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update own profile (protected — users can only update their own profile)
router.patch('/:userId', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;

    // IDOR protection: only allow users to update their own profile
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: cannot update another user\'s profile' });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ message: 'User not found' });

    const update = {};
    const { name } = req.body;

    if (name && name.trim() !== '') {
      update.name = name.trim();
    }

    if (req.file) {
      // Delete old Cloudinary avatar if present
      if (existingUser.avatar && existingUser.avatar.includes('cloudinary.com')) {
        await deleteFromCloudinary(existingUser.avatar);
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'whatsapp-clone/avatars',
        isAvatar: true,
        public_id: `avatar_${userId}_${Date.now()}`,
      });
      update.avatar = uploadResult.secure_url;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json(updatedUser);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

export default router;
