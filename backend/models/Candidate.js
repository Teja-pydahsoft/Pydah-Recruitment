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
      marks: Number
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
