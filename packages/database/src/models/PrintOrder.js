// PrintOrder Model
// Generalized print-on-demand orders (replaces old PVCOrder)

const mongoose = require('mongoose');

const printItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  copies: {
    type: Number,
    default: 1,
    min: 1,
  },
  pricePerCopy: {
    type: Number,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const printOrderSchema = new mongoose.Schema(
  {
    // ─── Customer ───
    customerId: {
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
    customerPhone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: true,
    },

    // ─── Items ───
    items: {
      type: [printItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Print order must have at least one item',
      },
    },
    totalPrice: {
      type: Number,
      required: true,
    },

    // ─── Payment ───
    paymentMethod: {
      type: String,
      default: 'razorpay',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },

    // ─── Status ───
    status: {
      type: String,
      enum: ['pending', 'paid', 'printing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────
printOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.models.PrintOrder || mongoose.model('PrintOrder', printOrderSchema);
