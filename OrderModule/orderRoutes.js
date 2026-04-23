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
const { sendOrderConfirmation, sendOrderDelivered, sendOrderCancelled, sendRefundInitiated } = require('../utils/mailer');

// ── GET /analytics  –  Monthly stats + payment split (Admin/Manager) ──
router.get('/analytics', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const now = new Date();
        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth();
        const sixMonthsAgo = new Date(thisYear, thisMonth - 5, 1);

        // Monthly orders + revenue
        const rawData = await Order.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$totalPrice' },
                onlineRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Online Payment'] }, '$totalPrice', 0] } },
                codRevenue:    { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash on Delivery'] }, '$totalPrice', 0] } },
                onlineOrders:  { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Online Payment'] }, 1, 0] } },
                codOrders:     { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash on Delivery'] }, 1, 0] } }
            }},
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // All-time payment method totals
        const [paymentTotals] = await Order.aggregate([
            { $group: {
                _id: null,
                totalOnlineRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Online Payment'] }, '$totalPrice', 0] } },
                totalCodRevenue:    { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash on Delivery'] }, '$totalPrice', 0] } },
                totalOnlineOrders:  { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Online Payment'] }, 1, 0] } },
                totalCodOrders:     { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash on Delivery'] }, 1, 0] } }
            }}
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            const found = rawData.find(r => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1);
            months.push({
                label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                orders: found?.orders || 0,
                revenue: found?.revenue || 0,
                onlineRevenue: found?.onlineRevenue || 0,
                codRevenue: found?.codRevenue || 0
            });
        }
        const current = months[5]; const previous = months[4];

        // ── Average Delivery Time (Admin/Manager) ──────────────────
        let avgDeliveryMinutes = 0;
        const deliveredOrders = await Order.find({ 
            status: 'Delivered', 
            outForDeliveryAt: { $ne: null }, 
            deliveredAt: { $ne: null },
            createdAt: { $gte: sixMonthsAgo } 
        });
        if (deliveredOrders.length > 0) {
            const totalMins = deliveredOrders.reduce((acc, o) => {
                // Prefer pre-calculated deliveryTime, fallback to date diff
                if (o.deliveryTime) return acc + o.deliveryTime;
                return acc + Math.round((o.deliveredAt - o.outForDeliveryAt) / 60000);
            }, 0);
            avgDeliveryMinutes = Math.round(totalMins / deliveredOrders.length);
        }

        res.status(200).json({
            months,
            summary: {
                thisMonth: current,
                lastMonth: previous,
                ordersChange: current.orders - previous.orders,
                revenueChange: current.revenue - previous.revenue,
                avgDeliveryMinutes
            },
            paymentSplit: paymentTotals || { totalOnlineRevenue: 0, totalCodRevenue: 0, totalOnlineOrders: 0, totalCodOrders: 0 }
        });
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
            // ── Use discounted price if product is on sale ───────────
            const effectivePrice = (product.onSale && product.discountPrice) ? product.discountPrice : product.price;
            totalPrice += effectivePrice * item.qty;
            enrichedItems.push({ product: product._id, name: product.name, price: effectivePrice, qty: item.qty });
        }
        const method = paymentMethod === 'Online Payment' ? 'Online Payment' : 'Cash on Delivery';
        const order = new Order({ user: req.user._id, orderItems: enrichedItems, deliveryAddress, totalPrice, paymentMethod: method });
        const createdOrder = await order.save();
        // ── Atomic payment creation ──────────────────────────────
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

// ── GET /staff  –  Active Staff users for assignment dropdown ────
router.get('/staff', protect, checkRole('Staff', 'Admin', 'Manager'), async (req, res) => {
    try {
        const staffUsers = await User.find({ role: 'Staff', status: 'Active' })
            .select('name email phone')
            .sort({ name: 1 });
        res.status(200).json(staffUsers);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching staff list', detail: err.message });
    }
});

// ── GET /my-assignments  –  Staff: only orders assigned to me ───
router.get('/my-assignments', protect, checkRole('Staff'), async (req, res) => {
    try {
        const orders = await Order.find({ assignedTo: req.user._id })
            .populate('user', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your assignments', detail: err.message });
    }
});

// ── GET /mine  –  Customer's own orders only ────────────────────
router.get('/mine', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your orders' });
    }
});

// ── GET /  –  All orders (Staff / Admin / Manager) ─────────────
router.get('/', protect, checkRole('Staff', 'Admin', 'Manager'), async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email role')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching all orders' });
    }
});

