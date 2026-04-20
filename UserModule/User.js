// UserModule/User.js
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
        required: [true, 'Phone number is required'],
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
        // Raw PIN is never stored — only bcrypt hash or empty string
    },

    role: {
        type: String,
        enum: { values: VALID_ROLES, message: 'Invalid role selected' },
        default: 'Customer'
    },

    // ── Approval status ───────────────────────────────────────
    status: {
        type: String,
        enum: ['Active', 'In Process', 'Suspended'],
        default: 'Active'
    },

    // ── Password reset OTP ───────────────────────────────────
    resetOtp:       { type: String, default: null },   // hashed OTP
    resetOtpExpiry: { type: Date,   default: null },   // 15-min expiry

    // ── Profile Photo ────────────────────────────────────────
    avatar: { type: String, default: '' },              // e.g. /uploads/avatar-xxx.jpg

    // ── Notifications pulse ──────────────────────────────────
    unreadNotifications: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
