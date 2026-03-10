// Read Service — Product Review Read Routes
// Public endpoints for reading approved product reviews

const express = require('express');
const router = express.Router();
const logger = require('@sarkari/logger');
const { ProductReview } = require('@sarkari/database').models;

/**
 * GET /api/reviews
 * List approved reviews for a product with pagination, sorting, and stats
 * Query params: productId (required), page, limit, sort (newest|helpful|rating)
 */
router.get('/', async (req, res) => {
  try {
    const { productId, page: pageStr, limit: limitStr, sort } = req.query;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    const page = parseInt(pageStr || '1');
    const limit = parseInt(limitStr || '5');
    const skip = (page - 1) * limit;

    const query = { product: productId, isApproved: true };

    let sortObj = { createdAt: -1 };
    if (sort === 'helpful') sortObj = { helpful: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };

    const reviews = await ProductReview.find(query)
      .populate('customer', 'name _id')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ProductReview.countDocuments(query);

    // Calculate rating stats
    const allReviews = await ProductReview.find(
      { product: productId, isApproved: true },
      'rating'
    ).lean();

    const avgRating = allReviews.length
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : 0;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    res.json({
      success: true,
      data: reviews,
      stats: {
        averageRating: parseFloat(avgRating),
        totalReviews: allReviews.length,
        ratingDistribution,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
