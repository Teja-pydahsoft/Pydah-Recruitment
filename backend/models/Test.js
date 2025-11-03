const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['mcq', 'multiple_answer', 'short_answer', 'long_answer', 'coding'],
    required: true
  },
  options: [String], // For MCQ questions
  correctAnswer: mongoose.Schema.Types.Mixed, // Can be string, array, or object
  marks: {
    type: Number,
    required: true,
    default: 1
  },
  timeLimit: Number, // in seconds
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [String]
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruitmentForm',
    required: true
  },
  questions: [questionSchema],
  totalMarks: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  passingPercentage: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  cutoffPercentage: {
    type: Number,
    default: 60,
    min: 0,
    max: 100
  },
  instructions: String,
  isActive: {
    type: Boolean,
    default: true
  },
  scheduledDate: Date,
  scheduledTime: String,
  testLink: {
    type: String,
    unique: true
  },
  candidates: [{
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    status: {
      type: String,
      enum: ['invited', 'started', 'completed', 'expired'],
      default: 'invited'
    },
    invitedAt: Date,
    startedAt: Date,
    completedAt: Date,
    score: Number,
    percentage: Number
  }],
  questionSource: {
    type: String,
    enum: ['bank', 'uploaded', 'manual'],
    default: 'manual'
  },
  sourceRefs: {
    bankQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' }],
    previousPaper: { type: mongoose.Schema.Types.ObjectId, ref: 'PreviousPaper' }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate test link before saving
testSchema.pre('save', function(next) {
  if (!this.testLink) {
    this.testLink = `test_${this._id}_${Date.now()}`;
  }
  next();
});

// Calculate total marks before saving
testSchema.pre('save', function(next) {
  this.totalMarks = this.questions.reduce((total, question) => total + question.marks, 0);
  next();
});

module.exports = mongoose.model('Test', testSchema);
