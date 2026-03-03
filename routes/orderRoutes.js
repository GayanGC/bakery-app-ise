// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Payment = require('../models/Payment');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');


// ─────────────────────────────────────────────────────────
// GET  /api/orders/analytics  –  Monthly stats (Admin/Manager)
// ─────────────────────────────────────────────────────────
router.get('/analytics', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const now = new Date();
        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth();

        // Last 6 months of data
        const sixMonthsAgo = new Date(thisYear, thisMonth - 5, 1);

        const rawData = await Order.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Build labelled month array
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const found = rawData.find(r => r._id.year === y && r._id.month === m);
            months.push({
                label: `${monthNames[d.getMonth()]} ${y}`,
                orders: found ? found.orders : 0,
                revenue: found ? found.revenue : 0
            });
        }

        const current = months[5];
        const previous = months[4];

        res.status(200).json({
            months,
            summary: {
                thisMonth: { orders: current.orders, revenue: current.revenue },
                lastMonth: { orders: previous.orders, revenue: previous.revenue },
                ordersChange: current.orders - previous.orders,
                revenueChange: current.revenue - previous.revenue
            }
        });
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ message: 'Error fetching analytics', detail: err.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST  /api/orders  –  Place a new order
// ─────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
    try {
        const { orderItems, deliveryAddress, paymentMethod } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items provided!' });
        }
        if (!deliveryAddress?.street || !deliveryAddress?.city || !deliveryAddress?.postalCode) {
            return res.status(400).json({ message: 'Delivery address (street, city, postalCode) is required.' });
        }

        let totalPrice = 0;
        const enrichedItems = [];

        for (const item of orderItems) {
            if (!item.product || !item.qty || item.qty < 1) {
                return res.status(400).json({ message: 'Each item needs a valid productId and qty ≥ 1.' });
            }
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });
            if (product.countInStock < item.qty) {
                return res.status(400).json({ message: `Not enough stock for "${product.name}". Available: ${product.countInStock}` });
            }
            product.countInStock -= item.qty;
            await product.save();

            totalPrice += product.price * item.qty;
            enrichedItems.push({ product: product._id, name: product.name, price: product.price, qty: item.qty });
        }

        // Save the order
        const order = new Order({
            user: req.user._id,
            orderItems: enrichedItems,
            deliveryAddress: { street: deliveryAddress.street, city: deliveryAddress.city, postalCode: deliveryAddress.postalCode },
            totalPrice
        });
        const createdOrder = await order.save();

        // ── Atomically create Payment record ──────────────────────
        const method = paymentMethod === 'Online Payment' ? 'Online Payment' : 'Cash on Delivery';
        const payment = new Payment({
            order: createdOrder._id,
            user: req.user._id,
            amount: totalPrice,
            paymentMethod: method,
            paymentStatus: method === 'Online Payment' ? 'Completed' : 'Pending',
            transactionDate: new Date(),
            transactionRef: method === 'Online Payment' ? `TXN-${Date.now()}` : ''
        });
        await payment.save();

        console.log(`✅ Order saved — ID: ${createdOrder._id} | User: ${req.user.email} | Rs.${totalPrice} | ${method}`);
        return res.status(201).json({ message: 'Order placed successfully! 🎉', order: createdOrder, payment });

    } catch (error) {
        console.error('❌ Place Order Error:', error.name, '-', error.message);
        return res.status(500).json({ message: 'Server Error while placing order', detail: error.message });
    }
});


// ─────────────────────────────────────────────────────────
// GET  /api/orders/mine  –  Customer's own order history
// ─────────────────────────────────────────────────────────
router.get('/mine', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ message: 'Server Error while fetching orders' });
    }
});

// ─────────────────────────────────────────────────────────
// GET  /api/orders  –  ALL orders (Admin / Manager / Staff)
// ─────────────────────────────────────────────────────────
router.get('/', protect, checkRole('Admin', 'Manager', 'Staff'), async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email role')
            .sort({ createdAt: -1 });
        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ message: 'Server Error while fetching all orders' });
    }
});

// ─────────────────────────────────────────────────────────
// PUT  /api/orders/:id  –  Edit an order (Customer/Staff own orders)
// ─────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isOwner = order.user.toString() === req.user._id.toString();
        const isStaff = ['Staff', 'Admin', 'Manager'].includes(req.user.role);

        if (!isOwner && !isStaff) {
            return res.status(403).json({ message: 'Not authorised to edit this order.' });
        }
        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Cannot edit a delivered order.' });
        }

        // Only allow updating delivery address or status (by staff)
        if (req.body.deliveryAddress) order.deliveryAddress = req.body.deliveryAddress;
        if (req.body.status && isStaff) order.status = req.body.status;

        const updated = await order.save();
        return res.status(200).json({ message: 'Order updated ✅', order: updated });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error while updating order' });
    }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status  –  Status update (Staff / Admin)
// Also aliased as PUT for backward compatibility
// ─────────────────────────────────────────────────────────
const statusFlow = ['Placed', 'Processing', 'Out for Delivery', 'Delivered'];

async function updateStatus(req, res) {
    try {
        const { status, deliveryPerson } = req.body;

        if (!statusFlow.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Allowed: ${statusFlow.join(' → ')}`
            });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Enforce forward-only progression for Staff (Admin can set any status)
        if (req.user.role === 'Staff') {
            const currentIdx = statusFlow.indexOf(order.status);
            const nextIdx = statusFlow.indexOf(status);
            if (nextIdx !== currentIdx + 1) {
                return res.status(400).json({
                    message: `Staff can only advance status one step at a time. Current: "${order.status}"`
                });
            }
        }

        order.status = status;
        if (deliveryPerson) order.deliveryPerson = deliveryPerson;
        const updated = await order.save();

        console.log(`📦 Order ${order._id} → "${status}"${deliveryPerson ? ` (delivery: ${deliveryPerson})` : ''} — by ${req.user.email}`);
        return res.status(200).json({ message: `Order status updated to "${status}" ✅`, order: updated });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error while updating status' });
    }
}

router.put('/:id/status', protect, checkRole('Admin', 'Staff', 'Manager'), updateStatus);
router.patch('/:id/status', protect, checkRole('Admin', 'Staff', 'Manager'), updateStatus);



// ─────────────────────────────────────────────────────────
// DELETE  /api/orders/:id  –  Delete order (Manager PIN / Admin)
// ─────────────────────────────────────────────────────────
router.delete('/:id', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { pin } = req.body;

        // Admin still needs to supply PIN for audit safety
        if (!pin) {
            return res.status(400).json({ message: 'PIN is required to delete an order.' });
        }

        // Verify the requesting user's PIN
        const user = await User.findById(req.user._id);
        if (!user.pin) {
            return res.status(400).json({ message: 'No PIN set on your account. Set one in your profile first.' });
        }
        const pinMatch = await bcrypt.compare(String(pin), user.pin);
        if (!pinMatch) {
            return res.status(401).json({ message: 'Incorrect PIN. Order not deleted.' });
        }

        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found.' });

        console.log(`🗑️ Order ${req.params.id} deleted by ${req.user.email} (${req.user.role})`);
        return res.status(200).json({ message: 'Order deleted successfully 🗑️' });

    } catch (error) {
        console.error('Delete Order Error:', error);
        return res.status(500).json({ message: 'Server Error while deleting order', detail: error.message });
    }
});

module.exports = router;
