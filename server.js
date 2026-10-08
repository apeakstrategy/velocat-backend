require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { seed } = require('./db/seed');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const vehicleRoutes = require('./routes/vehicles');
const configuratorRoutes = require('./routes/configurator');
const inquiryRoutes = require('./routes/inquiries');
const galleryRoutes = require('./routes/gallery');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Enable CORS for frontend clients & admin portal
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'VeloCad Engineering REST API Backend',
    timestamp: new Date().toISOString()
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/configurator', configuratorRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);

// Start Server and Seed Database
async function startServer() {
  try {
    await seed();
    app.listen(PORT, () => {
      console.log(`🚀 VeloCad Express Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();