// ── GET /staff-deliveries  –  Staff: returns orders grouped by status ──
// ⚠️  MUST be defined BEFORE GET /:id to prevent Express route shadowing.
router.get('/staff-deliveries', protect, checkRole('Staff'), async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Unauthorized: no user session.' });
        }

        console.log(`🛵 [staff-deliveries] user="${req.user.name}" (${req.user.email}) role=${req.user.role} id=${req.user._id}`);

        const orders = await Order.find({ assignedTo: req.user._id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // Active = anything not yet completed or cancelled
        const active = orders.filter(o =>
            ['Placed', 'Processing', 'Out for Delivery'].includes(o.status)
        );
        const delivered = orders.filter(o => o.status === 'Delivered');

        console.log(`   └─ found ${orders.length} total (${active.length} active, ${delivered.length} delivered)`);

        res.status(200).json({ active, delivered });
    } catch (err) {
        console.error('❌ Error in GET /staff-deliveries:', err);
        res.status(500).json({ message: 'Error fetching staff deliveries', detail: err.message });
    }
});

// ── GET /:id  –  Single order ───────────────────────────────────
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email');
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.user._id.toString() !== req.user._id.toString() && !['Staff', 'Admin', 'Manager'].includes(req.user.role)) {
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
        const { status, deliveryPerson, assignedTo } = req.body;
        if (!statusFlow.includes(status)) return res.status(400).json({ message: `Invalid status. Allowed: ${statusFlow.join(' → ')}` });
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        // Authorization check for non-Admin/Manager roles
        if (req.user.role === 'Staff' && order.assignedTo?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This order is not assigned to you.' });
        }

        // Forward-only enforcement for ALL roles
        const currentIdx = statusFlow.indexOf(order.status);
        const nextIdx = statusFlow.indexOf(status);

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Cancelled orders cannot be updated.' });
        }
        if (nextIdx <= currentIdx) {
            return res.status(400).json({ message: `Cannot move backward. Current: "${order.status}". Status can only move forward.` });
        }
        if (req.user.role === 'Staff' && nextIdx !== currentIdx + 1) {
            return res.status(400).json({ message: `Staff can only advance one step at a time. Current: "${order.status}"` });
        }
        order.status = status;
        if (deliveryPerson) order.deliveryPerson = deliveryPerson;
        if (assignedTo) order.assignedTo = assignedTo;

        // ── Timestamp Logic ──────────────────────────────────────
        if (status === 'Out for Delivery' && !order.outForDeliveryAt) {
            order.outForDeliveryAt = new Date();
        }
        if (status === 'Delivered' && !order.deliveredAt) {
            order.deliveredAt = new Date();
            if (order.outForDeliveryAt) {
                order.deliveryTime = Math.max(1, Math.round((order.deliveredAt - order.outForDeliveryAt) / 60000));
            }
        }

        const updated = await order.save();
        const populated = await Order.findById(updated._id)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email');
        
        console.log(`📦 Order ${order._id} → "${status}"${assignedTo ? ` (assigned: ${assignedTo})` : ''}`);
        return res.status(200).json({ message: `Order status updated to "${status}" ✅`, order: populated });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while updating status' });
    }
}
router.put('/:id/status', protect, checkRole('Admin', 'Staff', 'Manager'), updateStatus);
router.patch('/:id/status', protect, checkRole('Admin', 'Staff', 'Manager'), updateStatus);
router.put('/update-status/:id', protect, checkRole('Admin', 'Staff', 'Manager'), updateStatus);

// ── PATCH /:id/deliver  –  Staff marks their assigned order as Delivered ──
router.patch('/:id/deliver', protect, checkRole('Staff'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (!order.assignedTo || order.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This order is not assigned to you.' });
        }
        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Order is already delivered.' });
        }
        
        order.status = 'Delivered';
        if (!order.deliveredAt) {
            order.deliveredAt = new Date();
            if (order.outForDeliveryAt) {
                order.deliveryTime = Math.max(1, Math.round((order.deliveredAt - order.outForDeliveryAt) / 60000));
            }
        }
        const updated = await order.save();
        const populated = await Order.findById(updated._id)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email');
        console.log(`✅ Order ${order._id} marked as Delivered by Staff ${req.user.email}`);
        // ── Send delivery email (non-blocking) ────────────────────
        sendOrderDelivered(populated.user.email, populated, populated.user.name).catch(e =>
            console.warn('📧 Delivery email failed (non-fatal):', e.message)
        );
        res.status(200).json({ message: 'Order marked as Delivered! ✅', order: populated });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while marking delivery', detail: err.message });
    }
});

