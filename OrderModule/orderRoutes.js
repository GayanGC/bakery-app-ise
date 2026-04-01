// OrderModule/orderRoutes.js  (SCRUM-3)
// Cart checkout, order history, order management
// Cross-module imports: ProductModule/Product.js, FeedbackPaymentModule/Payment.js
const express = require('express');
const router = express.Router();
const Order = require('./Order');
const Product = require('../ProductModule/Product');
const User = require('../UserModule/User');
const Payment = require('../FeedbackPaymentModule/Payment');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');
const { sendOrderConfirmation } = require('../utils/mailer');

// ── GET /analytics  –  Monthly stats (Admin/Manager) ───────────
router.get('/analytics', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const now = new Date();
        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth();
        const sixMonthsAgo = new Date(thisYear, thisMonth - 5, 1);
        const rawData = await Order.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            const found = rawData.find(r => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1);
            months.push({ label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, orders: found?.orders || 0, revenue: found?.revenue || 0 });
        }
        const current = months[5]; const previous = months[4];
        res.status(200).json({ months, summary: { thisMonth: current, lastMonth: previous, ordersChange: current.orders - previous.orders, revenueChange: current.revenue - previous.revenue } });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching analytics', detail: err.message });
    }
});

// ── POST /  –  Place a new order (creates Payment record atomically) ─
router.post('/', protect, async (req, res) => {
    try {
        const { orderItems, deliveryAddress, paymentMethod } = req.body;
        if (!orderItems || orderItems.length === 0) return res.status(400).json({ message: 'No order items provided!' });
        if (!deliveryAddress?.street || !deliveryAddress?.city || !deliveryAddress?.postalCode) {
            return res.status(400).json({ message: 'Delivery address (street, city, postalCode) is required.' });
        }
        let totalPrice = 0;
        const enrichedItems = [];
        for (const item of orderItems) {
            if (!item.product || !item.qty || item.qty < 1) return res.status(400).json({ message: 'Each item needs a valid productId and qty ≥ 1.' });
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });
            if (product.countInStock < item.qty) return res.status(400).json({ message: `Not enough stock for "${product.name}". Available: ${product.countInStock}` });
            product.countInStock -= item.qty;
            await product.save();
            totalPrice += product.price * item.qty;
            enrichedItems.push({ product: product._id, name: product.name, price: product.price, qty: item.qty });
        }
        const order = new Order({ user: req.user._id, orderItems: enrichedItems, deliveryAddress, totalPrice });
        const createdOrder = await order.save();
        // ── Atomic payment creation ──────────────────────────────
        const method = paymentMethod === 'Online Payment' ? 'Online Payment' : 'Cash on Delivery';
        const payment = new Payment({
            order: createdOrder._id, user: req.user._id, amount: totalPrice,
            paymentMethod: method, paymentStatus: method === 'Online Payment' ? 'Completed' : 'Pending',
            transactionDate: new Date(), transactionRef: method === 'Online Payment' ? `TXN-${Date.now()}` : ''
        });
        await payment.save();
        console.log(`✅ Order ${createdOrder._id} | Rs.${totalPrice} | ${method} | ${req.user.email}`);
        // ── Send order confirmation email (non-blocking) ────────
        const fullUser = await User.findById(req.user._id).select('name email');
        sendOrderConfirmation(fullUser.email, createdOrder, fullUser.name).catch(e =>
            console.warn('📧 Confirmation email failed (non-fatal):', e.message)
        );
        return res.status(201).json({ message: 'Order placed successfully! 🎉', order: createdOrder, payment });
    } catch (err) {
        console.error('❌ Place Order Error:', err.message);
        res.status(500).json({ message: 'Server Error while placing order', detail: err.message });
    }
});

// ── GET /mine  –  Customer's own orders only ────────────────────
router.get('/mine', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your orders' });
    }
});

// ── GET /  –  All orders (Staff / Admin / Manager) ─────────────
router.get('/', protect, checkRole('Delivery Partner', 'Admin', 'Manager'), async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'name email role').sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching all orders' });
    }
});

// ── GET /:id  –  Single order ───────────────────────────────────
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.user._id.toString() !== req.user._id.toString() && !['Delivery Partner', 'Admin', 'Manager'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching order' });
    }
});

