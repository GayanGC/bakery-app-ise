// ProductModule/productRoutes.js  (SCRUM-2)
// Full CRUD — Admin/Manager only for write operations
const express = require('express');
const router = express.Router();
const Product = require('./Product');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');

// GET – All products (public/any authenticated user)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: 'Server Error while fetching products' });
    }
});

// GET /:id – Single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found!' });
        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST – Add product (Admin / Manager only — UI also enforces this)
router.post('/', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { name, description, price, category, image, countInStock } = req.body;
        const product = new Product({ name, description, price, category, image, countInStock });
        const created = await product.save();
        res.status(201).json({ message: '🎂 Product added successfully!', product: created });
    } catch (err) {
        console.error('Product Creation Error:', err);
        res.status(500).json({ message: 'Server Error while adding product' });
    }
});

// PUT /:id – Update product (Admin / Manager only)
router.put('/:id', protect, checkRole('Admin', 'Manager'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found!' });
        product.name = req.body.name || product.name;
        product.description = req.body.description || product.description;
        product.price = req.body.price || product.price;
        product.category = req.body.category || product.category;
        product.image = req.body.image || product.image;
        if (req.body.countInStock !== undefined) product.countInStock = req.body.countInStock;
        const updated = await product.save();
        res.status(200).json({ message: '🔄 Product updated successfully!', product: updated });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while updating product' });
    }
});

// DELETE /:id – Remove product (Admin only)
router.delete('/:id', protect, checkRole('Admin'), async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Product not found!' });
        res.status(200).json({ message: '🗑️ Product deleted successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error while deleting product' });
    }
});

module.exports = router;
