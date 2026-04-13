// PVC Card Order Model
// Customer orders for PVC cards with their customized answers

const mongoose = require('mongoose');

const pvcCardAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PVCCardQuestion',
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    // Can be string, number, date, array (for checkbox)
  },
});

const pvcCardOrderItemSchema = new mongoose.Schema({
  pvcCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PVCCard',
    required: true,
  },
  cardName: {
    type: String,
    required: true,
  },
  variation: {
    name: {
      type: String,
      required: true, // e.g., "New Print", "Reissue"
    },
    price: {
      type: Number,
      required: true,
    },
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  pricePerCard: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true, // pricePerCard * quantity
  },
  answers: {
    type: [pvcCardAnswerSchema],
    default: [],
  },
});

const pvcCardOrderSchema = new mongoose.Schema(
  {
    // ─── Order Identity ───
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

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

    // ─── Delivery Address ───
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },

    // ─── Items ───
    items: {
      type: [pvcCardOrderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one card',
      },
    },

    // ─── Pricing ───
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },

    // ─── Payment ───
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod'],
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
    razorpaySignature: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // ─── Status ───
    status: {
      type: String,
      enum: [
        'pending', // Created, awaiting payment
        'paid', // Payment successful
        'confirmed', // Admin confirmed the order
        'processing', // Being prepared
        'ready_for_dispatch', // Ready to ship
        'dispatched', // Shipped out
        'delivered', // Delivered
        'cancelled', // Order cancelled
        'refunded', // Refund processed
      ],
      default: 'pending',
      index: true,
    },

    // ─── Delivery Tracking ───
    courierName: {
      type: String,
      default: '',
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },

    // ─── Notes ───
    notes: {
      type: String,
      default: '',
    },
    cancelReason: {
      type: String,
      default: '',
    },

    // ─── Audit ───
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────
pvcCardOrderSchema.index({ createdAt: -1 });
pvcCardOrderSchema.index({ customerId: 1, createdAt: -1 });
pvcCardOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.PVCCardOrder ||
  mongoose.model('PVCCardOrder', pvcCardOrderSchema);
