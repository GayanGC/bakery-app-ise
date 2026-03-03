// FeedbackPaymentModule/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

