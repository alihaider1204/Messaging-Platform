import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  chatName: { type: String },
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema); 