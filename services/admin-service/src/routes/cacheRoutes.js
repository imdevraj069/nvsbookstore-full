// Cache Management Routes — Admin control over Redis cache

const express = require('express');
const { getStats, clearAll, invalidateProducts, invalidateNotifications, invalidateTags } = require('../cache/cacheManager');
const logger = require('@sarkari/logger');

const router = express.Router();

/**
 * GET /api/admin/cache/stats
 * Get cache statistics and status
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/cache/clear
 * Clear all cache
 */
router.post('/clear', async (req, res) => {
  try {
    await clearAll();
    logger.info('All cache cleared by admin');
    res.json({ success: true, message: 'All cache cleared successfully' });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/cache/invalidate/products
 * Invalidate product cache
 */
router.post('/invalidate/products', async (req, res) => {
  try {
    await invalidateProducts();
    logger.info('Product cache invalidated');
    res.json({ success: true, message: 'Product cache invalidated' });
  } catch (error) {
    logger.error('Error invalidating product cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/cache/invalidate/notifications
 * Invalidate notification cache
 */
router.post('/invalidate/notifications', async (req, res) => {
  try {
    await invalidateNotifications();
    logger.info('Notification cache invalidated');
    res.json({ success: true, message: 'Notification cache invalidated' });
  } catch (error) {
    logger.error('Error invalidating notification cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/cache/invalidate/tags
 * Invalidate tag cache
 */
router.post('/invalidate/tags', async (req, res) => {
  try {
    await invalidateTags();
    logger.info('Tag cache invalidated');
    res.json({ success: true, message: 'Tag cache invalidated' });
  } catch (error) {
    logger.error('Error invalidating tag cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
