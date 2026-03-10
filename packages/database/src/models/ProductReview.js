// ProductReview Model
// Allows customers to review products they've purchased

const mongoose = require('mongoose');

const productReviewSchema = new mongoose.Schema(
  {
    // ─── Product & Customer ───
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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

    // ─── Review Content ───
    title: {
      type: String,
      required: true,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // ─── Moderation ───
    isApproved: {
      type: Boolean,
      default: true,
    },
    approvedAt: {
      type: Date,
      default: Date.now,
    },

    // ─── Engagement ───
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },

    // ─── Verification ───
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
productReviewSchema.index({ product: 1, isApproved: 1 });
productReviewSchema.index({ customer: 1 });
productReviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProductReview', productReviewSchema);
