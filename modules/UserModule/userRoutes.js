// modules/UserModule/userRoutes.js
// User routes — self-contained copy for team sharing via UserModule
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('./userModel');
const { protect } = require('./authMiddleware');

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists!' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ name, email, phone, password: hashedPassword, role: role || 'Customer' });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully! ✅' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'No user found with this email!' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid password!' });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ message: 'Login successful! 🎉', token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// GET /profile (protected)
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.status(200).json({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Profile Fetch Error:', error);
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// PUT /profile (protected)
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }
            const updatedUser = await user.save();
            res.status(200).json({ message: 'Profile updated successfully! ✅', id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, role: updatedUser.role });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

module.exports = router;
