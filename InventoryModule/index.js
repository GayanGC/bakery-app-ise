// InventoryModule/index.js  (SCRUM-4)
module.exports = [
    { path: '/api/inventory', router: require('./inventoryRoutes') },
    { path: '/api/purchases', router: require('./purchaseRoutes') }
];
