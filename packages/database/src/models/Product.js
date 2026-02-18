// Product Model
// Supports physical + digital formats, MinIO media, print-on-demand, tag-based filtering

const mongoose = require('mongoose');

// ── Sub-schemas ──────────────────────────────────────────

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    default: '',
  },
  bucket: {
    type: String,
    default: 'products',
  },
  mimeType: {
    type: String,
    default: '',
  },
  altText: {
    type: String,
    default: '',
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
});

// ── Main schema ──────────────────────────────────────────

const productSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
    },
    longDescription: {
      type: String,
      default: '',
    },

    // ─── Pricing ───
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },

    // ─── Media (MinIO) ───
    thumbnail: {
      type: mediaSchema,
      default: null,
    },
    images: {
      type: [mediaSchema],
      default: [],
    },

    // ─── Formats & delivery ───
    formats: {
      type: [
        {
          type: String,
          enum: ['physical', 'digital'],
        },
      ],
      default: ['physical'],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one format is required',
      },
    },

    // For digital: admin chooses EITHER upload file to MinIO OR paste external link
    digitalFile: {
      key: { type: String, default: '' },
      bucket: { type: String, default: 'digital' },
      fileName: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
    },
    digitalUrl: {
      type: String,
      default: '',
    },

    // Print-on-demand (admin sets price; user can request printing)
    isPrintable: {
      type: Boolean,
      default: false,
    },
    printPrice: {
      type: Number,
      default: 0,
    },

    // ─── Book metadata ───
    author: {
      type: String,
      default: '',
    },
    publisher: {
      type: String,
      default: '',
    },
    pages: {
      type: Number,
      default: 0,
    },
    isbn: {
      type: String,
      default: '',
    },
    language: {
      type: [String],
      default: ['English'],
    },
    edition: {
      type: String,
      default: '',
    },

    // ─── Ratings & reviews ───
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },

    // ─── Tags (replaces category) ───
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // ─── Display flags ───
    badge: {
      type: String,
      default: '',
    },
    gradient: {
      type: String,
      default: 'from-blue-600 to-indigo-700',
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isEditorPick: {
      type: Boolean,
      default: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ─── Inventory ───
    stock: {
      type: Number,
      default: 0,
    },

    // ─── SEO / extras ───
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metaTitle: {
      type: String,
      default: '',
    },
    metaDescription: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────
productSchema.index({ tags: 1, isVisible: 1 });
productSchema.index({ title: 'text', description: 'text', author: 'text' });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
