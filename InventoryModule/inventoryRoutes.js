// InventoryModule/inventoryRoutes.js  (SCRUM-4)
// Raw material stock tracking + low-stock alerts (InventoryManager / Admin only)
const express = require('express');
const router = express.Router();
const RawMaterial = require('./RawMaterial');
const WasteLog = require('./WasteLog');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');
const { sendLowStockAlert } = require('../utils/mailer');

const canManage = checkRole('InventoryManager', 'Admin');

// GET / — all raw materials
router.get('/', protect, checkRole('InventoryManager', 'Admin', 'Manager'), async (req, res) => {
    try {
        const materials = await RawMaterial.find({}).sort({ name: 1 });
        res.status(200).json(materials);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching inventory', detail: err.message });
    }
});

// GET /low-stock — items below threshold  (⚠️ Low Stock Notification data)
router.get('/low-stock', protect, canManage, async (req, res) => {
    try {
        const items = await RawMaterial.find({ $expr: { $lt: ['$quantity', '$lowStockThreshold'] } }).sort({ quantity: 1 });
        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching low-stock items', detail: err.message });
    }
});

// POST / — add new material
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

// PUT /:id — update stock (cannot delete — InventoryManager restriction)
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
        const alert = updated.isLowStock ? ` ⚠️ LOW STOCK (${updated.quantity} ${updated.unit} remaining!)` : '';
        console.log(`✏️  Inventory updated: ${material.name}${alert}`);
        // ── Send low-stock alert email (non-blocking) ───────────
        if (updated.isLowStock) {
            sendLowStockAlert(updated).catch(e =>
                console.warn('📧 Low-stock email failed (non-fatal):', e.message)
            );
        }
        res.status(200).json({ message: `Updated ✅${alert}`, material: updated });
    } catch (err) {
        res.status(500).json({ message: 'Error updating material', detail: err.message });
    }
});

// POST /waste — Log a waste / loss entry (InventoryManager / Admin)
router.post('/waste', protect, canManage, async (req, res) => {
    try {
        const { materialId, quantityLost, reason } = req.body;
        if (!materialId || !quantityLost || quantityLost <= 0) {
            return res.status(400).json({ message: 'materialId and quantityLost (> 0) are required.' });
        }
        const material = await RawMaterial.findById(materialId);
        if (!material) return res.status(404).json({ message: 'Material not found.' });

        // Deduct from stock
        material.quantity = Math.max(0, material.quantity - quantityLost);
        await material.save();

        const log = new WasteLog({
            material: materialId,
            quantityLost,
            reason: reason || '',
            loggedBy: req.user._id,
            date: new Date()
        });
        const saved = await log.save();
        console.log(`🗑️  Waste logged: ${quantityLost} ${material.unit} of ${material.name} by ${req.user.email}`);
        res.status(201).json({ message: 'Waste logged ✅', wasteLog: saved, updatedMaterial: material });
    } catch (err) {
        res.status(500).json({ message: 'Error logging waste', detail: err.message });
    }
});

// GET /waste — All waste logs (Admin / InventoryManager)
router.get('/waste', protect, canManage, async (req, res) => {
    try {
        const logs = await WasteLog.find({})
            .populate('material', 'name unit')
            .populate('loggedBy', 'name email')
            .sort({ date: -1 });
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching waste logs', detail: err.message });
    }
});

module.exports = router;
