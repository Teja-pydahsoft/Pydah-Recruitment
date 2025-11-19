const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  campus: {
    type: String,
    required: true,
    enum: ['Btech', 'Degree', 'Pharmacy', 'Diploma'],
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique campus-department combination
courseSchema.index({ campus: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);

