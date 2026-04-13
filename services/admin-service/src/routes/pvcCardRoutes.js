// PVC Card Routes — Admin Service
// Admin management of PVC cards, variations, and dynamic questions

const express = require('express');
const router = express.Router();
const pvcCardController = require('../controllers/pvcCardController');
const pvcCardQuestionController = require('../controllers/pvcCardQuestionController');

// ──────────────────────────────────────────
// PVC Cards CRUD
// ──────────────────────────────────────────
router.get('/', pvcCardController.getAllPVCCards);
router.get('/:cardId', pvcCardController.getPVCCard);
router.post('/', pvcCardController.createPVCCard);
router.put('/:cardId', pvcCardController.updatePVCCard);
router.delete('/:cardId', pvcCardController.deletePVCCard);

// ──────────────────────────────────────────
// Card Questions Management
// ──────────────────────────────────────────
router.get('/:cardId/questions', pvcCardQuestionController.getCardQuestions);
router.post('/:cardId/questions', pvcCardQuestionController.createQuestion);
router.put('/questions/:questionId', pvcCardQuestionController.updateQuestion);
router.delete('/questions/:questionId', pvcCardQuestionController.deleteQuestion);
router.put('/:cardId/questions/reorder', pvcCardQuestionController.reorderQuestions);

module.exports = router;
