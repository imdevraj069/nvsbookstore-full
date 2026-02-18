// Exam Result Model

const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true },
  examName: { type: String, required: true },
  marks: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  status: { type: String, enum: ['passed', 'failed'] },
  publishedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExamResult', examResultSchema);
