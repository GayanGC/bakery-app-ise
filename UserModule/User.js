// UserModule/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    pin: { type: String, default: '' },   // bcrypt-hashed 4-digit PIN
    role: {
        type: String,
        enum: ['Customer', 'Staff', 'Manager', 'Admin', 'InventorySeller', 'InventoryManager'],
        default: 'Customer'
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

