// Tag Controller — CRUD for admin-managed tags

const logger = require('@sarkari/logger');
const { Tag } = require('@sarkari/database').models;
const { generateSlug } = require('../utils/slug');

/**
 * GET /api/admin/tags
 */
const getAllTags = async (req, res) => {
  try {
    const { type, active } = req.query;
    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';

    const tags = await Tag.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data: tags });
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/tags
 */
const createTag = async (req, res) => {
  try {
    const { name, description, color, icon, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }

    const slug = generateSlug(name);

    const existing = await Tag.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Tag already exists' });
    }

    const tag = await Tag.create({
      name: name.trim(),
      slug,
      description: description || '',
      color: color || '',
      icon: icon || '',
      type: type || 'both',
    });

    logger.info(`Tag created: ${tag.name} (${tag.slug})`);
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    logger.error('Error creating tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/tags/:id
 */
const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Regenerate slug if name changed
    if (updates.name) {
      updates.slug = generateSlug(updates.name);
    }

    const tag = await Tag.findByIdAndUpdate(id, updates, { new: true });
    if (!tag) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }

    logger.info(`Tag updated: ${tag.name}`);
    res.json({ success: true, data: tag });
  } catch (error) {
    logger.error('Error updating tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/tags/:id
 */
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }

    logger.info(`Tag deleted: ${tag.name}`);
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    logger.error('Error deleting tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllTags, createTag, updateTag, deleteTag };
