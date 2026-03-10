// Blog Model
// Supports cover image, header image, content with images, author, and publishing

const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    // ─── Core identity ───
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

    // ─── Author ───
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      default: '',
    },

    // ─── Media ───
    coverImage: {
      url: { type: String, required: true },
      key: { type: String, default: '' },
      bucket: { type: String, default: 'blogs' },
      altText: { type: String, default: '' },
    },
    headerImage: {
      url: { type: String, default: '' },
      key: { type: String, default: '' },
      bucket: { type: String, default: 'blogs' },
      altText: { type: String, default: '' },
    },

    // ─── Content (Rich HTML) ───
    content: {
      type: String,
      required: true,
    },

    // ─── Tags & Categories ───
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    category: {
      type: String,
      default: '',
    },

    // ─── Publishing ───
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    // ─── SEO ───
    metaTitle: {
      type: String,
      default: '',
    },
    metaDescription: {
      type: String,
      default: '',
    },
    metaKeywords: {
      type: [String],
      default: [],
    },

    // ─── Engagement ───
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
blogSchema.index({ isPublished: 1, publishedAt: -1 });
blogSchema.index({ author: 1, isPublished: 1 });
blogSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
});

module.exports = mongoose.model('Blog', blogSchema);
