import express from 'express';
import User from '../models/User.js';
import multer from 'multer';
import authMiddleware from '../utils/authMiddleware.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Multer setup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log('📁 File filter check:', {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname
    });
    
    if (file.fieldname === 'avatar') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for avatar'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    console.log('👤 Current user fetched:', { id: user._id, name: user.name, avatar: user.avatar });
    res.json(user);
  } catch (err) {
    console.error('❌ Get current user error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('❌ Get all users error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update user profile
router.patch('/:userId', upload.single('avatar'), async (req, res) => {
  console.log('\n🔄 === PROFILE UPDATE REQUEST ===');
  console.log('📋 Request details:', {
    userId: req.params.userId,
    body: req.body,
    hasFile: !!req.file,
    fileDetails: req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : null
  });

  try {
    const { name } = req.body;
    const { userId } = req.params;
    
    // Validate user exists
    console.log('🔍 Looking up user:', userId);
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 Existing user found:', {
      id: existingUser._id,
      name: existingUser.name,
      currentAvatar: existingUser.avatar
    });

    const update = {};
    
    // Update name if provided
    if (name && name.trim() !== '') {
      update.name = name.trim();
      console.log('📝 Name will be updated to:', update.name);
    }

    // Handle avatar upload
    if (req.file) {
      try {
        console.log('\n📤 === AVATAR UPLOAD PROCESS ===');

        // Delete old avatar if it's from Cloudinary
        if (existingUser.avatar && existingUser.avatar.includes('cloudinary.com')) {
          console.log('🗑️ Deleting old Cloudinary avatar...');
          await deleteFromCloudinary(existingUser.avatar);
        } else if (existingUser.avatar) {
          console.log('⚠️ Old avatar is not from Cloudinary, skipping delete:', existingUser.avatar);
        }

        // Upload new avatar using the utility function
        console.log('⬆️ Uploading new avatar to Cloudinary...');
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: 'whatsapp-clone/avatars',
          isAvatar: true,
          public_id: `avatar_${userId}_${Date.now()}`
        });

        update.avatar = uploadResult.secure_url;
        console.log('✅ Avatar upload successful!');
        console.log('🔗 New avatar URL:', uploadResult.secure_url);

      } catch (uploadError) {
        console.error('❌ Avatar upload failed:', uploadError);
        console.error('📊 Upload error details:', {
          message: uploadError.message,
          stack: uploadError.stack
        });
        return res.status(500).json({ 
          message: 'Failed to upload avatar', 
          error: uploadError.message 
        });
      }
    }

    // Check if there are any changes
    if (Object.keys(update).length === 0) {
      console.log('⚠️ No changes provided');
      return res.status(400).json({ message: 'No changes provided' });
    }

    // Update user in database
    console.log('\n💾 === DATABASE UPDATE ===');
    console.log('📝 Updates to apply:', update);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { $set: update }, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      console.log('❌ User not found during update:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Profile updated successfully!');
    console.log('👤 Updated user:', {
      id: updatedUser._id,
      name: updatedUser.name,
      avatar: updatedUser.avatar
    });

    console.log('🔄 === PROFILE UPDATE COMPLETE ===\n');
    res.json(updatedUser);

  } catch (err) {
    console.error('\n❌ === PROFILE UPDATE ERROR ===');
    console.error('💥 Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    });
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: err.errors 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    res.status(500).json({ 
      message: 'Internal server error', 
      error: err.message
    });
  }
});

export default router;