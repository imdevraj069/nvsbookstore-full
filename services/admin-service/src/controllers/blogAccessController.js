// Blog Access Controller — Admin Service
// Manages blog writer invitations and permissions

const logger = require('@sarkari/logger');
const { BlogAccess, User } = require('@sarkari/database').models;

/**
 * GET /api/blog-access — List all blog access records (admin only)
 */
const listBlogAccess = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const accesses = await BlogAccess.find(query)
      .populate('userId', 'name email _id')
      .populate('invitedBy', 'name _id')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: accesses });
  } catch (error) {
    logger.error('BlogAccess list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/blog-access — Invite a user to be a blog writer (admin only)
 * Also publishes a RabbitMQ event for the invitation email
 */
const inviteWriter = async (req, res) => {
  try {
    const { userId, canWrite = true, canPublish = false, canEditOwn = true } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already invited
    let blogAccess = await BlogAccess.findOne({ userId });
    if (blogAccess) {
      return res.status(400).json({ success: false, error: 'User already has blog access' });
    }

    blogAccess = new BlogAccess({
      userId,
      canWrite,
      canPublish,
      canEditOwn,
      invitedBy: req.user.id,
      status: 'invited',
      invitedAt: new Date(),
    });

    await blogAccess.save();
    await blogAccess.populate('userId', 'name email _id');
    await blogAccess.populate('invitedBy', 'name _id');

    // Publish invitation email event via RabbitMQ
    try {
      const producer = require('../events/producer');
      await producer.publishEvent('blog_access.invited', {
        email: user.email,
        userName: user.name,
        invitedByName: req.user.name,
        canWrite,
        canPublish,
        canEditOwn,
      });
    } catch (emailError) {
      logger.warn('Failed to publish invitation email event:', emailError.message);
    }

    logger.info(`Blog access invited: ${user.email} by ${req.user.name}`);
    res.status(201).json({ success: true, data: blogAccess, message: 'Invitation sent' });
  } catch (error) {
    logger.error('BlogAccess invite error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/blog-access/:id — Update blog access
 * Users can accept/reject their own invitation; admin can update anything
 */
const updateBlogAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const blogAccess = await BlogAccess.findById(id);
    if (!blogAccess) {
      return res.status(404).json({ success: false, error: 'Blog access not found' });
    }

    const { status, canWrite, canPublish, canEditOwn } = req.body;

    // Users can accept/reject their own invitation; admin can update anything
    if (blogAccess.userId.toString() !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this access' });
    }

    if (user.role !== 'admin') {
      // Regular users can only accept or reject
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status for user' });
      }
      blogAccess.status = status;
      if (status === 'accepted') blogAccess.acceptedAt = new Date();
    } else {
      // Admin can update anything
      if (status) blogAccess.status = status;
      if (canWrite !== undefined) blogAccess.canWrite = canWrite;
      if (canPublish !== undefined) blogAccess.canPublish = canPublish;
      if (canEditOwn !== undefined) blogAccess.canEditOwn = canEditOwn;
      if (status === 'accepted') blogAccess.acceptedAt = new Date();
    }

    await blogAccess.save();
    await blogAccess.populate('userId', 'name email _id');
    await blogAccess.populate('invitedBy', 'name _id');

    res.json({ success: true, data: blogAccess });
  } catch (error) {
    logger.error('BlogAccess update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/blog-access/:id — Revoke blog access (admin only)
 */
const revokeBlogAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BlogAccess.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Blog access not found' });
    }

    logger.info(`Blog access revoked: ${id} by ${req.user.name}`);
    res.json({ success: true, message: 'Access revoked' });
  } catch (error) {
    logger.error('BlogAccess revoke error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  listBlogAccess,
  inviteWriter,
  updateBlogAccess,
  revokeBlogAccess,
};
