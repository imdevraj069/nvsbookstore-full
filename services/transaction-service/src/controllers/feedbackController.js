// Feedback Controller — Transaction Service
// User endpoint for submitting order feedback

const logger = require('@sarkari/logger');
const { Feedback, Order } = require('@sarkari/database').models;

/**
 * POST /api/feedback — Submit feedback for an order
 * Requires auth — user can only submit feedback for their own orders
 */
const submitFeedback = async (req, res) => {
  try {
    const user = req.user;
    const {
      orderId, feedbackType, overallSatisfaction,
      productQuality, deliverySpeed, customerService,
      whatWentWell, whatCouldImprove, suggestions,
      wouldRecommend, likelyToRepurchase,
    } = req.body;

    if (!orderId || !feedbackType || !overallSatisfaction) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Verify order belongs to user
    const order = await Order.findById(orderId);
    if (!order || order.customer.toString() !== user.id) {
      return res.status(404).json({ success: false, error: 'Invalid order' });
    }

    // Check if feedback already submitted
    const existingFeedback = await Feedback.findOne({ order: orderId });
    if (existingFeedback) {
      return res.status(400).json({ success: false, error: 'Feedback already submitted for this order' });
    }

    const feedback = new Feedback({
      order: orderId,
      customer: user.id,
      customerName: user.name,
      customerEmail: user.email,
      feedbackType,
      overallSatisfaction,
      productQuality: productQuality || 0,
      deliverySpeed: deliverySpeed || 0,
      customerService: customerService || 0,
      whatWentWell,
      whatCouldImprove,
      suggestions,
      wouldRecommend: wouldRecommend || false,
      likelyToRepurchase: likelyToRepurchase || false,
      isRead: false,
    });

    await feedback.save();

    logger.info(`Feedback submitted by ${user.name} for order ${orderId}`);
    res.status(201).json({ success: true, data: feedback, message: 'Feedback submitted successfully' });
  } catch (error) {
    logger.error('Feedback submit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { submitFeedback };
