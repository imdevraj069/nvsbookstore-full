// Review Controller — Admin Service
// Admin endpoints for moderating product reviews

const logger = require('@sarkari/logger');
const { ProductReview } = require('@sarkari/database').models;

/**
 * GET /api/admin/reviews — List all reviews for moderation (admin only)
 */
const listReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const isApproved = req.query.isApproved;

    const query = {};
    if (isApproved === 'true') query.isApproved = true;
    if (isApproved === 'false') query.isApproved = false;

    const skip = (page - 1) * limit;

    const reviews = await ProductReview.find(query)
      .populate('customer', 'name email _id')
      .populate('product', 'title slug _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ProductReview.countDocuments(query);

    res.json({
      success: true,
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Review list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/reviews/:id — Approve or reject a review
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ProductReview.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const { isApproved } = req.body;
    if (isApproved !== undefined) {
      review.isApproved = isApproved;
      review.approvedAt = isApproved ? new Date() : null;
    }

    await review.save();
    res.json({ success: true, data: review });
  } catch (error) {
    logger.error('Review update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/reviews/:id — Delete a review
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ProductReview.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    logger.error('Review delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { listReviews, updateReview, deleteReview };
