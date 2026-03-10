// Review Controller — Transaction Service
// User endpoints for creating product reviews

const logger = require('@sarkari/logger');
const { ProductReview, Order } = require('@sarkari/database').models;

/**
 * POST /api/reviews — Create a product review
 * Requires auth — checks for verified purchase
 */
const createReview = async (req, res) => {
  try {
    const user = req.user;
    const { productId, title, comment, rating, orderRef } = req.body;

    if (!productId || !rating || !title) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Check if user already reviewed this product
    const existingReview = await ProductReview.findOne({
      product: productId,
      customer: user.id,
    });

    if (existingReview) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this product' });
    }

    // Check for verified purchase
    let isVerifiedPurchase = false;
    if (orderRef) {
      const order = await Order.findById(orderRef);
      if (order && order.customer.toString() === user.id) {
        isVerifiedPurchase = true;
      }
    }

    const review = new ProductReview({
      product: productId,
      customer: user.id,
      customerName: user.name,
      title,
      comment,
      rating,
      isVerifiedPurchase,
      orderRef,
      isApproved: false,
    });

    await review.save();

    logger.info(`Review submitted by ${user.name} for product ${productId}`);
    res.status(201).json({ success: true, data: review, message: 'Review submitted for approval' });
  } catch (error) {
    logger.error('Review create error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { createReview };
