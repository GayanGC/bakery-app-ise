// models/Order.js
const mongoose = require('mongoose');

// Sub-schema for each item in the order
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, default: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    // Link to the User who placed the order
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // The list of products the customer ordered
    orderItems: [orderItemSchema],

    // Where the order should be delivered
    deliveryAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true }
    },

    // Calculated total price
    totalPrice: { type: Number, required: true, default: 0.0 },

    // 4-stage order workflow
    status: {
        type: String,
        enum: ['Placed', 'Processing', 'Out for Delivery', 'Delivered'],
        default: 'Placed'
    },

    // Optional: name/ID of delivery person assigned by Staff
    deliveryPerson: { type: String, default: '' }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

