// Feedback Controller — Admin Service
// Admin endpoints for managing customer feedback

const logger = require('@sarkari/logger');
const { Feedback } = require('@sarkari/database').models;

/**
 * GET /api/admin/feedback — List all feedback (admin only, paginated)
 */
const listFeedback = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const feedbackType = req.query.feedbackType;
    const isRead = req.query.isRead;

    const query = {};
    if (feedbackType) query.feedbackType = feedbackType;
    if (isRead === 'true') query.isRead = true;
    if (isRead === 'false') query.isRead = false;

    const skip = (page - 1) * limit;

    const feedback = await Feedback.find(query)
      .populate('customer', 'name email _id')
      .populate('order', '_id totalAmount createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      data: feedback,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Feedback list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/feedback/:id — Mark feedback as read / respond
 */
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    const { isRead } = req.body;
    if (isRead !== undefined) {
      feedback.isRead = isRead;
      feedback.readAt = isRead ? new Date() : null;
    }

    await feedback.save();
    res.json({ success: true, data: feedback });
  } catch (error) {
    logger.error('Feedback update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/feedback/:id — Delete feedback
 */
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Feedback.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    logger.error('Feedback delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { listFeedback, updateFeedback, deleteFeedback };
