// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
        type: String,
        required: true,
        // Category options for the bakery products
        enum: ['Cakes', 'Bread', 'Pastries', 'Beverages', 'Other']
    },
    image: { type: String, default: 'default-product.jpg' },
    countInStock: { type: Number, required: true, default: 0 }
}, {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);