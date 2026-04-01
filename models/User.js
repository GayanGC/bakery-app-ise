// models/User.js
// Canonical User schema — used by authMiddleware and all cross-module references.
// Must stay in sync with UserModule/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VALID_ROLES = ['Customer', 'Staff', 'Manager', 'Admin', 'InventorySeller', 'InventoryManager'];

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        match: [/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces']
    },

    email: {
        type: String,
        required: [true, 'Email address is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address']
    },

    phone: {
        type: String,
        match: [/^\d{10}$/, 'Phone must be exactly 10 digits']
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },

    pin: {
        type: String,
        default: ''
    },

    role: {
        type: String,
        enum: { values: VALID_ROLES, message: 'Invalid role selected' },
        default: 'Customer'
    },

    // ── Approval status ─────────────────────────────────────
    status: {
        type: String,
        enum: ['Active', 'In Process', 'Suspended'],
        default: 'Active'
    },

    // ── Password reset OTP ──────────────────────────────────
    resetOtp:       { type: String, default: null },
    resetOtpExpiry: { type: Date,   default: null },

    // ── Profile Photo ───────────────────────────────────────
    avatar: { type: String, default: '' }

}, { timestamps: true });

// ── Hash password before saving ─────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Use existing compiled model to avoid OverwriteModelError
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
