// InventoryModule/RequestHistory.js
const mongoose = require('mongoose');

const requestHistorySchema = new mongoose.Schema({
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    supplier: { type: String, default: '' },
    status: { type: String, default: 'Completed' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
    completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.RequestHistory || mongoose.model('RequestHistory', requestHistorySchema);
