// UserModule/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VALID_ROLES = ['Customer', 'Delivery Partner', 'Manager', 'Admin', 'InventorySeller', 'InventoryManager'];

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
        default: '',
        validate: [
            {
                validator: function (v) { return v === '' || /^\d+$/.test(v); },
                message: 'PIN can only contain numbers'
            },
            {
                validator: function (v) { return v === '' || /^\d{4}$/.test(v); },
                message: 'PIN must be exactly 4 digits'
            }
        ]
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
    avatar: { type: String, default: '' }              // e.g. /uploads/avatar-xxx.jpg

}, { timestamps: true });

// ── Hash password before saving ─────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
