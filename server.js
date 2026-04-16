// server.js  –  Bakery Management System Entry Point
// ✅ AUTO-DISCOVERY: uses fs.readdirSync to register all *Module/index.js routes automatically.
// Global files (.env, middleware/) remain in the root. Just add a new *Module folder — server picks it up.
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ── Ensure uploads/ directory exists ────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Static: serve uploaded product images ───────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── MongoDB ─────────────────────────────────────────────────────
async function connectDB() {
  try {
    // Try Atlas first
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Atlas connected successfully.');
  } catch (err) {
    console.warn('⚠️ Atlas connection failed, trying local MongoDB...');
    try {
      // Fallback to local MongoDB
      await mongoose.connect('mongodb://localhost:27017/bakery-system');
      console.log('✅ Local MongoDB connected successfully.');
    } catch (localErr) {
      console.error('❌ Both Atlas and Local MongoDB failed:');
      console.error('Atlas Error:', err.message);
      console.error('Local Error:', localErr.message);
      console.log('\n💡 Quick Solutions:');
      console.log('1. Add your IP to Atlas whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/');
      console.log('2. Install local MongoDB: https://www.mongodb.com/try/download/community');
      console.log('3. Update .env with working MongoDB URI');
      
      // Don't exit, let the app run for testing routes
      console.log('\n🚀 Continuing without database for route testing...');
    }
  }
}
connectDB();

// ── Auto-discover and register routes from all *Module folders ──
// Each *Module/index.js exports an array of { path, router } objects.
// Example: [{ path: '/api/users', router: require('./userRoutes') }]

const rootDir = __dirname;
const moduleDirs = fs.readdirSync(rootDir).filter(name => {
  return name.endsWith('Module') && fs.statSync(path.join(rootDir, name)).isDirectory();
});

console.log(`\n📦 Auto-registering routes from ${moduleDirs.length} modules...\n`);

moduleDirs.forEach(moduleName => {
  const indexPath = path.join(rootDir, moduleName, 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.warn(`   ⚠️  ${moduleName}/index.js not found — skipping.`);
    return;
  }
  try {
    const routes = require(indexPath);   // array of { path, router }
    routes.forEach(({ path: routePath, router }) => {
      app.use(routePath, router);
      console.log(`   ✅  [${moduleName}]  ${routePath}`);
    });
  } catch (err) {
    console.error(`   ❌  Failed to load ${moduleName}:`, err.message);
  }
});

console.log('\n');

// ── Root health check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🍞 Bakery Management API is running!',
    modules: moduleDirs,
    uptime: `${Math.round(process.uptime())}s`
  });
});

// ── Global error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error', detail: err.message });
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // ── Auto-revert expired sales every hour ──────────────────────
    try {
        const cron = require('node-cron');
        const Product = require('./ProductModule/Product');

        cron.schedule('0 * * * *', async () => {
            try {
                const now = new Date();
                const result = await Product.updateMany(
                    { onSale: true, saleEndDate: { $lte: now } },
                    { $set: { onSale: false, discountPrice: null, discountPct: 0, saleEndDate: null } }
                );
                if (result.modifiedCount > 0) {
                    console.log(`⏰ [CRON] Sale expired — reverted ${result.modifiedCount} products to original prices.`);
                }
            } catch (e) {
                console.error('[CRON] Error reverting expired sales:', e.message);
            }
        });
        console.log('⏰ Cron: sale auto-revert scheduled (runs every hour).');

        // ── Monthly Sales Report: 1st of every month at 09:00 ─────────
        const Order = require('./OrderModule/Order');
        const User  = require('./UserModule/User');
        const { sendMonthlyReportEmail } = require('./utils/mailer');

        cron.schedule('0 9 1 * *', async () => {
            try {
                const now = new Date();
                const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const monthLabel  = `${monthNames[firstOfLastMonth.getMonth()]} ${firstOfLastMonth.getFullYear()}`;

                // Aggregate last month’s orders
                const [agg] = await Order.aggregate([
                    { $match: { createdAt: { $gte: firstOfLastMonth, $lt: firstOfThisMonth } } },
                    { $group: {
                        _id: null,
                        totalOrders:   { $sum: 1 },
                        totalRevenue:  { $sum: '$totalPrice' },
                        onlineRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Online Payment'] }, '$totalPrice', 0] } },
                        codRevenue:    { $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash on Delivery'] }, '$totalPrice', 0] } }
                    }}
                ]);

                // Top products by revenue
                const topProducts = await Order.aggregate([
                    { $match: { createdAt: { $gte: firstOfLastMonth, $lt: firstOfThisMonth } } },
                    { $unwind: '$orderItems' },
                    { $group: {
                        _id: '$orderItems.name',
                        unitsSold: { $sum: '$orderItems.qty' },
                        revenue:   { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } }
                    }},
                    { $sort: { revenue: -1 } },
                    { $limit: 5 },
                    { $project: { name: '$_id', unitsSold: 1, revenue: 1, _id: 0 } }
                ]);

                const report = {
                    month: monthLabel,
                    totalOrders:   agg?.totalOrders   || 0,
                    totalRevenue:  agg?.totalRevenue  || 0,
                    onlineRevenue: agg?.onlineRevenue || 0,
                    codRevenue:    agg?.codRevenue    || 0,
                    topProducts
                };

                // Email all Admin users
                const admins = await User.find({ role: 'Admin', status: 'Active' }).select('email name');
                for (const admin of admins) {
                    await sendMonthlyReportEmail(admin.email, report);
                }
                console.log(`📊 [CRON] Monthly report for ${monthLabel} sent to ${admins.length} admin(s).`);
            } catch (e) {
                console.error('[CRON] Monthly report error:', e.message);
            }
        });
        console.log('📅 Cron: monthly report scheduled (runs at 09:00 on the 1st of each month).');
    } catch (e) {
        console.warn('⚠️  node-cron not available — install with: npm install node-cron');
    }
});