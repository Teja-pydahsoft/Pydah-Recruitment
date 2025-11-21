const mongoose = require('mongoose');

/**
 * TypingTest Model
 * Stores typing test configurations for non-teaching candidates
 * Similar to Typing Master functionality
 */
const typingTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Typing Speed Test'
  },
  description: {
    type: String,
    trim: true
  },
  // The paragraph that candidates need to type
  typingParagraph: {
    type: String,
    required: true,
    trim: true
  },
  // Duration options in minutes (1 or 2 minutes)
  durationOptions: {
    type: [Number],
    default: [1, 2],
    validate: {
      validator: function(v) {
        return v.every(opt => opt === 1 || opt === 2);
      },
      message: 'Duration options must be 1 or 2 minutes'
    }
  },
  // Default duration if not specified
  defaultDuration: {
    type: Number,
    default: 1,
    enum: [1, 2]
  },
  // Form category - should be non_teaching
  formCategory: {
    type: String,
    enum: ['non_teaching'],
    required: true,
    default: 'non_teaching'
  },
  // Form reference (optional - can be linked to specific recruitment form)
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruitmentForm'
  },
  // Test link for direct access
  testLink: {
    type: String,
    unique: true,
    sparse: true
  },
  // Candidates assigned to this typing test
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
    invitedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: Date,
    completedAt: Date
  }],
  // Instructions for the test
  instructions: {
    type: String,
    default: 'Type the given paragraph as accurately and quickly as possible. Your typing speed (WPM) and accuracy will be measured.'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Test availability window
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
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
typingTestSchema.pre('save', function(next) {
  if (!this.testLink) {
    this.testLink = `typing_${this._id}_${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('TypingTest', typingTestSchema);

