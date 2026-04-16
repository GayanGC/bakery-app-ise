// ProductModule/productRoutes.js  (SCRUM-2)
// Full CRUD — Admin/Manager only for write operations
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Product = require('./Product');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

// ── Multer configuration ─────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `product-${unique}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed.'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB limit

// ── Helper: build the stored image path ─────────────────────────
// Stores a forward-slash URL path like /uploads/product-123.jpg
function buildImagePath(file) {
    return `/uploads/${file.filename}`;
}

// Helper to enforce sale expiry upon fetch
async function enforceDiscountExpiry() {
    const expired = await Product.find({ onSale: true, saleEndDate: { $lt: new Date() } });
    if (expired.length > 0) {
        await Product.updateMany(
            { onSale: true, saleEndDate: { $lt: new Date() } },
            { $set: { onSale: false, discountPrice: null, discountPct: 0, saleEndDate: null } }
        );
        console.log(`⏰ Reverted expired discounts for ${expired.length} products.`);
    }
}

// GET – All products (public / any authenticated user)
// Supports: ?search=<term>  and/or  ?category=<cat>  for real-time search
router.get('/', async (req, res) => {
    try {
        await enforceDiscountExpiry();
        const { search, category } = req.query;
        const query = {};
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [{ name: regex }, { category: regex }, { description: regex }];
        }
        if (category && category.trim() && category !== 'All') {
            query.category = new RegExp(`^${category.trim()}$`, 'i');
        }
        const products = await Product.find(query).sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error while fetching products' });
    }
});

// GET /:id – Single product
router.get('/:id', async (req, res) => {
    try {
        await enforceDiscountExpiry();
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found!' });
        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// POST – Add product (Admin / Manager only)
router.post('/', protect, checkRole('Admin', 'Manager'), upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category, countInStock } = req.body;
        const image = req.file ? buildImagePath(req.file) : '';
        const product = new Product({ name, description, price, category, image, countInStock });
        const created = await product.save();
        res.status(201).json({ success: true, message: '🎂 Product added successfully!', product: created });
    } catch (err) {
        console.error('Product Creation Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Server Error while adding product' });
    }
});

// PUT /:id – Update product (Admin / Manager only)
router.put('/:id', protect, checkRole('Admin', 'Manager'), upload.single('image'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found!' });

        product.name = req.body.name || product.name;
        product.description = req.body.description || product.description;
        product.price = req.body.price || product.price;
        product.category = req.body.category || product.category;
        if (req.file) {
            product.image = buildImagePath(req.file);
        }
        if (req.body.countInStock !== undefined) product.countInStock = req.body.countInStock;

        const updated = await product.save();
        res.status(200).json({ success: true, message: '🔄 Product updated successfully!', product: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error while updating product' });
    }
});

// DELETE /:id – Remove product (Admin only)
router.delete('/:id', protect, checkRole('Admin'), async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Product not found!' });
        res.status(200).json({ success: true, message: '🗑️ Product deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error while deleting product' });
    }
});

// ── POST /discount – Apply global sale ─────────────────────
// Body: { discountPct: 20, saleEndDate: "2024-12-31" }
router.post('/discount', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { discountPct, saleEndDate } = req.body;
        if (!discountPct || discountPct <= 0 || discountPct >= 100) {
            return res.status(400).json({ success: false, message: 'Discount percentage must be between 1 and 99.' });
        }
        if (!saleEndDate) {
            return res.status(400).json({ success: false, message: 'A sale end date is required.' });
        }
        const endDate = new Date(saleEndDate);
        if (isNaN(endDate.getTime()) || endDate <= new Date()) {
            return res.status(400).json({ success: false, message: 'Sale end date must be in the future.' });
        }

        const pct = Number(discountPct);
        const products = await Product.find({});

        await Promise.all(products.map(p => {
            // Use stored originalPrice if already on sale, otherwise current price
            const base = p.originalPrice || p.price;
            const newDiscounted = Math.round(base * (1 - pct / 100));
            return Product.findByIdAndUpdate(p._id, {
                originalPrice: base,
                discountPrice: newDiscounted,
                discountPct:   pct,
                onSale:        true,
                saleEndDate:   endDate
            });
        }));

        console.log(`🏷️  Global sale applied: ${pct}% off until ${endDate.toDateString()} (${products.length} products)`);
        res.status(200).json({
            success: true,
            message: `${pct}% sale applied to ${products.length} products until ${endDate.toLocaleDateString()}! 🎉`,
            count: products.length
        });
    } catch (err) {
        console.error('Discount Error:', err);
        res.status(500).json({ success: false, message: 'Server Error applying discount.' });
    }
});

// ── DELETE /discount – Revert all prices ───────────────────
router.delete('/discount', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const result = await Product.updateMany(
            { onSale: true },
            { $set: { onSale: false, discountPrice: null, discountPct: 0, saleEndDate: null } }
        );
        console.log(`✅ Sale reverted for ${result.modifiedCount} products.`);
        res.status(200).json({ success: true, message: `Sale ended. All ${result.modifiedCount} products reverted to original prices.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error reverting discount.' });
    }
});

// ── GET /discount/status – Current sale info ───────────────
router.get('/discount/status', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        await enforceDiscountExpiry();
        const onSaleProduct = await Product.findOne({ onSale: true }).select('onSale discountPct saleEndDate originalPrice discountPrice');
        if (!onSaleProduct) {
            return res.status(200).json({ onSale: false });
        }
        res.status(200).json({
            onSale:      onSaleProduct.onSale,
            discountPct: onSaleProduct.discountPct,
            saleEndDate: onSaleProduct.saleEndDate
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error.' });
    }
});

module.exports = router;
