// Read Service Routes
// GET /api/results

const express = require('express');
const router = express.Router();
const { ExamResult } = require('@sarkari/database').models;

// Get all exam results
router.get('/', async (req, res) => {
  try {
    const results = await ExamResult.find({});
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exam result by roll number
router.get('/:rollNumber', async (req, res) => {
  try {
    const result = await ExamResult.findOne({ rollNumber: req.params.rollNumber });
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
