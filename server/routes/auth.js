import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user but don't return password
    const newUser = await User.create({ name, email, password: hashedPassword });
    const user = await User.findById(newUser._id).select('-password');
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userWithPassword = await User.findOne({ email });
    if (!userWithPassword) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, userWithPassword.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Get user without password
    const user = await User.findById(userWithPassword._id).select('-password');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 