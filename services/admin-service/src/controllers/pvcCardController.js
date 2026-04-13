// PVC Card Controller — Admin management of PVC card types and variations

const logger = require('@sarkari/logger');
const { PVCCard, PVCCardQuestion } = require('@sarkari/database').models;
const { generateSlug } = require('../utils/slug');

/**
 * GET /api/admin/pvc-cards
 * List all PVC cards
 */
const getAllPVCCards = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';

    const cards = await PVCCard.find(filter)
      .select('-createdBy -updatedBy')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: cards });
  } catch (error) {
    logger.error('Error fetching PVC cards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/admin/pvc-cards/:cardId
 * Get single PVC card with questions
 */
const getPVCCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await PVCCard.findById(cardId).select('-createdBy -updatedBy');

    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const questions = await PVCCardQuestion.find({ pvcCard: cardId })
      .select('-createdBy')
      .sort({ sortOrder: 1 })
      .lean();

    res.json({ success: true, data: { card, questions } });
  } catch (error) {
    logger.error('Error fetching PVC card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/pvc-cards
 * Create new PVC card
 */
const createPVCCard = async (req, res) => {
  try {
    const { name, description, variations, thumbnailUrl, thumbnailKey } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Card name is required' });
    }

    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one variation is required',
      });
    }

    // Validate variations
    if (!variations.every((v) => v.name && v.price > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Each variation must have name and price',
      });
    }

    const slug = generateSlug(name);

    // Check if card already exists
    const existing = await PVCCard.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Card with this name already exists',
      });
    }

    const card = await PVCCard.create({
      name: name.trim(),
      slug,
      description: description || '',
      variations,
      thumbnailUrl: thumbnailUrl || '',
      thumbnailKey: thumbnailKey || '',
      createdBy: userId,
    });

    logger.info(`PVC Card created: ${card.name} (${card.slug})`);
    res.status(201).json({ success: true, data: card });
  } catch (error) {
    logger.error('Error creating PVC card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/pvc-cards/:cardId
 * Update PVC card
 */
const updatePVCCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { name, description, variations, thumbnailUrl, thumbnailKey, isActive, displayOrder } = req.body;
    const userId = req.user?.id;

    if (!Object.keys(req.body).length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (variations !== undefined) {
      if (!Array.isArray(variations) || variations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one variation is required',
        });
      }
      updateData.variations = variations;
    }
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (thumbnailKey !== undefined) updateData.thumbnailKey = thumbnailKey;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    updateData.updatedBy = userId;

    const card = await PVCCard.findByIdAndUpdate(cardId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    logger.info(`PVC Card updated: ${card.name}`);
    res.json({ success: true, data: card });
  } catch (error) {
    logger.error('Error updating PVC card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/pvc-cards/:cardId
 * Delete PVC card (soft delete by marking inactive)
 */
const deletePVCCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await PVCCard.findByIdAndUpdate(
      cardId,
      { isActive: false },
      { new: true }
    );

    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    logger.info(`PVC Card marked inactive: ${card.name}`);
    res.json({ success: true, data: card });
  } catch (error) {
    logger.error('Error deleting PVC card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllPVCCards,
  getPVCCard,
  createPVCCard,
  updatePVCCard,
  deletePVCCard,
};
