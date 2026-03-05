// Admin Service Entry Point
// Internal service — ALL routes require admin authentication

const express = require('express');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;
const { requireAuth, requireAdmin } = require('@sarkari/auth');
const { ensureBuckets } = require('./storage/minioClient');
const { initializeImageDir } = require('./storage/imageStorage');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

// ── Temporary public migration endpoint (no auth needed for initial setup) ──
const migrateController = require('./controllers/migrateController');
app.post('/api/migrate', migrateController.runMigration);

// All admin routes require authentication + admin role
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await connectPrimary();
    await ensureBuckets();
    await initializeImageDir();

    app.listen(PORT, () => {
      logger.info(`Admin Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Admin Service:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
