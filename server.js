require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const prisma = require('./db/database');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const vehicleRoutes = require('./routes/vehicles');
const configuratorRoutes = require('./routes/configurator');
const inquiryRoutes = require('./routes/inquiries');
const galleryRoutes = require('./routes/gallery');
const uploadRoutes = require('./routes/upload');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const sameSite = process.env.AUTH_COOKIE_SAME_SITE || 'lax';

if (!['lax', 'strict', 'none'].includes(sameSite)) {
  throw new Error('AUTH_COOKIE_SAME_SITE must be lax, strict, or none.');
}
if (process.env.NODE_ENV === 'production' && (!allowedOrigins.length || allowedOrigins.includes('*'))) {
  throw new Error('Set FRONTEND_ORIGINS to the exact production site and admin origins.');
}

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many inquiries. Please try again later.' }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'VeloCad Engineering API' });
});
app.get('/api/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (error) {
    console.error('Database readiness check failed:', error);
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.post('/api/inquiries', inquiryLimiter);
app.post('/api/messages', inquiryLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/configurator', configuratorRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError || error.message?.startsWith('Only JPEG')) {
    return res.status(400).json({ error: error.message });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'A record with those unique values already exists.' });
  }
  if (error.code === 'P2003') {
    return res.status(400).json({ error: 'The request references a record that does not exist.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  if (error.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ error: 'Origin is not allowed.' });
  }
  console.error('Unhandled request error:', error);
  res.status(500).json({ error: 'Internal server error.' });
});

async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`VeloCad API listening on port ${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down.`);
    server.close(async (error) => {
      if (error) console.error('HTTP server shutdown error:', error);
      await prisma.$disconnect();
      process.exit(error ? 1 : 0);
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  server.on('error', (error) => {
    console.error('HTTP server error:', error);
    process.exitCode = 1;
  });
}

if (require.main === module) {
  startServer().catch(async (error) => {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
