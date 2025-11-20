const mongoose = require('mongoose');

const mcqSchema = new mongoose.Schema({
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionTopic',
    required: true
  },
  topicName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['teaching', 'non_teaching'],
    required: true
  },
  campus: {
    type: String,
    enum: ['Btech', 'Degree', 'Pharmacy', 'Diploma'],
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  subTopic: {
    type: String,
    trim: true
  },
  set: {
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


