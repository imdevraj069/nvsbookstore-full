// Admin Service Entry Point
// Internal service — ALL routes require admin authentication

const express = require('express');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;
const { requireAuth, requireAdmin } = require('@sarkari/auth');
const { initializeStorageDirs } = require('./storage/imageStorage');
const { startBackupScheduler, stopBackupScheduler } = require('./backup/backupSystem');
const { initializeRedis, warmCache, disconnect: disconnectRedis } = require('./cache/cacheManager');
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
    // Initialize database
    await connectPrimary();
    logger.info('Connected to MongoDB');

    // Initialize storage directories (for images and documents)
    await initializeStorageDirs();
    logger.info('Storage directories initialized');

    // Initialize Redis cache (non-blocking — continue if it fails)
    try {
      await initializeRedis();
      await warmCache();
      logger.info('Redis cache initialized and warmed');
    } catch (error) {
      logger.warn('Redis initialization failed (service will continue without caching):', error.message);
    }

    // Start backup scheduler (every 6 hours)
    startBackupScheduler();
    logger.info('Backup scheduler started (6-hour interval)');

    app.listen(PORT, () => {
      logger.info(`Admin Service running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      stopBackupScheduler();
      await disconnectRedis();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      stopBackupScheduler();
      await disconnectRedis();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start Admin Service:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
