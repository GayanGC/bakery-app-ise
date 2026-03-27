// FeedbackPaymentModule/feedbackRoutes.js  (SCRUM-6)
const express = require('express');
const router = express.Router();
const Feedback = require('./Feedback');
const Order = require('../OrderModule/Order');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

// POST / — Customer submits feedback for a Delivered order
router.post('/', protect, async (req, res) => {
    try {
        console.log('🔍 Feedback submission request:', { body: req.body, user: req.user._id });
        
        const { orderId, rating, comment } = req.body;
        if (!orderId || !rating) return res.status(400).json({ message: 'orderId and rating are required.' });
        if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        
        console.log('🔍 Looking for order:', orderId);
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You can only review your own orders.' });
        if (order.status !== 'Delivered') return res.status(400).json({ message: 'Feedback only allowed on Delivered orders.' });
        
        console.log('🔍 Checking for existing feedback for order:', orderId);
        const existing = await Feedback.findOne({ order: orderId });
        if (existing) return res.status(400).json({ message: 'Feedback already submitted for this order.' });
        
        console.log('🔍 Creating new feedback document...');
        const feedback = new Feedback({ 
            order: orderId, 
            user: req.user._id, 
            rating, 
            comment: comment || '' 
        });
        
        console.log('🔍 Saving feedback to database...');
        const saved = await feedback.save();
        
        console.log(`⭐✅ Feedback SUCCESSFULLY saved: Order ${orderId} | ${rating}/5 | by ${req.user.email}`);
        console.log('🔍 Saved feedback ID:', saved._id);
        
        res.status(201).json({ message: 'Thank you for your feedback! ⭐', feedback: saved });
    } catch (err) {
        console.error('❌ FEEDBACK SAVE ERROR:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            name: err.name
        });
        
        if (err.code === 11000) return res.status(400).json({ message: 'Feedback already submitted.' });
        res.status(500).json({ message: 'Server Error', detail: err.message });
    }
});

// GET / — All feedback (Admin / Manager)
router.get('/', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const feedbacks = await Feedback.find({})
            .populate('user', 'name email role')
            .populate('order', 'totalPrice createdAt')
            .sort({ createdAt: -1 });
        res.status(200).json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// GET /my — Customer's own feedback
router.get('/my', protect, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ user: req.user._id }).populate('order', '_id totalPrice createdAt').sort({ createdAt: -1 });
        res.status(200).json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your feedback' });
    }
});

// GET /order/:orderId — Check if feedback exists for a specific order
router.get('/order/:orderId', protect, async (req, res) => {
    try {
        const fb = await Feedback.findOne({ order: req.params.orderId });
        res.status(200).json({ exists: !!fb, feedback: fb });
    } catch (err) {
        res.status(500).json({ message: 'Error checking feedback' });
    }
});

// PUT /:id — Customer updates their own feedback (owner only)
router.put('/:id', protect, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });

        // Ownership check
        if (feedback.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You can only edit your own feedback.' });
        }

        const { rating, comment } = req.body;
        if (rating === undefined || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }

        feedback.rating = rating;
        feedback.comment = comment ?? feedback.comment;
        const updated = await feedback.save();

        console.log(`✏️  Feedback ${feedback._id} updated by ${req.user.email} — ${rating}/5`);
        res.status(200).json({ success: true, message: 'Feedback updated successfully!', feedback: updated });
    } catch (err) {
        console.error('Feedback Update Error:', err);
        res.status(500).json({ success: false, message: 'Server Error while updating feedback.' });
    }
});

// DELETE /:id — Owner OR Admin / Manager can delete
router.delete('/:id', protect, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found.' });

        const isOwner   = feedback.user.toString() === req.user._id.toString();
        const isPriv    = ['Admin', 'Manager'].includes(req.user.role);

        if (!isOwner && !isPriv) {
            return res.status(403).json({ success: false, message: 'Not authorised to delete this feedback.' });
        }

        await Feedback.findByIdAndDelete(req.params.id);
        console.log(`🗑️  Feedback ${req.params.id} deleted by ${req.user.email} (${req.user.role})`);
        res.status(200).json({ success: true, message: 'Feedback deleted successfully.' });
    } catch (err) {
        console.error('Feedback Delete Error:', err);
        res.status(500).json({ success: false, message: 'Server Error while deleting feedback.' });
    }
});

module.exports = router;
