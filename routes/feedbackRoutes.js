// routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

// ── POST /api/feedback  –  Submit feedback for a delivered order ──
router.post('/', protect, async (req, res) => {
    try {
        const { orderId, rating, comment } = req.body;

        if (!orderId || !rating) {
            return res.status(400).json({ message: 'orderId and rating are required.' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        // Verify the order belongs to this customer AND is Delivered
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found.' });

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only leave feedback on your own orders.' });
        }
        if (order.status !== 'Delivered') {
            return res.status(400).json({ message: 'Feedback can only be submitted for Delivered orders.' });
        }

        // Check for duplicate  
        const existing = await Feedback.findOne({ order: orderId });
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted feedback for this order.' });
        }

        const feedback = new Feedback({
            order: orderId,
            user: req.user._id,
            rating,
            comment: comment || ''
        });
        const saved = await feedback.save();
        console.log(`⭐ Feedback submitted for order ${orderId} by ${req.user.email} — ${rating}/5`);
        res.status(201).json({ message: 'Thank you for your feedback! ⭐', feedback: saved });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Feedback already submitted for this order.' });
        }
        console.error('Feedback Error:', err);
        res.status(500).json({ message: 'Server Error', detail: err.message });
    }
});

// ── GET /api/feedback  –  All feedback (Admin / Manager) ──────────
router.get('/', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const feedbacks = await Feedback.find({})
            .populate('user', 'name email role')
            .populate('order', 'totalPrice createdAt orderItems')
            .sort({ createdAt: -1 });
        res.status(200).json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching feedback', detail: err.message });
    }
});

// ── GET /api/feedback/my  –  Current user's own feedback ──────────
router.get('/my', protect, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ user: req.user._id })
            .populate('order', '_id totalPrice createdAt')
            .sort({ createdAt: -1 });
        res.status(200).json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your feedback' });
    }
});

// ── GET /api/feedback/order/:orderId  –  Check if feedback exists ─
router.get('/order/:orderId', protect, async (req, res) => {
    try {
        const fb = await Feedback.findOne({ order: req.params.orderId });
        res.status(200).json({ exists: !!fb, feedback: fb });
    } catch (err) {
        res.status(500).json({ message: 'Error checking feedback' });
    }
});

module.exports = router;
