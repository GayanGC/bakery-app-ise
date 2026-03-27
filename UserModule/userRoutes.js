// UserModule/userRoutes.js  (SCRUM-1)
// Registration, Login with JWT, Profile, PIN management, Password Reset
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const User = require('./User');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');
const { sendPasswordResetOtp } = require('../utils/mailer');

// ── Multer: avatar uploads ────────────────────────────────────────
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${req.user?._id || Date.now()}${ext}`);
    }
});
const avatarFilter = (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'), false);
};
const uploadAvatar = multer({ storage: avatarStorage, fileFilter: avatarFilter, limits: { fileSize: 3 * 1024 * 1024 } });

// ── POST /register ─────────────────────────────────────────
const VALID_ROLES = ['Customer', 'Staff', 'Manager', 'Admin', 'InventorySeller', 'InventoryManager'];

router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

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

        // ── Hash and save ──────────────────────────────────
        const salt = await bcrypt.genSalt(10);
        const hashedPwd = await bcrypt.hash(password, salt);

        // ── Account status: Customers go Active, all others need Admin approval
        const accountStatus = selectedRole === 'Customer' ? 'Active' : 'In Process';

        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password: hashedPwd,
            role: selectedRole,
            status: accountStatus
        });
        await newUser.save();

        const msg = accountStatus === 'In Process'
            ? `Registration submitted! Your ${selectedRole} account is pending Admin approval. ⏳`
            : 'User registered successfully! ✅';
        res.status(201).json({ success: true, message: msg, status: accountStatus });

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

        // ── Block accounts pending Admin approval ───────────────────────
        if (user.status === 'In Process') {
            return res.status(403).json({
                success: false,
                message: '⏳ Your account is pending Admin approval. You will be notified once it is activated.',
                pendingApproval: true
            });
        }
        if (user.status === 'Suspended') {
            return res.status(403).json({
                success: false,
                message: '🚫 Your account has been suspended. Please contact Admin.'
            });
        }

        // ── PIN gate for all non-Customer roles ──────────
        if (user.role !== 'Customer') {
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
        const user = await User.findById(req.user._id).select('-password -pin -resetOtp -resetOtpExpiry');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({
            success: true,
            id: user._id, name: user.name, email: user.email,
            phone: user.phone, role: user.role, avatar: user.avatar
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred' });
    }
});

// ── PUT /profile  (multipart/form-data for avatar) ─────────
router.put('/profile', protect, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { name, email, phone, password } = req.body;

        // Name
        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
            if (!/^[a-zA-Z\s]+$/.test(name.trim())) return res.status(400).json({ success: false, message: 'Name can only contain letters and spaces.' });
            user.name = name.trim();
        }

        // Email – uniqueness check
        if (email !== undefined) {
            const normalized = email.toLowerCase().trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
                return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
            }
            const conflict = await User.findOne({ email: normalized, _id: { $ne: req.user._id } });
            if (conflict) return res.status(400).json({ success: false, message: 'That email is already in use by another account.' });
            user.email = normalized;
        }

        // Phone
        if (phone !== undefined) {
            if (!/^\d{10}$/.test(phone.trim())) {
                return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits.' });
            }
            user.phone = phone.trim();
        }

        // Password (optional)
        if (password) {
            if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
                return res.status(400).json({ success: false, message: 'Password must be 8+ chars with a letter and a number.' });
            }
            const s = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, s);
        }

        // Avatar
        if (req.file) user.avatar = `/uploads/${req.file.filename}`;

        const saved = await user.save();
        console.log(`✏️  Profile updated: ${saved.email}`);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully! ✅',
            id: saved._id, name: saved.name, email: saved.email,
            phone: saved.phone, role: saved.role, avatar: saved.avatar
        });
    } catch (err) {
        console.error('Profile Update Error:', err);
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

// ── PUT /:id/pin – Admin assigns PIN to any Staff/Manager
router.put('/:id/pin', protect, isAdmin, async (req, res) => {
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

// ── POST /forgot-password ──────────────────────────────────
// Generates a 6-digit OTP, emails it, stores bcrypt hash + 15-min expiry
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Always return the same message to prevent email enumeration
        if (!user) return res.status(200).json({ success: true, message: 'If that email exists, an OTP has been sent.' });

        const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
        const salt = await bcrypt.genSalt(10);
        user.resetOtp = await bcrypt.hash(otp, salt);
        user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        await sendPasswordResetOtp(user.email, user.name, otp);
        console.log(`🔑 Password reset OTP sent to ${user.email}`);
        res.status(200).json({ success: true, message: 'OTP sent to your email. It expires in 15 minutes.' });
    } catch (err) {
        console.log('Nodemailer Error:', err);
        res.status(500).json({ success: false, message: 'Server Error occurred.' });
    }
});

// ── POST /reset-password ───────────────────────────────────
// Verifies OTP and sets the new password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'email, otp, and newPassword are required.' });
        }
        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be 8+ chars with at least one letter and one number.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP request.' });
        }
        if (new Date() > user.resetOtpExpiry) {
            user.resetOtp = null; user.resetOtpExpiry = null; await user.save();
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        const otpMatch = await bcrypt.compare(String(otp), user.resetOtp);
        if (!otpMatch) return res.status(401).json({ success: false, message: 'Incorrect OTP.' });

        // Set new password (pre-save hook will hash it)
        user.password = newPassword;
        user.resetOtp = null;
        user.resetOtpExpiry = null;
        await user.save();

        console.log(`✅ Password reset for ${user.email}`);
        res.status(200).json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ success: false, message: 'Server Error occurred.' });
    }
});

// ── GET /pending  –  Admin: list all In Process accounts ───
router.get('/pending', protect, isAdmin, async (req, res) => {
    try {
        const users = await User.find({ status: 'In Process', role: { $ne: 'Customer' } })
            .select('name email phone role createdAt')
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred.' });
    }
});

// ── POST /:id/approve  –  Admin: approve + assign PIN ──────
router.post('/:id/approve', protect, isAdmin, async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || !/^\d{4}$/.test(String(pin))) {
            return res.status(400).json({ success: false, message: 'A valid 4-digit PIN is required to approve.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (user.status !== 'In Process') {
            return res.status(400).json({ success: false, message: `Account is already "${user.status}".` });
        }

        const salt = await bcrypt.genSalt(10);
        user.pin = await bcrypt.hash(String(pin), salt);
        user.status = 'Active';
        await user.save();

        console.log(`✅ Admin approved ${user.email} (${user.role}) with PIN`);
        res.status(200).json({ success: true, message: `${user.name} approved and PIN assigned. ✅` });
    } catch (err) {
        console.error('Approve Error:', err);
        res.status(500).json({ success: false, message: 'Server Error occurred.' });
    }
});

// ── PUT /:id/status  –  Admin: suspend / reactivate ────────
router.put('/:id/status', protect, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Active', 'Suspended', 'In Process'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.status(200).json({ success: true, message: `Status updated to "${status}".`, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error occurred.' });
    }
});

module.exports = router;
