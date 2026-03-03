// modules/UserModule/index.js
// Barrel export — single import point for the UserModule
// Usage: const { userRoutes, protect, checkRole } = require('./modules/UserModule');

const userRoutes = require('./userRoutes');
const { protect } = require('./authMiddleware');
// checkRole is a standalone middleware — import from the shared middleware folder
const { checkRole } = require('../../middleware/checkRole');

module.exports = { userRoutes, protect, checkRole };

