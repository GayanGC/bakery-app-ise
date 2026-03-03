// routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const RawMaterial = require('../models/RawMaterial');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

const canManage = checkRole('InventoryManager', 'Admin');

// GET /api/inventory — all raw materials
router.get('/', protect, checkRole('InventoryManager', 'Admin', 'Manager'), async (req, res) => {
    try {
        const materials = await RawMaterial.find({}).sort({ name: 1 });
        res.status(200).json(materials);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching inventory', detail: err.message });
    }
});

// GET /api/inventory/low-stock — items below threshold
router.get('/low-stock', protect, canManage, async (req, res) => {
    try {
        const items = await RawMaterial.find({
            $expr: { $lt: ['$quantity', '$lowStockThreshold'] }
        }).sort({ quantity: 1 });
        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching low-stock items', detail: err.message });
    }
});

// POST /api/inventory — add new material
router.post('/', protect, canManage, async (req, res) => {
    try {
        const { name, unit, quantity, lowStockThreshold, supplier, notes } = req.body;
        if (!name || !unit) return res.status(400).json({ message: 'Name and unit are required.' });
        const existing = await RawMaterial.findOne({ name });
        if (existing) return res.status(400).json({ message: `Material "${name}" already exists.` });
        const material = new RawMaterial({ name, unit, quantity, lowStockThreshold, supplier, notes });
        const saved = await material.save();
        console.log(`📦 Raw material added: ${name} by ${req.user.email}`);
        res.status(201).json({ message: 'Material added ✅', material: saved });
    } catch (err) {
        res.status(500).json({ message: 'Error adding material', detail: err.message });
    }
});

// PUT /api/inventory/:id — update qty or details (NO delete allowed for InventoryManager)
router.put('/:id', protect, canManage, async (req, res) => {
    try {
        const material = await RawMaterial.findById(req.params.id);
        if (!material) return res.status(404).json({ message: 'Material not found' });

        material.quantity = req.body.quantity ?? material.quantity;
        material.lowStockThreshold = req.body.lowStockThreshold ?? material.lowStockThreshold;
        material.supplier = req.body.supplier ?? material.supplier;
        material.notes = req.body.notes ?? material.notes;
        material.unit = req.body.unit || material.unit;

        const updated = await material.save();
        const alert = updated.isLowStock
            ? ` ⚠️ LOW STOCK (${updated.quantity} ${updated.unit} remaining!)`
            : '';
        console.log(`✏️  Inventory updated: ${material.name}${alert}`);
        res.status(200).json({ message: `Updated ✅${alert}`, material: updated });
    } catch (err) {
        res.status(500).json({ message: 'Error updating material', detail: err.message });
    }
});

module.exports = router;
