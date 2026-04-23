// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Check if the token is sent in the headers (Authorization: Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get only the token part, removing the 'Bearer ' prefix
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify the token using the secret key from .env
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Find the user by ID from the token and attach it to the request
            // (.select('-password') means we exclude the password from the result)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: "User not found for this token." });
            }

            return next(); // If everything is okay, move to the next route handler

        } catch (error) {
            console.error("Token Error:", error.message);
            return res.status(401).json({ message: "Not authorized, token failed!" });
        }
    }

    // If no token is found in the headers
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token!" });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
};

module.exports = { protect, isAdmin };