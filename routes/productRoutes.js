// routes/productRoutes.js
const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// POST API - Add a new product to the bakery
router.post('/', async (req, res) => {
    try {
        // 1. Get product details from the request body
        const { name, description, price, category, image, countInStock } = req.body;

        // 2. Create a new product instance using the Product model
        const product = new Product({
            name,
            description,
            price,
            category, // Must match the enum: 'Cakes', 'Bread', 'Pastries', 'Beverages', 'Other'
            image,
            countInStock
        });

        // 3. Save the product to the MongoDB database
        const createdProduct = await product.save();

        // 4. Send back the created product with a success message
        res.status(201).json({
            message: "Product added successfully! 🎂",
            product: createdProduct
        });

    } catch (error) {
        console.error("Product Creation Error:", error);
        res.status(500).json({ message: "Server Error while adding product" });
    }
});
// GET API - Fetch all bakery products
router.get('/', async (req, res) => {
    try {
        // 1. Fetch all products from the MongoDB database
        // (An empty object {} means "give me everything")
        const products = await Product.find({});

        // 2. Send the retrieved products back to the client
        res.status(200).json(products);

    } catch (error) {
        console.error("Fetch Products Error:", error);
        res.status(500).json({ message: "Server Error while fetching products" });
    }
});

// PUT API - Update an existing product's details
router.put('/:id', async (req, res) => {
    try {
        // 1. Find the product in the database using the ID from the URL
        const product = await Product.findById(req.params.id);

        if (product) {
            // 2. Update the fields if new data is provided in the request body, 
            // otherwise keep the existing old data
            product.name = req.body.name || product.name;
            product.description = req.body.description || product.description;
            product.price = req.body.price || product.price;
            product.category = req.body.category || product.category;
            product.image = req.body.image || product.image;

            // We check for undefined because stock can be 0 (which is falsy)
            if (req.body.countInStock !== undefined) {
                product.countInStock = req.body.countInStock;
            }

            // 3. Save the updated product back to the database
            const updatedProduct = await product.save();

            // 4. Send back the updated product details with a success message
            res.status(200).json({
                message: "Product updated successfully! 🔄",
                product: updatedProduct
            });
        } else {
            res.status(404).json({ message: "Product not found!" });
        }
    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ message: "Server Error while updating product" });
    }
});

// DELETE API - Remove a product from the bakery
router.delete('/:id', async (req, res) => {
    try {
        // 1. Find the product by ID and delete it directly from the database
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        // 2. If the product was found and deleted, send a success message
        if (deletedProduct) {
            res.status(200).json({ message: "Product deleted successfully! 🗑️" });
        } else {
            // 3. If no product was found with that ID
            res.status(404).json({ message: "Product not found!" });
        }
    } catch (error) {
        console.error("Delete Product Error:", error);
        res.status(500).json({ message: "Server Error while deleting product" });
    }
});

module.exports = router;