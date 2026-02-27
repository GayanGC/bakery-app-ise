// routes/userRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// POST API - User Registration (SCRUM-7)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Email eken user kenek kalinma innawada balanawa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Me email eken kalin register wela thiyenne!" });
    }

    // Password eka encrypt (hash) karanawa security ekata
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Aluth user wa hadanawa
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || 'Customer'
    });

    // Database ekata save karanawa
    await newUser.save();
    res.status(201).json({ message: "User registered successfully! ✅" });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server Error ekak awa" });
  }
});
// POST API - User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Email eka database eke thiyenawada balanawa
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Me email eken user kenek na!" });
    }

    // 2. Password eka match wenawada balanawa (bcrypt walin)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password eka waradiy!" });
    }

    // 3. Dekama hari nam, Token eka hadanawa
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token eka dawasakin expire wenawa
    );

    // 4. Success message ekai, token ekai user details ekai yawanawa
    res.status(200).json({
      message: "Login successful! 🎉",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error ekak awa" });
  }
});

// GET API - Get User Profile (Protected Route)
router.get('/profile', protect, async (req, res) => {
  try {
    // req.user is already authenticated and attached by the 'protect' middleware
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      // Return the user profile details
      res.status(200).json({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// PUT API - Update User Profile (Protected Route)
router.put('/profile', protect, async (req, res) => {
  try {
    // 1. Find the user in the database using the ID from the token
    const user = await User.findById(req.user._id);

    if (user) {
      // 2. Update user fields if new data is provided in the request body, 
      // otherwise keep the old data
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;

      // 3. If the user sent a new password, encrypt (hash) it before saving
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      // 4. Save the updated user to the database
      const updatedUser = await user.save();

      // 5. Send back the updated user details with a success message
      res.status(200).json({
        message: "Profile updated successfully! ✅",
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


module.exports = router;