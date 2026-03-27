// ProductModule/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    description:   { type: String, default: '' },
    price:         { type: Number, required: true, min: 0 },
    category:      { type: String, default: 'General' },
    image:         { type: String, default: '' },
    countInStock:  { type: Number, required: true, default: 0 },

    // ── Dynamic Discount ───────────────────────────────────────
    originalPrice: { type: Number, default: null },    // preserved before discount
    discountPrice: { type: Number, default: null },    // calculated sale price
    discountPct:   { type: Number, default: 0 },       // e.g. 20 (%)
    onSale:        { type: Boolean, default: false },
    saleEndDate:   { type: Date,    default: null }
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);

