// FeedbackPaymentModule/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    order: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order', 
        required: [true, 'Order ID is required'],
        unique: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'User ID is required'] 
    },
    rating: { 
        type: Number, 
        required: [true, 'Rating is required'], 
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5']
    },
    comment: { 
        type: String, 
        default: '', 
        maxlength: [500, 'Comment cannot exceed 500 characters'],
        trim: true
    },
    isAnonymous: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better query performance
// Note: { order: 1 } index is created automatically by unique: true above
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

