// UserModule/userRoutes.js  (SCRUM-1)
// Registration, Login with JWT, Profile, PIN management
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('./User');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

// ── POST /register ─────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, pin, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'A user with this email already exists!' });

        if (pin && !/^\d{4}$/.test(String(pin))) {
            return res.status(400).json({ message: 'PIN must be exactly 4 digits.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPwd = await bcrypt.hash(password, salt);
        const hashedPin = pin ? await bcrypt.hash(String(pin), salt) : undefined;

        const newUser = new User({ name, email, phone, password: hashedPwd, pin: hashedPin, role: role || 'Customer' });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully! ✅' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// ── POST /login ────────────────────────────────────────────
// Greeting: "Hello [Name]! Logged in as: [Role]"
// PIN gate: Manager + InventoryManager require Admin-assigned PIN
router.post('/login', async (req, res) => {
    try {
        const { email, password, pin } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'No user found with this email!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid password!' });

        // ── PIN gate for Manager and InventoryManager ──────────
        const pinRequiredRoles = ['Manager', 'InventoryManager'];
        if (pinRequiredRoles.includes(user.role)) {
            if (!user.pin) return res.status(403).json({ message: 'No PIN assigned. Contact Admin.', requiresPin: true });
            if (!pin) return res.status(401).json({ message: 'A 4-digit Security PIN is required for your role.', requiresPin: true });
            const pinMatch = await bcrypt.compare(String(pin), user.pin);
            if (!pinMatch) return res.status(401).json({ message: 'Wrong PIN. Please try again.', requiresPin: true });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({
            message: `Hello ${user.name}! Logged in as: ${user.role} 🎉`,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, hasPin: !!user.pin }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// ── POST /verify-pin ───────────────────────────────────────
router.post('/verify-pin', protect, async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin) return res.status(400).json({ message: 'PIN is required.' });
        const user = await User.findById(req.user._id);
        if (!user.pin) return res.status(400).json({ message: 'No PIN set for this account.' });
        const isMatch = await bcrypt.compare(String(pin), user.pin);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect PIN.' });
        res.status(200).json({ message: 'PIN verified ✅', verified: true });
    } catch (err) {
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// ── GET /profile ───────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -pin');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ id: user._id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// ── PUT /profile ───────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) { const s = await bcrypt.genSalt(10); user.password = await bcrypt.hash(req.body.password, s); }
        if (req.body.pin) {
            if (!/^\d{4}$/.test(String(req.body.pin))) return res.status(400).json({ message: 'PIN must be 4 digits.' });
            const s = await bcrypt.genSalt(10); user.pin = await bcrypt.hash(String(req.body.pin), s);
        }
        const u = await user.save();
        res.status(200).json({ message: 'Profile updated ✅', id: u._id, name: u.name, email: u.email, role: u.role });
    } catch (err) {
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// ── GET /all – All users (Admin) ───────────────────────────
router.get('/all', protect, checkRole('Admin'), async (req, res) => {
    try {
        const users = await User.find({}).select('-password -pin').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

// ── PUT /:id/pin – Admin assigns PIN to Manager/InventoryManager
router.put('/:id/pin', protect, checkRole('Admin'), async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ message: 'PIN must be exactly 4 digits.' });
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ message: 'User not found.' });
        const salt = await bcrypt.genSalt(10);
        target.pin = await bcrypt.hash(String(pin), salt);
        await target.save();
        console.log(`🔑 Admin ${req.user.email} assigned PIN to ${target.email} (${target.role})`);
        res.status(200).json({ message: `PIN assigned to ${target.name} (${target.role}) ✅` });
    } catch (err) {
        res.status(500).json({ message: 'Server Error occurred' });
    }
});

module.exports = router;
