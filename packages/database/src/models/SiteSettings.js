// SiteSettings Model — Singleton document for site-wide settings
// Stores dynamic banners and other admin-configurable settings

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  tag: { type: String, default: '' },
  ctaText: { type: String, default: 'Learn More' },
  ctaLink: { type: String, default: '/' },
  gradient: { type: String, default: 'from-indigo-600 via-violet-600 to-purple-700' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  dimensionNote: { type: String, default: '1200x400px (Desktop), 600x300px (Mobile)' },
}, { _id: true });

const siteSettingsSchema = new mongoose.Schema(
  {
    // Singleton key — ensures only one document exists
    _singletonKey: {
      type: String,
      default: 'site_settings',
      unique: true,
      immutable: true,
    },
    banners: {
      type: [bannerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Static method to get or create the singleton
siteSettingsSchema.statics.getInstance = async function () {
  let settings = await this.findOne({ _singletonKey: 'site_settings' });
  if (!settings) {
    settings = await this.create({ _singletonKey: 'site_settings', banners: [] });
  }
  return settings;
};

module.exports = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);
