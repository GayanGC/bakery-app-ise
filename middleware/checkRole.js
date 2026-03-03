// middleware/checkRole.js
// Role-based access control middleware
// Usage: router.get('/route', protect, checkRole('Admin', 'Manager'), handler)

const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user is attached by the `protect` middleware — must run after it
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

module.exports = { checkRole };
