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

// GET – All products (public / any authenticated user)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error while fetching products' });
    }
});

// GET /:id – Single product
router.get('/:id', async (req, res) => {
    try {
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

module.exports = router;
