// InventoryModule/PurchaseRequest.js
const mongoose = require('mongoose');

const purchaseRequestSchema = new mongoose.Schema({
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    supplier: { type: String, default: '' },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.PurchaseRequest || mongoose.model('PurchaseRequest', purchaseRequestSchema);

