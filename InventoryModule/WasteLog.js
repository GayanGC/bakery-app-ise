// InventoryModule/WasteLog.js
const mongoose = require('mongoose');

const wasteLogSchema = new mongoose.Schema({
    material:     { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantityLost: { type: Number, required: true, min: 0.01 },
    reason:       { type: String, default: '', maxlength: 300, trim: true },
    loggedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:         { type: Date, default: Date.now }
}, { timestamps: true });

wasteLogSchema.index({ material: 1 });
wasteLogSchema.index({ date: -1 });

module.exports = mongoose.models.WasteLog || mongoose.model('WasteLog', wasteLogSchema);
