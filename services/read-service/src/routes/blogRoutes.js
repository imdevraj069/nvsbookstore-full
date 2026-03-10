// Read Service — Blog Read Routes
// Public endpoints for reading published blogs

const express = require('express');
const router = express.Router();
const logger = require('@sarkari/logger');
const { Blog } = require('@sarkari/database').models;

/**
 * GET /api/blogs
 * List published blogs with pagination and optional category filter
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const category = req.query.category;

    const query = { isPublished: true };
    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const blogs = await Blog.find(query)
      .populate('author', 'name email _id')
      .select('-content') // Don't send full content in list view
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching blogs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/blogs/:slug
 * Get single blog by slug or ID, increment views
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    }).populate('author', 'name email _id');

    if (!blog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    // Only return published blogs to public readers
    // (Draft access is handled by admin-service with auth)
    if (!blog.isPublished) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    // Increment views
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (error) {
    logger.error('Error fetching blog:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
