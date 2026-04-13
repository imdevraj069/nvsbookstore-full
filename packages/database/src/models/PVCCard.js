// PVC Card Model
// Master data for PVC card types that admin manages (Aadhar, PAN, Voter ID, etc.)

const mongoose = require('mongoose');

const cardVariationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // e.g., "New Print", "Reissue", "Replacement"
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
});

const pvcCardSchema = new mongoose.Schema(
  {
    // ─── Card Identity ───
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // e.g., "Aadhar Card", "PAN Card", "Voter ID"
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },

    // ─── Pricing & Variations ───
    variations: {
      type: [cardVariationSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Card must have at least one variation (e.g., New Print, Reissue)',
      },
    },

    // ─── Media ───
    thumbnailUrl: {
      type: String,
      default: '',
    },
    thumbnailKey: {
      type: String,
      default: '',
    },

    // ─── Status ───
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },

    // ─── Audit ───
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

pvcCardSchema.index({ createdAt: -1 });
pvcCardSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.models.PVCCard || mongoose.model('PVCCard', pvcCardSchema);
