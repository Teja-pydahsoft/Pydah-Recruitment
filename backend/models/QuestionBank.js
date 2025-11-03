const mongoose = require('mongoose');

const mcqSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    trim: true
  },
  subTopic: {
    type: String,
    trim: true
  },
  questionText: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    validate: v => Array.isArray(v) && v.length >= 2
  },
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed, // string or array index(es)
    required: true
  },
  explanation: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [String],
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

module.exports = mongoose.model('QuestionBank', mcqSchema);


