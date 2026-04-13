// PVC Card Question Model
// Dynamic questions configured by admin for each card type and variation

const mongoose = require('mongoose');

const pvcCardQuestionSchema = new mongoose.Schema(
  {
    // ─── Reference ───
    pvcCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PVCCard',
      required: true,
      index: true,
    },

    // ─── Question Details ───
    question: {
      type: String,
      required: true,
      // e.g., "Enter your Aadhar Number", "Date of Birth", "Full Name (as per ID)"
    },
    placeholder: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '', // Help text for customer
    },

    // ─── Question Type ───
    type: {
      type: String,
      enum: ['text', 'email', 'phone', 'date', 'number', 'textarea', 'dropdown', 'checkbox'],
      default: 'text',
    },

    // ─── Validation ───
    isRequired: {
      type: Boolean,
      default: true,
    },
    minLength: {
      type: Number,
      default: 0,
    },
    maxLength: {
      type: Number,
      default: 500,
    },
    pattern: {
      type: String,
      default: '', // Regex pattern for validation
    },

    // ─── Options (for dropdown/checkbox) ───
    options: {
      type: [
        {
          label: String,
          value: String,
        },
      ],
      default: [],
    },

    // ─── Variation Specific ───
    // If empty, this question applies to ALL variations
    // If specified, only shows for these variations
    applicableVariations: {
      type: [String],
      default: [], // e.g., ["new", "reissue"] - empty means all variations
    },

    // ─── UI ───
    sortOrder: {
      type: Number,
      default: 0,
    },
    displayWidth: {
      type: String,
      enum: ['full', 'half', 'third'],
      default: 'full',
    },

    // ─── Audit ───
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

pvcCardQuestionSchema.index({ pvcCard: 1, sortOrder: 1 });

module.exports = mongoose.models.PVCCardQuestion ||
  mongoose.model('PVCCardQuestion', pvcCardQuestionSchema);
