// Settings Controller — manages site-wide settings (banners, etc.)
// SiteSettings is a singleton document — one doc for the whole site

const { models: { SiteSettings } } = require('@sarkari/database');
const logger = require('@sarkari/logger');

// ── GET /settings — public, returns banners for frontend ──
const getSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getInstance();
    // Return only active banners, sorted by sortOrder
    const banners = (settings.banners || [])
      .filter((b) => b.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    res.json({ success: true, data: { banners } });
  } catch (error) {
    logger.error('Failed to get settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── GET /settings/all — admin, returns full settings including inactive banners ──
const getAllSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getInstance();
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to get all settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── PUT /settings/banners — admin, replaces entire banners array ──
const updateBanners = async (req, res) => {
  try {
    const { banners } = req.body;
    if (!Array.isArray(banners)) {
      return res.status(400).json({ success: false, error: 'banners must be an array' });
    }

    const settings = await SiteSettings.getInstance();
    settings.banners = banners;
    await settings.save();

    // Invalidate the read-service banner cache so homepage gets fresh data
    try {
      const cacheManager = require('../cache/cacheManager');
      await cacheManager.del('settings:banners');
      logger.info('Invalidated settings:banners cache');
    } catch (cacheErr) {
      logger.warn('Failed to invalidate banner cache (non-fatal):', cacheErr.message);
    }

    logger.info(`Banners updated: ${banners.length} banners`);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to update banners:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getSettings, getAllSettings, updateBanners };
