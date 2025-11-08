const mongoose = require('mongoose');

const questionTopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['teaching', 'non_teaching'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

questionTopicSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('QuestionTopic', questionTopicSchema);