// ── PATCH /:id/cancel  –  Customer cancels within 5 minutes ───
const CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
router.patch('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        if (order.user.toString() !== req.user._id.toString() && !['Admin', 'Manager', 'Staff'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this order.' });
        }
        if (!['Placed', 'Processing'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Order is already "${order.status}" and cannot be cancelled.` });
        }
        const elapsed = Date.now() - new Date(order.createdAt).getTime();
        if (elapsed > CANCEL_WINDOW_MS && !['Admin', 'Manager', 'Staff'].includes(req.user.role)) {
            return res.status(400).json({ success: false, message: 'Cancellation window (5 minutes) has passed.' });
        }

        // Revert product stock
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
        }

        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        const updated = await order.save();

        // ── Send cancellation email (non-blocking) ────────────────
        const cancelledUser = await User.findById(order.user).select('name email');
        if (cancelledUser) {
            sendOrderCancelled(cancelledUser.email, updated, cancelledUser.name).catch(e =>
                console.warn('📧 Cancellation email failed (non-fatal):', e.message)
            );
            // ── Refund email for Online Payment orders ─────────────
            if (order.paymentMethod === 'Online Payment') {
                sendRefundInitiated(cancelledUser.email, updated, cancelledUser.name, order.totalPrice).catch(e =>
                    console.warn('📧 Refund email failed (non-fatal):', e.message)
                );
            }
        }

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
        if (!pinMatch) return res.status(401).json({ message: 'Wrong PIN. Order not cancelled.' });
        
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (!['Placed', 'Processing'].includes(order.status)) {
            return res.status(400).json({ message: `Order is already ${order.status} and cannot be cancelled.` });
        }

        await Order.findByIdAndUpdate(req.params.id, { 
            status: 'Cancelled', 
            cancelledAt: Date.now() 
        });
        
        // Restore stock
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
        }

        console.log(`🚫 Order ${req.params.id} cancelled by ${req.user.email}`);

        // ── Send cancellation + refund emails (non-blocking) ───────
        const cancelledUser = await User.findById(order.user).select('name email');
        if (cancelledUser) {
            sendOrderCancelled(cancelledUser.email, order, cancelledUser.name).catch(() => {});
            if (order.paymentMethod === 'Online Payment') {
                sendRefundInitiated(cancelledUser.email, order, cancelledUser.name, order.totalPrice).catch(() => {});
            }
        }

        res.status(200).json({ message: 'Order cancelled ✅' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while cancelling order' });
    }
});

// ── DELETE /:id/override  –  Staff deletes with Manager PIN ─────
router.delete('/:id/override', protect, checkRole('Staff'), async (req, res) => {
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

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (!['Placed', 'Processing'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Order is already ${order.status} and cannot be cancelled.` });
        }

        await Order.findByIdAndUpdate(req.params.id, { 
            status: 'Cancelled', 
            cancelledAt: Date.now() 
        });

        // Restore stock
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
        }
        
        console.log(`🚫 Order ${req.params.id} overridden & cancelled by ${req.user.email} using Manager PIN`);

        // ── Send cancellation + refund emails (non-blocking) ───────
        const cancelledUser = await User.findById(order.user).select('name email');
        if (cancelledUser) {
            sendOrderCancelled(cancelledUser.email, order, cancelledUser.name).catch(() => {});
            if (order.paymentMethod === 'Online Payment') {
                sendRefundInitiated(cancelledUser.email, order, cancelledUser.name, order.totalPrice).catch(() => {});
            }
        }

        res.status(200).json({ success: true, message: 'Order overridden and cancelled successfully! ✅' });
    } catch (err) {
        console.error('Override Delete Error:', err);
        res.status(500).json({ success: false, message: 'Server Error while overriding order cancellation.' });
    }
});

// ── POST /api/orders/return/:id  –  Customer requests return ───
router.post('/return/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }
        if (order.status !== 'Delivered' || !order.deliveredAt) {
            return res.status(400).json({ success: false, message: 'Only delivered orders can be returned.' });
        }

        // 24-hour window logic
        const deliveredMs = new Date(order.deliveredAt).getTime();
        const elapsedHrs = (Date.now() - deliveredMs) / (1000 * 60 * 60);
        if (elapsedHrs > 24) {
            return res.status(400).json({ success: false, message: 'Return window (24 hours) has expired.' });
        }

        order.status = 'Return Requested';
        order.returnRequestedAt = new Date();
        await order.save();

        console.log(`↩️ Return requested for Order ${order._id} by ${req.user.email}`);
        res.status(200).json({ success: true, message: 'Return requested. Admin will review it shortly.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error processing return request.' });
    }
});

// ── POST /api/orders/:id/accept-return  –  Admin accepts return ──
router.post('/:id/accept-return', protect, checkRole('Admin'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        if (order.status !== 'Return Requested') {
            return res.status(400).json({ success: false, message: 'No return request found for this order.' });
        }

        // Restore stock
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
        }

        order.status = 'Returned';
        order.returnAcceptedAt = new Date();
        await order.save();

        console.log(`✅ Return accepted for Order ${order._id}. Stock restored.`);
        res.status(200).json({ success: true, message: 'Return accepted and stock updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error accepting return.' });
    }
});

module.exports = router;
