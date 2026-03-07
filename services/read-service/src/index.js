// Read Service Entry Point
// High-traffic service — reads from MongoDB secondary replica, caches in Redis

const express = require('express');
const logger = require('@sarkari/logger');
const { connectSecondary } = require('@sarkari/database').connection;
const redisClient = require('./cache/redisClient');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'read-service' });
});

// Routes
const productRoutes = require('./routes/productRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const tagRoutes = require('./routes/tagRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/settings', settingsRoutes);

// Cache invalidation endpoint (called by admin-service via internal network)
app.post('/api/cache/invalidate', async (req, res) => {
  try {
    const { patterns } = req.body; // e.g. ['products:*', 'notifications:*']
    if (!patterns || !Array.isArray(patterns)) {
      return res.status(400).json({ success: false, error: 'patterns array required' });
    }

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
      }
    }

    res.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    logger.error('Error invalidating cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await connectSecondary();
    // Redis auto-connects on import

    app.listen(PORT, () => {
      logger.info(`Read Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Read Service:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
