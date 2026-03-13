// Admin Service Entry Point
// Internal service — ALL admin routes require authentication

const express = require('express');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;
const { requireAuth, requireAdmin } = require('@sarkari/auth');
const { initializeStorageDirs } = require('./storage/imageStorage');
const { initializeChunksDir } = require('./storage/chunkUpload');
const { startBackupScheduler, stopBackupScheduler } = require('./backup/backupSystem');
const { initializeRedis, warmCache, disconnect: disconnectRedis } = require('./cache/cacheManager');
const adminRoutes = require('./routes/adminRoutes');
const imageController = require('./controllers/imageController');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
// Standard body parser for most routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Large body limit for upload routes (50MB per chunk)
app.use('/api/admin/documents', express.json({ limit: '500mb' }));
app.use('/api/admin/documents', express.urlencoded({ extended: true, limit: '500mb' }));

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

// ── Public file serving endpoint (no auth required for viewing) ──
// Supports ?type=document to serve from documents folder instead of images
app.get('/files/serve/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const type = req.query.type === 'document' ? 'document' : 'image';
    const { getFile, getMimeType } = require('./storage/imageStorage');

    const buffer = await getFile(decodeURIComponent(fileName), type);
    const mimeType = getMimeType(fileName);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (type === 'document') {
      res.setHeader('Content-Disposition', `inline; filename="${decodeURIComponent(fileName)}"`);
    }
    res.send(buffer);
  } catch (error) {
    if (error.message === 'Invalid file path') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// ── Temporary public migration endpoint (no auth needed for initial setup) ──
const migrateController = require('./controllers/migrateController');
app.post('/api/migrate', migrateController.runMigration);

// ── Public settings endpoint (no auth — banners need to load for homepage) ──
const settingsController = require('./controllers/settingsController');
app.get('/api/settings', settingsController.getSettings);

// All admin routes require authentication + admin role
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// ── Blog routes (requireAuth only — writers aren't admins) ──
const blogRoutes = require('./routes/blogRoutes');
app.use('/api/blogs', requireAuth, blogRoutes);

// ── Blog access routes (requireAuth; admin checks inside route handlers) ──
const blogAccessRoutes = require('./routes/blogAccessRoutes');
app.use('/api/blog-access', requireAuth, blogAccessRoutes);

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

    // Initialize chunks directory (for chunked uploads)
    await initializeChunksDir();
    logger.info('Chunks directory initialized');

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
