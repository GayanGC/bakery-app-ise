// OrderModule/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, default: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: [orderItemSchema],
    deliveryAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true }
    },
    totalPrice: { type: Number, required: true, default: 0 },
    status: {
        type: String,
        enum: ['Placed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Placed'
    },
    deliveryPerson: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paymentMethod: { type: String, enum: ['Cash on Delivery', 'Online Payment'], default: 'Cash on Delivery' },
    cancelledAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);


