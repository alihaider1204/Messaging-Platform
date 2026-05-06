import express from 'express';
import multer from 'multer';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import authMiddleware from '../utils/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All message routes require authentication
router.use(authMiddleware);

// Send a message (text or file/image)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { chatId, sender, content, type } = req.body;
    if (!chatId || !sender) {
      return res.status(400).json({ message: 'chatId and sender are required' });
    }

    let fileUrl = '';
    let msgType = type || 'text';

    if (req.file) {
      const uploadFromBuffer = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          // Credentials come from cloudinary.config() — do NOT pass them as upload options
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'whatsapp-clone/messages' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
      };

      try {
        const result = await uploadFromBuffer(req.file.buffer);
        fileUrl = result.secure_url;
        msgType = req.file.mimetype?.startsWith('image/') ? 'image' : 'file';
        const message = await Message.create({ chat: chatId, sender, content, type: msgType, fileUrl });
        await Chat.findByIdAndUpdate(chatId, { $set: { updatedAt: new Date() } });
        return res.status(201).json(message);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ message: 'File upload failed', error: uploadError.message });
      }
    }

    const message = await Message.create({ chat: chatId, sender, content, type: msgType, fileUrl });
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
