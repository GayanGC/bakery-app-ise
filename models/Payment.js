// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true    // one payment record per order
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Online Payment'],
        default: 'Cash on Delivery'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending'
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    transactionRef: {
        type: String,
        default: ''     // auto-generated for online payments
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
