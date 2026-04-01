// InventoryModule/purchaseRoutes.js  (SCRUM-4)
// Purchase requests — InventorySeller raises, InventoryManager approves
const express = require('express');
const router = express.Router();
const PurchaseRequest = require('./PurchaseRequest');
const RawMaterial = require('./RawMaterial');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

const RequestHistory = require('./RequestHistory');

// GET / — all requests
router.get('/', protect, checkRole('InventorySeller', 'InventoryManager', 'Admin', 'Manager'), async (req, res) => {
    try {
        const activeRequests = await PurchaseRequest.find({})
            .populate('requestedBy', 'name email')
            .populate('material', 'name unit')
            .lean();

        const historyRequests = await RequestHistory.find({})
            .populate('requestedBy', 'name email')
            .populate('material', 'name unit')
            .lean();

        const combined = [...activeRequests, ...historyRequests].map(r => ({
            ...r,
            materialName: r.material?.name || 'Unknown Material'
        })).sort((a,b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));

        res.status(200).json(combined);
    } catch (err) {
        console.error('Fetch Requests Error:', err);
        res.status(500).json({ message: 'Error fetching purchase requests', detail: err.message });
    }
});

// POST / — create new request (InventoryManager raises)
router.post('/', protect, checkRole('InventoryManager', 'Admin'), async (req, res) => {
    try {
        const { materialId, quantity, notes } = req.body;
        if (!materialId || !quantity) return res.status(400).json({ message: 'materialId and quantity are required.' });
        const material = await RawMaterial.findById(materialId);
        if (!material) return res.status(404).json({ message: 'Raw material not found.' });
        const request = new PurchaseRequest({
            material: material._id, quantity, unit: material.unit,
            requestedBy: req.user._id, notes: notes || ''
        });
        const saved = await request.save();
        console.log(`🛒 Purchase request: ${material.name} × ${quantity} by ${req.user.email}`);
        res.status(201).json({ message: 'Purchase request created ✅', request: saved });
    } catch (err) {
        res.status(500).json({ message: 'Error creating purchase request', detail: err.message });
    }
});

// PUT /:id/status — InventorySeller marks Sent/Received
router.put('/:id/status', protect, checkRole('InventorySeller', 'Admin'), async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['Sent', 'Received'];
        if (!allowed.includes(status)) return res.status(400).json({ message: `Status must be: ${allowed.join(', ')}` });
        const request = await PurchaseRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Purchase request not found.' });
        if (request.status === 'Received') return res.status(400).json({ message: 'Already marked as Received.' });
        if (status === 'Sent' || status === 'Completed') {
            const RequestHistory = require('./RequestHistory');
            const historyEntry = new RequestHistory({
                material: request.material,
                requestedBy: request.requestedBy,
                quantity: request.quantity,
                unit: request.unit,
                status: 'Sent', 
                approvedBy: req.user._id,
                notes: request.notes,
                completedAt: new Date()
            });
            await historyEntry.save();
            await PurchaseRequest.findByIdAndDelete(request._id);
            console.log(`📮 Purchase ${request._id} → Sent (Moved to History by ${req.user.email})`);
            return res.status(200).json({ message: `Marked as Sent ✅`, request: historyEntry });
        }

        // fallback for other statuses
        request.status = status;
        if (status === 'Received') request.receivedAt = new Date();
        const updated = await request.save();
        console.log(`📮 Purchase ${request._id} → ${status} (by ${req.user.email})`);
        res.status(200).json({ message: `Marked as ${status} ✅`, request: updated });
    } catch (err) {
        console.error('Update Request Status Error:', err);
        res.status(500).json({ message: 'Error updating status', detail: err.message });
    }
});

module.exports = router;
