// BlogAccess Model
// Tracks which users have been invited to write blogs

const mongoose = require('mongoose');

const blogAccessSchema = new mongoose.Schema(
  {
    // ─── User Access ───
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // ─── Permissions ───
    canWrite: {
      type: Boolean,
      default: false,
    },
    canPublish: {
      type: Boolean,
      default: false,
    },
    canEditOwn: {
      type: Boolean,
      default: true,
    },

    // ─── Invitation ───
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'rejected'],
      default: 'invited',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BlogAccess || mongoose.model('BlogAccess', blogAccessSchema);
