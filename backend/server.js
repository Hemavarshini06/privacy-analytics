const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./src/db/database');
const authRoutes = require('./src/routes/auth');
const workflowRoutes = require('./src/routes/workflows');
const eventRoutes = require('./src/routes/events');
const analyticsRoutes = require('./src/routes/analytics');
const privacyRoutes = require('./src/routes/privacy');
const feedbackRoutes = require('./src/routes/feedback');
const reportsRoutes = require('./src/routes/reports');
const dashboardRoutes = require('./src/routes/dashboard');
const experimentRoutes = require('./src/routes/experiments');
const tenantRoutes = require('./src/routes/tenants');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite database & seed
initDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/tenants', tenantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'PrivacyLens Analytics API',
    database: 'SQLite (node:sqlite)'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🔐 PrivacyLens Analytics API`);
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Health check:      http://localhost:${PORT}/api/health`);
  console.log(`------------------------------------------------------`);
  console.log(`Default Credentials:`);
  console.log(`  Admin:   admin@privacyanalytics.dev   / admin123`);
  console.log(`  Analyst: analyst@privacyanalytics.dev / analyst123`);
  console.log(`  Demo:    alice@techflow.com           / password`);
  console.log(`======================================================\n`);
});

module.exports = app;
