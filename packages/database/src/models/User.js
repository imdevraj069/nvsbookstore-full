// User Model
// Auth, profile, multiple addresses, favorites/wishlist

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    default: 'Home',
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    default: '',
  },
  state: {
    type: String,
    default: '',
  },
  pincode: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ───
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },

    // ─── Auth ───
    authType: {
      type: String,
      enum: ['credentials', 'google'],
      default: 'credentials',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    signupOtp: {
      type: String,
      default: '',
    },
    verifyOtp: {
      type: String,
      default: '',
    },
    verifyId: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },

    // ─── Profile ───
    image: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    education: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    interests: {
      type: [String],
      default: [],
    },

    // ─── Addresses ───
    addresses: {
      type: [addressSchema],
      default: [],
    },

    // ─── Favorites / Wishlist ───
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────
userSchema.index({ email: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
