require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const workflowRoutes = require('./routes/workflows');
const eventRoutes = require('./routes/events');
const analyticsRoutes = require('./routes/analytics');
const privacyRoutes = require('./routes/privacy');
const experimentRoutes = require('./routes/experiments');
const reportRoutes = require('./routes/reports');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/', authLimiter);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'PrivacyLens Analytics API',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tenants', authenticate, tenantRoutes);
app.use('/api/workflows', authenticate, workflowRoutes);
app.use('/api/events', authenticate, eventRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/privacy', authenticate, privacyRoutes);
app.use('/api/experiments', authenticate, experimentRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/feedback', authenticate, feedbackRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start server ──────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   PrivacyLens Analytics API                   ║
  ║   Server running on port ${PORT}                 ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(14)}            ║
  ╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;
