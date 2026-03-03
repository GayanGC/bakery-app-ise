// FeedbackPaymentModule/paymentRoutes.js  (SCRUM-6)
const express = require('express');
const router = express.Router();
const Payment = require('./Payment');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

// GET / — All payments (Admin / Manager)
router.get('/', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const payments = await Payment.find({})
            .populate('user', 'name email role')
            .populate('order', '_id totalPrice status createdAt')
            .sort({ transactionDate: -1 });
        res.status(200).json(payments);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching payments', detail: err.message });
    }
});

// GET /summary — Revenue summary (Admin / Manager)
router.get('/summary', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const [all, thisM, lastM] = await Promise.all([
            Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
            Payment.aggregate([{ $match: { transactionDate: { $gte: thisMonth, $lt: nextMonth } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
            Payment.aggregate([{ $match: { transactionDate: { $gte: lastMonth, $lt: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }])
        ]);
        res.status(200).json({
            totalRevenue: all[0]?.total || 0, totalPayments: all[0]?.count || 0,
            thisMonthRevenue: thisM[0]?.total || 0, thisMonthCount: thisM[0]?.count || 0,
            lastMonthRevenue: lastM[0]?.total || 0, lastMonthCount: lastM[0]?.count || 0
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching payment summary', detail: err.message });
    }
});

// PUT /:id/complete — Mark payment as Completed (Admin)
router.put('/:id/complete', protect, checkRole('Admin'), async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: 'Payment not found.' });
        payment.paymentStatus = 'Completed';
        await payment.save();
        res.status(200).json({ message: 'Payment marked as Completed ✅', payment });
    } catch (err) {
        res.status(500).json({ message: 'Error updating payment' });
    }
});

module.exports = router;
