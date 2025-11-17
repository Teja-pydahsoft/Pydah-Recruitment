const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
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
  candidates: [{
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled'
    },
    scheduledDate: Date,
    scheduledTime: String,
    duration: Number, // in minutes
    meetingLink: String,
    notes: String,
    panelMembers: [{
      panelMember: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['interviewer', 'observer'],
        default: 'interviewer'
      },
      assignedAt: {
        type: Date,
        default: Date.now
      },
      feedbackToken: {
        type: String,
        unique: true,
        sparse: true
      },
      notificationSent: {
        type: Boolean,
        default: false
      }
    }]
  }],
  panelMembers: [{
    panelMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['interviewer', 'observer'],
      default: 'interviewer'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    feedbackToken: {
      type: String,
      unique: true,
      sparse: true
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  }],
  evaluationCriteria: [{
    criterion: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
      max: 5
    },
    description: String
  }],
  feedbackForm: {
    questions: [{
      question: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['rating', 'text', 'yes_no'],
        default: 'rating'
      },
      required: {
        type: Boolean,
        default: true
      },
      options: [String] // For yes_no or custom options
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  round: {
    type: Number,
    default: 1
  },
  type: {
    type: String,
    enum: ['technical', 'hr', 'final'],
    default: 'technical'
  }
}, {
  timestamps: true
});

// Virtual for completion status
interviewSchema.virtual('isCompleted').get(function() {
  return this.candidates.every(candidate => candidate.status === 'completed');
});

// Method to get feedback summary
interviewSchema.methods.getFeedbackSummary = async function() {
  const Candidate = mongoose.model('Candidate');
  const feedbacks = [];

  for (const candidateData of this.candidates) {
    const candidate = await Candidate.findById(candidateData.candidate)
      .populate('interviewFeedback.panelMember', 'name email')
      .populate('user', 'name email');

    const candidateFeedbacks = candidate.interviewFeedback.filter(
      feedback => feedback.interview.toString() === this._id.toString()
    );

    // Calculate average rating from questionAnswers if available
    let averageRating = candidate.consolidatedInterviewRating;
    if (candidateFeedbacks.length > 0 && this.feedbackForm && this.feedbackForm.questions) {
      const ratingQuestions = this.feedbackForm.questions.filter(q => q.type === 'rating');
      if (ratingQuestions.length > 0) {
        let totalRating = 0;
        let ratingCount = 0;
        candidateFeedbacks.forEach(feedback => {
          if (feedback.questionAnswers && feedback.questionAnswers.length > 0) {
            feedback.questionAnswers.forEach(qa => {
              if (qa.type === 'rating' && typeof qa.answer === 'number') {
                totalRating += qa.answer;
                ratingCount++;
              }
            });
          }
          // Fallback to old ratings structure
          if (feedback.ratings && feedback.ratings.overallRating) {
            totalRating += feedback.ratings.overallRating;
            ratingCount++;
          }
        });
        if (ratingCount > 0) {
          averageRating = totalRating / ratingCount;
        }
      }
    }

    feedbacks.push({
      candidate: {
        _id: candidate._id,
        name: candidate.user?.name || 'Unknown',
        email: candidate.user?.email || '',
        candidateNumber: candidate.candidateNumber || ''
      },
      feedbacks: candidateFeedbacks.map(f => ({
        panelMember: f.panelMember,
        ratings: f.ratings,
        comments: f.comments,
        recommendation: f.recommendation,
        questionAnswers: f.questionAnswers || [],
        submittedAt: f.submittedAt
      })),
      averageRating: averageRating || 0
    });
  }

  return feedbacks;
};

module.exports = mongoose.model('Interview', interviewSchema);
