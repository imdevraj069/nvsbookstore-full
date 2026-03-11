// Settings Controller — manages site-wide settings (banners, company details, maintenance mode)
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
    res.json({ success: true, data: { banners, isMaintenanceMode: settings.isMaintenanceMode } });
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

// ── PUT /settings/company — admin, updates company details ──
const updateCompanySettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getInstance();
    const {
      isMaintenanceMode,
      maintenanceMessage,
      companyName,
      companyTagline,
      companyEmail,
      companyPhone,
      companyAddress,
      companyWebsite,
      invoiceCompanyName,
      invoiceCompanyEmail,
      invoiceCompanyPhone,
      invoiceCompanyAddress,
      invoiceCompanyLogo,
      invoiceGSTNumber,
      invoicePAN,
      invoiceBankName,
      invoiceBankAccountNumber,
      invoiceBankIFSC,
      invoiceFooterText,
    } = req.body;

    // Update only provided fields
    if (isMaintenanceMode !== undefined) settings.isMaintenanceMode = isMaintenanceMode;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;
    if (companyName !== undefined) settings.companyName = companyName;
    if (companyTagline !== undefined) settings.companyTagline = companyTagline;
    if (companyEmail !== undefined) settings.companyEmail = companyEmail;
    if (companyPhone !== undefined) settings.companyPhone = companyPhone;
    if (companyAddress !== undefined) settings.companyAddress = companyAddress;
    if (companyWebsite !== undefined) settings.companyWebsite = companyWebsite;
    if (invoiceCompanyName !== undefined) settings.invoiceCompanyName = invoiceCompanyName;
    if (invoiceCompanyEmail !== undefined) settings.invoiceCompanyEmail = invoiceCompanyEmail;
    if (invoiceCompanyPhone !== undefined) settings.invoiceCompanyPhone = invoiceCompanyPhone;
    if (invoiceCompanyAddress !== undefined) settings.invoiceCompanyAddress = invoiceCompanyAddress;
    if (invoiceCompanyLogo !== undefined) settings.invoiceCompanyLogo = invoiceCompanyLogo;
    if (invoiceGSTNumber !== undefined) settings.invoiceGSTNumber = invoiceGSTNumber;
    if (invoicePAN !== undefined) settings.invoicePAN = invoicePAN;
    if (invoiceBankName !== undefined) settings.invoiceBankName = invoiceBankName;
    if (invoiceBankAccountNumber !== undefined) settings.invoiceBankAccountNumber = invoiceBankAccountNumber;
    if (invoiceBankIFSC !== undefined) settings.invoiceBankIFSC = invoiceBankIFSC;
    if (invoiceFooterText !== undefined) settings.invoiceFooterText = invoiceFooterText;

    await settings.save();
    logger.info('Company settings updated');
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to update company settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── PATCH /settings/maintenance — admin, toggle maintenance mode ──
const toggleMaintenanceMode = async (req, res) => {
  try {
    const settings = await SiteSettings.getInstance();
    settings.isMaintenanceMode = !settings.isMaintenanceMode;
    await settings.save();
    logger.info(`Maintenance mode set to: ${settings.isMaintenanceMode}`);
    res.json({ success: true, data: { isMaintenanceMode: settings.isMaintenanceMode } });
  } catch (error) {
    logger.error('Failed to toggle maintenance mode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getSettings, getAllSettings, updateBanners, updateCompanySettings, toggleMaintenanceMode };
