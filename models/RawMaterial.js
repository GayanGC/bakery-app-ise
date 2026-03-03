// models/RawMaterial.js
const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    unit: { type: String, required: true, default: 'kg' }, // kg, litres, pcs, etc.
    quantity: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, required: true, default: 10 },   // alert if below this
    supplier: { type: String, default: '' },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Virtual: is this item below the low-stock threshold?
rawMaterialSchema.virtual('isLowStock').get(function () {
    return this.quantity < this.lowStockThreshold;
});

rawMaterialSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
