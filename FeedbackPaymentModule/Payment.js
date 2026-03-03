// FeedbackPaymentModule/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
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
    transactionDate: { type: Date, default: Date.now },
    transactionRef: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

