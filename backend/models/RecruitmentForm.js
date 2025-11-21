const mongoose = require('mongoose');

const recruitmentFormSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  formType: {
    type: String,
    enum: ['candidate_profile', 'feedback_form'],
    required: true,
    default: 'candidate_profile'
  },
  formCategory: {
    type: String,
    enum: ['teaching', 'non_teaching'],
    required: function() {
      return this.formType === 'candidate_profile';
    }
  },
  position: {
    type: String,
    required: function() {
      return this.formType === 'candidate_profile';
    },
    trim: true
  },
  campus: {
    type: String,
    required: function() {
      return this.formType === 'candidate_profile';
    },
    enum: ['Btech', 'Degree', 'Pharmacy', 'Diploma'],
    trim: true
  },
  department: {
    type: String,
    required: function() {
      // Department is only required for teaching forms, not for non-teaching
      return this.formType === 'candidate_profile' && this.formCategory === 'teaching';
    },
    trim: true
  },
  requirements: {
    experience: {
      min: Number,
      max: Number,
      preferred: String
    },
    skills: [String],
    qualifications: [String],
    responsibilities: [String]
  },
  formFields: [{
    fieldName: {
      type: String,
      required: true
    },
    fieldType: {
      type: String,
      enum: ['text', 'email', 'number', 'date', 'textarea', 'select', 'file', 'file_multiple', 'rating', 'yes_no', 'radio', 'checkbox'],
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [String], // For select fields
    placeholder: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  closingDate: {
    type: Date,
    required: function() {
      return this.formType === 'candidate_profile';
    }
  },
  vacancies: {
    type: Number,
    required: function() {
      return this.formType === 'candidate_profile';
    },
    min: 0,
    default: 1
  },
  filledVacancies: {
    type: Number,
    default: 0,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submissionCount: {
    type: Number,
    default: 0
  },
  uniqueLink: {
    type: String,
    unique: true
  },
  qrCode: {
    data: String, // Base64 encoded QR code
    url: String,  // URL to the QR code image
    generatedAt: Date
  },
  driveFolder: {
    id: String,
    name: String,
    createdAt: Date
  },
  driveFieldFolders: [{
    fieldName: String,
    folderName: String,
    folderId: String
  }]
}, {
  timestamps: true
});

// Generate unique link before saving
recruitmentFormSchema.pre('save', function(next) {
  if (!this.uniqueLink) {
    this.uniqueLink = `form_${this.formType}_${this._id}_${Date.now()}`;
  }
  
  // Auto-disable form if closing date has passed
  if (this.closingDate && new Date(this.closingDate) < new Date() && this.isActive) {
    this.isActive = false;
  }
  
  next();
});

// Check and update form status based on closing date (static method for periodic checks)
recruitmentFormSchema.statics.checkClosingDates = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      closingDate: { $lt: now },
      isActive: true,
      formType: 'candidate_profile'
    },
    {
      $set: { isActive: false }
    }
  );
  return result;
};

// Method to generate QR code
recruitmentFormSchema.methods.generateQRCode = async function() {
  const QRCode = require('qrcode');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const formUrl = `${frontendUrl}/form/${this.uniqueLink}`;
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(formUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    this.qrCode = {
      data: qrCodeDataURL,
      url: formUrl,
      generatedAt: new Date()
    };
    
    return this.qrCode;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

// Method to get form statistics
recruitmentFormSchema.methods.getStats = async function() {
  const Candidate = mongoose.model('Candidate');
  
  const stats = await Candidate.aggregate([
    { $match: { form: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalSubmissions = stats.reduce((sum, stat) => sum + stat.count, 0);
  
  return {
    totalSubmissions,
    statusBreakdown: stats
  };
};

module.exports = mongoose.model('RecruitmentForm', recruitmentFormSchema);
