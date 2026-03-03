// modules/UserModule/userModel.js
// User model — self-contained copy for team sharing via UserModule
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: [
            'Customer',
            'Staff',
            'Manager',
            'Admin',
            'InventorySeller',
            'InventoryManager'
        ],
        default: 'Customer'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
