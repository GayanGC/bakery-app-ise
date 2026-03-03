// models/PurchaseRequest.js
const mongoose = require('mongoose');

const purchaseRequestSchema = new mongoose.Schema({
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial',
        required: true
    },
    materialName: { type: String, required: true },    // denormalised for quick display
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Sent', 'Received'],
        default: 'Pending'
    },
    notes: { type: String, default: '' },
    sentAt: { type: Date },
    receivedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseRequest', purchaseRequestSchema);
