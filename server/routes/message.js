import express from 'express';
import multer from 'multer';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Send a message (text or file/image)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { chatId, sender, content, type } = req.body;
    let fileUrl = '';
    let msgType = type || 'text';

    if (req.file) {
      // Wrap upload_stream in a Promise with explicit config
      const uploadFromBuffer = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              resource_type: 'auto',
              cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
              api_key: process.env.CLOUDINARY_API_KEY,
              api_secret: process.env.CLOUDINARY_API_SECRET
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                return reject(error);
              }
              resolve(result);
            }
          );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
      };

      try {
        console.log('Attempting file upload to Cloudinary...');
        const result = await uploadFromBuffer(req.file.buffer);
        console.log('Cloudinary upload successful:', result.secure_url);
        
        fileUrl = result.secure_url;
        if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
          msgType = 'image';
        } else {
          msgType = 'file';
        }
        
        const message = await Message.create({
          chat: chatId,
          sender,
          content,
          type: msgType,
          fileUrl,
        });
        
        await Chat.findByIdAndUpdate(chatId, { $set: { updatedAt: new Date() } });
        return res.status(201).json(message);
        
      } catch (error) {
        console.error('File upload error:', error);
        return res.status(500).json({ message: error.message });
      }
    }

    // If no file, just create a text message
    const message = await Message.create({
      chat: chatId,
      sender,
      content,
      type: msgType,
      fileUrl,
    });
    
    await Chat.findByIdAndUpdate(chatId, { $set: { updatedAt: new Date() } });
    res.status(201).json(message);
    
  } catch (err) {
    console.error('Message creation error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all messages for a chat
router.get('/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId }).populate('sender', '-password');
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Mark all messages in a chat as seen by the recipient
router.patch('/seen/:chatId/:userId', async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, seen: false }, 
      { $set: { seen: true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark seen error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;