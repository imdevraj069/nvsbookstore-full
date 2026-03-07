// Settings Controller — read-only access to site settings for frontend

const { models: { SiteSettings } } = require('@sarkari/database');
const logger = require('@sarkari/logger');
const redisClient = require('../cache/redisClient');

// ── GET /settings — returns active banners only ──
const getSettings = async (req, res) => {
  try {
    const cacheKey = 'settings:banners';
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

    // Fetch from database
    const settings = await SiteSettings.getInstance();
    const banners = (settings.banners || [])
      .filter((b) => b.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const result = { banners };
    
    // Cache for 1 hour
    await redisClient.setex(cacheKey, 3600, JSON.stringify(result));
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getSettings };
