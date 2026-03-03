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

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── MongoDB ─────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Atlas connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
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
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));