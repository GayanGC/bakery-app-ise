// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Load environment variables from .env file
dotenv.config();

const app = express();

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json()); // Parse incoming JSON requests

// --------------- MongoDB Connection ---------------
async function connectDB() {
  const MONGO_URI = process.env.MONGO_URI;

  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log("✅ MongoDB Atlas connected successfully.");
      return;
    } catch (err) {
      console.warn("⚠️ Atlas connection failed:", err.message);
      console.log("🔄 Falling back to in-memory MongoDB...");
    }
  }

  // Fallback: use mongodb-memory-server for local development
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log("✅ In-memory MongoDB connected successfully.");
}

// --------------- Routes ---------------
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// --------------- Test Route ---------------
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Bakery Management System API 🍰" });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("❌ Failed to connect to any MongoDB instance:", err.message);
  process.exit(1);
});