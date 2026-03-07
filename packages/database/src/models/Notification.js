// Notification Model
// Tag-based filtering, MinIO/Drive PDF attachments, priority levels

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ─── Core ───
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },

    // ─── Tags (replaces category) ───
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // ─── Dates ───
    publishDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastDate: {
      type: Date,
      default: null,
    },

    // ─── Context fields ───
    department: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },

    // ─── Links ───
    applyUrl: {
      type: String,
      default: '',
    },
    websiteUrl: {
      type: String,
      default: '',
    },
    loginUrl: {
      type: String,
      default: '',
    },
    resultUrl: {
      type: String,
      default: '',
    },
    admitCardUrl: {
      type: String,
      default: '',
    },

    // ─── PDF attachment (MinIO or Google Drive) ───
    pdfFile: {
      key: { type: String, default: '' },
      bucket: { type: String, default: 'notifications' },
      fileName: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
    },
    pdfUrl: {
      type: String,
      default: '',
    },

    // ─── Display flags ───
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────
notificationSchema.index({ tags: 1, isVisible: 1 });
notificationSchema.index({
  title: 'text',
  description: 'text',
  department: 'text',
});
notificationSchema.index({ publishDate: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
