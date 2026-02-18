// Read Service — Tag Routes (cached)

const express = require('express');
const router = express.Router();
const logger = require('@sarkari/logger');
const { Tag } = require('@sarkari/database').models;
const redisClient = require('../cache/redisClient');

const CACHE_TTL = 3600;

/**
 * GET /api/tags
 * Returns all active tags (cached)
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const cacheKey = `tags:${type || 'all'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    }

    const filter = { isActive: true };
    if (type && type !== 'all') filter.type = { $in: [type, 'both'] };

    const tags = await Tag.find(filter).sort({ name: 1 }).lean();
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(tags));
    res.json({ success: true, source: 'db', data: tags });
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
