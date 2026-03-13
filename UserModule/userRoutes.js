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
const PIN_REQUIRED_ROLES = ['Admin', 'Manager'];
const VALID_ROLES = ['Customer', 'Staff', 'Manager', 'Admin', 'InventorySeller', 'InventoryManager'];

router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, pin, role } = req.body;

        // ── Field-level guards ─────────────────────────────
        if (!name || !name.trim())
            return res.status(400).json({ success: false, message: 'Full name is required' });
        if (!/^[a-zA-Z\s]+$/.test(name.trim()))
            return res.status(400).json({ success: false, message: 'Name can only contain letters and spaces' });

        if (!email || !email.trim())
            return res.status(400).json({ success: false, message: 'Email address is required' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            return res.status(400).json({ success: false, message: 'Enter a valid email address' });

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser)
            return res.status(400).json({ success: false, message: 'A user with this email already exists!' });

        if (!phone || !phone.trim())
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        if (!/^\d{10}$/.test(phone.trim()))
            return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' });

        if (!password)
            return res.status(400).json({ success: false, message: 'Password is required' });
        if (password.length < 8)
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        if (!/[a-zA-Z]/.test(password))
            return res.status(400).json({ success: false, message: 'Password must include at least one letter' });
        if (!/[0-9]/.test(password))
            return res.status(400).json({ success: false, message: 'Password must include at least one number' });

        const selectedRole = role || 'Customer';
        if (!VALID_ROLES.includes(selectedRole))
            return res.status(400).json({ success: false, message: 'Invalid role selected' });

        // ── PIN validation ─────────────────────────────────
        if (PIN_REQUIRED_ROLES.includes(selectedRole) && !pin)
            return res.status(400).json({ success: false, message: `PIN is required for ${selectedRole} role` });
        if (pin && !/^\d{4}$/.test(String(pin)))
            return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });

        // ── Hash and save ──────────────────────────────────
        const salt = await bcrypt.genSalt(10);
        const hashedPwd = await bcrypt.hash(password, salt);
        const hashedPin = pin ? await bcrypt.hash(String(pin), salt) : '';

        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPwd,
            pin: hashedPin,
            role: selectedRole
        });
        await newUser.save();
        res.status(201).json({ success: true, message: 'User registered successfully! ✅' });

    } catch (err) {
        console.error('Registration Error:', err);
        // Surface Mongoose validation errors as structured messages
        if (err.name === 'ValidationError') {
            const firstMsg = Object.values(err.errors)[0]?.message || 'Validation failed';
            return res.status(400).json({ success: false, message: firstMsg });
        }
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});


// ── POST /login ────────────────────────────────────────────
// Greeting: "Hello [Name]! Logged in as: [Role]"
// PIN gate: Manager + InventoryManager require Admin-assigned PIN
router.post('/login', async (req, res) => {
    try {
        const { email, password, pin } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'No user found with this email!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid password!' });

        // ── PIN gate for Manager and InventoryManager ──────────
        const pinRequiredRoles = ['Manager', 'InventoryManager'];
        if (pinRequiredRoles.includes(user.role)) {
            if (!user.pin) return res.status(403).json({ success: false, message: 'No PIN assigned. Contact Admin.', requiresPin: true });
            if (!pin) return res.status(401).json({ success: false, message: 'A 4-digit Security PIN is required for your role.', requiresPin: true });
            const pinMatch = await bcrypt.compare(String(pin), user.pin);
            if (!pinMatch) return res.status(401).json({ success: false, message: 'Wrong PIN. Please try again.', requiresPin: true });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({
            success: true,
            message: `Hello ${user.name}! Logged in as: ${user.role} 🎉`,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, hasPin: !!user.pin }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

// ── POST /verify-pin ───────────────────────────────────────
router.post('/verify-pin', protect, async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin) return res.status(400).json({ success: false, message: 'PIN is required.' });
        const user = await User.findById(req.user._id);
        if (!user.pin) return res.status(400).json({ success: false, message: 'No PIN set for this account.' });
        const isMatch = await bcrypt.compare(String(pin), user.pin);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
        res.status(200).json({ success: true, message: 'PIN verified ✅', verified: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

// ── GET /profile ───────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -pin');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, id: user._id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

// ── PUT /profile ───────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) { const s = await bcrypt.genSalt(10); user.password = await bcrypt.hash(req.body.password, s); }
        if (req.body.pin) {
            if (!/^\d{4}$/.test(String(req.body.pin))) return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
            const s = await bcrypt.genSalt(10); user.pin = await bcrypt.hash(String(req.body.pin), s);
        }
        const u = await user.save();
        res.status(200).json({ success: true, message: 'Profile updated ✅', id: u._id, name: u.name, email: u.email, role: u.role });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

// ── GET /all – All users (Admin) ───────────────────────────
router.get('/all', protect, checkRole('Admin'), async (req, res) => {
    try {
        const users = await User.find({}).select('-password -pin').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

// ── PUT /:id/pin – Admin assigns PIN to Manager/InventoryManager
router.put('/:id/pin', protect, checkRole('Admin'), async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
        const salt = await bcrypt.genSalt(10);
        target.pin = await bcrypt.hash(String(pin), salt);
        await target.save();
        console.log(`🔑 Admin ${req.user.email} assigned PIN to ${target.email} (${target.role})`);
        res.status(200).json({ success: true, message: `PIN assigned to ${target.name} (${target.role}) ✅` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

module.exports = router;
