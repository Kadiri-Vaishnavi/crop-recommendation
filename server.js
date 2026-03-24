// ─────────────────────────────────────────────────────────────────────────────
//  CropAI Connect - Authentication Server
//  Stack: Node.js + Express + MongoDB (via Mongoose) + JWT + bcryptjs
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Parse JSON bodies (limit size)
app.use(express.urlencoded({ extended: true }));

// CORS: Allow requests from the frontend
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow all origins during development to prevent CORS issues
      // In production, you should specify your domain
      callback(null, true);
    },
    credentials: true,
  })
);

// ─── Serve static frontend files ──────────────────────────────────────────
// This allows the server to also serve your HTML pages directly
app.use(express.static(path.join(__dirname, '../src')));

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Health Check Route ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🌱 CropAI Auth Server is running!',
    timestamp: new Date().toISOString(),
    mongoStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// ─── Catch-all: Serve index.html for any unknown route (SPA support) ─────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── MongoDB Connection & Server Start ────────────────────────────────────
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if can't connect
    });

    console.log('✅  MongoDB Connected Successfully');
    console.log(`   → Database: ${mongoose.connection.name}`);

    app.listen(PORT, () => {
      console.log('');
      console.log('🌱  CropAI Connect Auth Server');
      console.log(`   → Running at:   http://localhost:${PORT}`);
      console.log(`   → Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`   → Auth API:     http://localhost:${PORT}/api/auth`);
      console.log(`   → Health:       http://localhost:${PORT}/api/health`);
      console.log('');
    });
  } catch (err) {
    console.error('❌  MongoDB Connection Failed:', err.message);
    console.error('   → Check your MONGODB_URI in the .env file');
    process.exit(1);
  }
};

startServer();

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  await mongoose.connection.close();
  process.exit(0);
});
