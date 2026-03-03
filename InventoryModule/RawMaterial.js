// InventoryModule/RawMaterial.js
const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    unit: { type: String, required: true },    // e.g. 'kg', 'liters'
    quantity: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    supplier: { type: String, default: '' },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Virtual: is this material below the threshold?
rawMaterialSchema.virtual('isLowStock').get(function () {
    return this.quantity < this.lowStockThreshold;
});

rawMaterialSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.RawMaterial || mongoose.model('RawMaterial', rawMaterialSchema);

