const mongoose = require('mongoose');

const previousPaperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  year: Number,
  subject: String,
  topic: String,
  fileName: String,
  originalFileUrl: String,
  parsed: {
    type: Boolean,
    default: false
  },
  questions: [{
    questionText: { type: String, required: true },
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    marks: { type: Number, default: 1 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    tags: [String]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PreviousPaper', previousPaperSchema);


