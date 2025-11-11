const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruitmentForm',
    required: true
  },
  applicationData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  candidateNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'shortlisted', 'selected', 'on_hold'],
    default: 'pending'
  },
  testResults: [{
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test'
    },
    score: Number,
    totalScore: Number,
    percentage: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'passed', 'failed'],
      default: 'pending'
    },
    submittedAt: Date,
    answers: [{
      questionId: String,
      answer: mongoose.Schema.Types.Mixed,
      isCorrect: Boolean,
      marks: Number,
      timeTaken: Number, // Time taken in seconds for this question
      answeredAt: Date, // When this question was answered
      screenshot: String // URL to screenshot captured during test
    }],
    startedAt: Date, // When test was started
    candidatePhotos: [{
      timestamp: Date,
      url: String,
      description: String // e.g., "Test started - Before test", "Middle of test", "Test ended - After test"
    }],
    screenshots: [{
      timestamp: Date,
      url: String,
      description: String // Legacy field - kept for backward compatibility
    }]
  }],
  interviewFeedback: [{
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview'
    },
    panelMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ratings: {
      technicalSkills: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      problemSolving: {
        type: Number,
        min: 1,
        max: 5
      },
      overallRating: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    comments: String,
    recommendation: {
      type: String,
      enum: ['strong_reject', 'reject', 'neutral', 'accept', 'strong_accept']
    },
    // Store answers to custom feedback form questions
    questionAnswers: [{
      question: String, // The question text
      questionId: String, // Optional: unique identifier for the question
      answer: mongoose.Schema.Types.Mixed, // Can be string, number, boolean, etc.
      type: {
        type: String,
        enum: ['rating', 'text', 'yes_no']
      }
    }],
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  finalDecision: {
    decision: {
      type: String,
      enum: ['selected', 'rejected', 'on_hold']
    },
    notes: String,
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decidedAt: Date
  },
  documents: [{
    name: String,
    url: String,
    field: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for consolidated test score
candidateSchema.virtual('consolidatedTestScore').get(function() {
  if (this.testResults.length === 0) return 0;
  const totalScore = this.testResults.reduce((sum, result) => sum + (result.percentage || 0), 0);
  return totalScore / this.testResults.length;
});

// Virtual for consolidated interview rating
candidateSchema.virtual('consolidatedInterviewRating').get(function() {
  if (this.interviewFeedback.length === 0) return 0;
  const totalRating = this.interviewFeedback.reduce((sum, feedback) => sum + (feedback.ratings.overallRating || 0), 0);
  return totalRating / this.interviewFeedback.length;
});

module.exports = mongoose.model('Candidate', candidateSchema);
