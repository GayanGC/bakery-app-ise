// DeliveryModule/deliveryRoutes.js  (SCRUM-5)
// Order status tracking: Placed → Processing → Out for Delivery → Delivered
// Focused on Staff/Driver workflow. Full order CRUD remains in OrderModule.
const express = require('express');
const router = express.Router();
const Order = require('../OrderModule/Order');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

const STAGES = ['Placed', 'Processing', 'Out for Delivery', 'Delivered'];

// GET /api/delivery  –  Orders queued for delivery (Staff / Admin)
router.get('/', protect, checkRole('Staff', 'Admin', 'Manager'), async (req, res) => {
    try {
        // Return all non-Delivered orders by default for delivery board
        const orders = await Order.find({ status: { $ne: 'Delivered' } })
            .populate('user', 'name email')
            .sort({ createdAt: 1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching delivery queue', detail: err.message });
    }
});

// GET /api/delivery/completed  –  Delivered orders
router.get('/completed', protect, checkRole('Staff', 'Admin', 'Manager'), async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Delivered' })
            .populate('user', 'name email')
            .sort({ updatedAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching completed deliveries' });
    }
});

// PATCH /api/delivery/:id/status  –  Advance delivery status (Staff: forward-only)
router.patch('/:id/status', protect, checkRole('Staff', 'Admin', 'Manager'), async (req, res) => {
    try {
        const { status, deliveryPerson } = req.body;
        if (!STAGES.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Workflow: ${STAGES.join(' → ')}` });
        }
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Staff must advance one step at a time
        if (req.user.role === 'Staff') {
            const currentIdx = STAGES.indexOf(order.status);
            const nextIdx = STAGES.indexOf(status);
            if (nextIdx !== currentIdx + 1) {
                return res.status(400).json({ message: `Staff may only advance one step. Current: "${order.status}"` });
            }
        }

        order.status = status;
        if (deliveryPerson) order.deliveryPerson = deliveryPerson;
        const saved = await order.save();

        console.log(`🛵 Delivery: Order ${order._id} → "${status}"${deliveryPerson ? ` (${deliveryPerson})` : ''} by ${req.user.email}`);
        res.status(200).json({ message: `Status updated to "${status}" ✅`, order: saved });
    } catch (err) {
        res.status(500).json({ message: 'Server Error updating delivery status' });
    }
});

module.exports = router;