// ── PATCH /api/orders/:id/status  –  4-stage workflow ──────────
const statusFlow = ['Placed', 'Processing', 'Out for Delivery', 'Delivered'];
async function updateStatus(req, res) {
    try {
        const { status, deliveryPerson } = req.body;
        if (!statusFlow.includes(status)) return res.status(400).json({ message: `Invalid status. Allowed: ${statusFlow.join(' → ')}` });
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (req.user.role === 'Delivery Partner') {
            const currentIdx = statusFlow.indexOf(order.status);
            const nextIdx = statusFlow.indexOf(status);
            if (nextIdx !== currentIdx + 1) return res.status(400).json({ message: `Staff can only advance one step at a time. Current: "${order.status}"` });
        }
        order.status = status;
        if (deliveryPerson) order.deliveryPerson = deliveryPerson;
        const updated = await order.save();
        console.log(`📦 Order ${order._id} → "${status}"${deliveryPerson ? ` (delivery: ${deliveryPerson})` : ''}`);
        return res.status(200).json({ message: `Order status updated to "${status}" ✅`, order: updated });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while updating status' });
    }
}
router.put('/:id/status', protect, checkRole('Admin', 'Delivery Partner', 'Manager'), updateStatus);
router.patch('/:id/status', protect, checkRole('Admin', 'Delivery Partner', 'Manager'), updateStatus);

// ── PATCH /:id/cancel  –  Customer cancels within 5 minutes ───
const CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
router.patch('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        // Only the owner can self-cancel
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You can only cancel your own orders.' });
        }
        if (order.status !== 'Placed') {
            return res.status(400).json({ success: false, message: `Order is already "${order.status}" and cannot be cancelled.` });
        }
        const elapsed = Date.now() - new Date(order.createdAt).getTime();
        if (elapsed > CANCEL_WINDOW_MS) {
            return res.status(400).json({ success: false, message: 'Cancellation window (5 minutes) has passed.' });
        }

        // Revert product stock
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
        }

        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        const updated = await order.save();

        console.log(`🚫 Order ${order._id} cancelled by ${req.user.email} (within window)`);
        res.status(200).json({ success: true, message: 'Order cancelled successfully. Stock has been restored.', order: updated });
    } catch (err) {
        console.error('Cancel Order Error:', err);
        res.status(500).json({ success: false, message: 'Server Error while cancelling order.' });
    }
});

// ── DELETE /:id  –  Manager/Admin with PIN ──────────────────────
router.delete('/:id', protect, checkRole('Manager', 'Admin'), async (req, res) => {
    try {
        const { pin } = req.body;
        const user = await User.findById(req.user._id);
        if (!user.pin) return res.status(403).json({ message: 'No PIN set. Contact Admin.' });
        const pinMatch = await bcrypt.compare(String(pin), user.pin);
        if (!pinMatch) return res.status(401).json({ message: 'Wrong PIN. Order not deleted.' });
        const deleted = await Order.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Order not found' });
        console.log(`🗑️  Order ${req.params.id} deleted by ${req.user.email}`);
        res.status(200).json({ message: 'Order deleted ✅' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while deleting order' });
    }
});

// ── DELETE /:id/override  –  Staff deletes with Manager PIN ─────
router.delete('/:id/override', protect, checkRole('Delivery Partner'), async (req, res) => {
    try {
        const { managerPin } = req.body;
        if (!managerPin) return res.status(400).json({ success: false, message: 'Manager PIN is required.' });

        const authUsers = await User.find({ role: { $in: ['Manager', 'Admin'] } });
        let isAuthorized = false;

        for (const authUser of authUsers) {
            if (authUser.pin && await bcrypt.compare(String(managerPin), authUser.pin)) {
                isAuthorized = true;
                break;
            }
        }

        if (!isAuthorized) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Manager PIN' });
        }

        const deleted = await Order.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Order not found' });
        
        console.log(`🗑️  Order ${req.params.id} overridden & deleted by ${req.user.email} using Manager PIN`);
        res.status(200).json({ success: true, message: 'Order overridden and deleted successfully! ✅' });
    } catch (err) {
        console.error('Override Delete Error:', err);
        res.status(500).json({ success: false, message: 'Server Error while overriding order deletion.' });
    }
});

module.exports = router;
