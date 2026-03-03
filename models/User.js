// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  pin: { type: String },          // bcrypt-hashed 4-digit PIN for sensitive actions
  role: {
    type: String,
    enum: [
      'Customer',           // Can browse products & place orders
      'Staff',              // Can view/edit orders, cannot delete
      'Manager',            // Can delete orders with PIN verification
      'Admin',              // Full access — dashboard, analytics, full CRUD
      'InventorySeller',    // Manages purchase requests, marks as Sent
      'InventoryManager'    // Manages raw materials, receives low-stock alerts
    ],
    default: 'Customer'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
