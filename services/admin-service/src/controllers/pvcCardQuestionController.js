// PVC Card Question Controller — Admin management of dynamic questions

const logger = require('@sarkari/logger');
const { PVCCardQuestion } = require('@sarkari/database').models;

/**
 * GET /api/admin/pvc-cards/:cardId/questions
 * Get all questions for a card
 */
const getCardQuestions = async (req, res) => {
  try {
    const { cardId } = req.params;

    const questions = await PVCCardQuestion.find({ pvcCard: cardId })
      .select('-createdBy')
      .sort({ sortOrder: 1 })
      .lean();

    res.json({ success: true, data: questions });
  } catch (error) {
    logger.error('Error fetching card questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/pvc-cards/:cardId/questions
 * Create a question for a card
 */
const createQuestion = async (req, res) => {
  try {
    const { cardId } = req.params;
    const {
      question,
      placeholder,
      description,
      type,
      isRequired,
      minLength,
      maxLength,
      pattern,
      options,
      applicableVariations,
      sortOrder,
      displayWidth,
    } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Question text is required' });
    }

    const questionDoc = await PVCCardQuestion.create({
      pvcCard: cardId,
      question: question.trim(),
      placeholder: placeholder || '',
      description: description || '',
      type: type || 'text',
      isRequired: isRequired !== false,
      minLength: minLength || 0,
      maxLength: maxLength || 500,
      pattern: pattern || '',
      options: options || [],
      applicableVariations: applicableVariations || [],
      sortOrder: sortOrder || 0,
      displayWidth: displayWidth || 'full',
      createdBy: userId,
    });

    logger.info(`Question created for card ${cardId}: ${question}`);
    res.status(201).json({ success: true, data: questionDoc });
  } catch (error) {
    logger.error('Error creating question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/pvc-cards/questions/:questionId
 * Update a question
 */
const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      question,
      placeholder,
      description,
      type,
      isRequired,
      minLength,
      maxLength,
      pattern,
      options,
      applicableVariations,
      sortOrder,
      displayWidth,
    } = req.body;

    const updateData = {};
    if (question !== undefined) updateData.question = question.trim();
    if (placeholder !== undefined) updateData.placeholder = placeholder;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (minLength !== undefined) updateData.minLength = minLength;
    if (maxLength !== undefined) updateData.maxLength = maxLength;
    if (pattern !== undefined) updateData.pattern = pattern;
    if (options !== undefined) updateData.options = options;
    if (applicableVariations !== undefined) updateData.applicableVariations = applicableVariations;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (displayWidth !== undefined) updateData.displayWidth = displayWidth;

    const questionDoc = await PVCCardQuestion.findByIdAndUpdate(questionId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!questionDoc) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    logger.info(`Question updated: ${questionId}`);
    res.json({ success: true, data: questionDoc });
  } catch (error) {
    logger.error('Error updating question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/pvc-cards/questions/:questionId
 * Delete a question
 */
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const result = await PVCCardQuestion.findByIdAndDelete(questionId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    logger.info(`Question deleted: ${questionId}`);
    res.json({ success: true, data: { id: questionId } });
  } catch (error) {
    logger.error('Error deleting question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/pvc-cards/:cardId/questions/reorder
 * Reorder questions (bulk update sortOrder)
 */
const reorderQuestions = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { questions } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, error: 'Questions array is required' });
    }

    const updates = questions.map((q) =>
      PVCCardQuestion.findByIdAndUpdate(q.id, { sortOrder: q.sortOrder }, { new: true })
    );

    await Promise.all(updates);

    logger.info(`Reordered ${questions.length} questions for card ${cardId}`);
    res.json({ success: true, data: { updated: questions.length } });
  } catch (error) {
    logger.error('Error reordering questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCardQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
};
