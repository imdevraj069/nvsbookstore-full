// Feedback Model
// Collects customer feedback after purchase

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    // ─── Customer & Order ───
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },

    // ─── Feedback Categories ───
    feedbackType: {
      type: String,
      enum: ['product', 'service', 'delivery', 'other'],
      required: true,
    },

    // ─── Ratings ───
    overallSatisfaction: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    productQuality: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    deliverySpeed: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    customerService: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // ─── Comments ───
    whatWentWell: {
      type: String,
      default: '',
    },
    whatCouldImprove: {
      type: String,
      default: '',
    },
    suggestions: {
      type: String,
      default: '',
    },

    // ─── Engagement ───
    wouldRecommend: {
      type: Boolean,
      default: null,
    },
    likelyToRepurchase: {
      type: Boolean,
      default: null,
    },

    // ─── Status ───
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
feedbackSchema.index({ order: 1 });
feedbackSchema.index({ customer: 1 });
feedbackSchema.index({ feedbackType: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
