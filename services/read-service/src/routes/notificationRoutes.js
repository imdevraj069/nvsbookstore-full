// Read Service — Cached Notification Routes
// Reads from MongoDB secondary replica, caches in Redis

const express = require('express');
const router = express.Router();
const logger = require('@sarkari/logger');
const { Notification } = require('@sarkari/database').models;
const redisClient = require('../cache/redisClient');

const CACHE_TTL = 3600; // 1 hour

/**
 * GET /api/notifications
 * Returns all visible notifications (fast direct DB fetch, background cache sync)
 */
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'notifications:all';
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const notifications = await Notification.find({ isVisible: true })
      .sort({ publishDate: -1 })
      .lean();

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(notifications)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: notifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/featured
 * Returns featured notifications (fast direct DB fetch, background cache sync)
 */
router.get('/featured', async (req, res) => {
  try {
    const cacheKey = 'notifications:featured';
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const notifications = await Notification.find({ isVisible: true, isFeatured: true })
      .sort({ publishDate: -1 })
      .lean();

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(notifications)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: notifications });
  } catch (error) {
    logger.error('Error fetching featured notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/tag/:tag
 * Returns notifications by tag (fast direct DB fetch, background cache sync)
 */
router.get('/tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const cacheKey = `notifications:tag:${tag}`;
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const notifications = await Notification.find({ isVisible: true, tags: tag })
      .sort({ publishDate: -1 })
      .lean();

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(notifications)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: notifications });
  } catch (error) {
    logger.error('Error fetching notifications by tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/search?q=query
 * Full-text search on notifications (not cached — real-time)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const notifications = await Notification.find({
      isVisible: true,
      $text: { $search: q },
    })
      .sort({ score: { $meta: 'textScore' } })
      .lean();

    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Error searching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/slug/:slug
 * Returns a single notification by slug (fast direct DB fetch, background cache sync)
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `notifications:slug:${slug}`;
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const notification = await Notification.findOne({ slug, isVisible: true }).lean();
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(notification)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: notification });
  } catch (error) {
    logger.error('Error fetching notification by slug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
