const express = require('express');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all candidates (Super Admin only)
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const candidates = await Candidate.find({})
      .populate('user', 'name email')
      .populate('form', 'title position department')
      .sort({ createdAt: -1 })
      .lean();
    
    // Add passport photo URL to each candidate
    const candidatesWithPhoto = candidates.map(candidate => {
      // Convert Map to object if needed
      const appData = candidate.applicationData instanceof Map 
        ? Object.fromEntries(candidate.applicationData)
        : candidate.applicationData || {};
      
      const passportPhoto = appData.passportPhoto || 
                           candidate.documents?.find(d => 
                             d && (d.name?.toLowerCase().includes('photo') || 
                             d.name?.toLowerCase().includes('passport'))
                           )?.url;
      return {
        ...candidate,
        applicationData: appData,
        passportPhotoUrl: passportPhoto
      };
    });

    res.json({ candidates: candidatesWithPhoto });
  } catch (error) {
    console.error('Candidates fetch error:', error);
    res.status(500).json({ message: 'Server error fetching candidates' });
  }
});

// Get candidate by ID with full profile (Super Admin and the candidate themselves)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('user', 'name email profile')
      .populate('form', 'title position department requirements')
      .populate('testResults.test', 'title')
      .populate('interviewFeedback.interview', 'title round type')
      .populate('interviewFeedback.panelMember', 'name email');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && candidate.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Structure the response for tabbed view
    const profileData = {
      _id: candidate._id,
      user: candidate.user,
      form: candidate.form,
      status: candidate.status,
      applicationData: candidate.applicationData,
      createdAt: candidate.createdAt,

      // Tab 1: Personal & Form Details
      personalDetails: {
        name: candidate.user.name,
        email: candidate.user.email,
        phone: candidate.user.profile?.phone,
        applicationData: candidate.applicationData instanceof Map 
          ? Object.fromEntries(candidate.applicationData)
          : candidate.applicationData || {},
        documents: candidate.documents || [],
        passportPhoto: (candidate.applicationData instanceof Map 
          ? candidate.applicationData.get('passportPhoto')
          : candidate.applicationData?.passportPhoto) || 
          candidate.documents?.find(d => d && (d.name?.toLowerCase().includes('photo') || d.name?.toLowerCase().includes('passport')))?.url
      },

      // Tab 2: Test Results & Evaluation Summary
      testResults: {
        summary: {
          totalTests: candidate.testResults.length,
          passedTests: candidate.testResults.filter(t => t.status === 'passed').length,
          averageScore: candidate.testResults.length > 0
            ? candidate.testResults.reduce((sum, t) => sum + t.percentage, 0) / candidate.testResults.length
            : 0
        },
        tests: candidate.testResults.map(test => ({
          testId: test.test._id,
          testTitle: test.test.title,
          score: test.score,
          totalScore: test.totalScore,
          percentage: test.percentage,
          status: test.status,
          submittedAt: test.submittedAt
        }))
      },

      // Tab 3: Interview Feedback Summary
      interviewFeedback: {
        summary: {
          totalInterviews: candidate.interviewFeedback.length,
          averageRating: candidate.consolidatedInterviewRating,
          feedbackCount: candidate.interviewFeedback.length
        },
        feedback: candidate.interviewFeedback.map(feedback => ({
          interviewId: feedback.interview._id,
          interviewTitle: feedback.interview.title,
          round: feedback.interview.round,
          type: feedback.interview.type,
          panelMember: {
            name: feedback.panelMember.name,
            email: feedback.panelMember.email
          },
          ratings: feedback.ratings,
          comments: feedback.comments,
          recommendation: feedback.recommendation,
          submittedAt: feedback.submittedAt
        }))
      },

      // Final decision (if any)
      finalDecision: candidate.finalDecision
    };

    res.json({ candidate: profileData });
  } catch (error) {
    console.error('Candidate fetch error:', error);
    res.status(500).json({ message: 'Server error fetching candidate' });
  }
});

// Update candidate status (Super Admin only)
router.put('/:id/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email')
     .populate('form', 'title position department');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    res.json({
      message: 'Candidate status updated successfully',
      candidate
    });
  } catch (error) {
    console.error('Candidate status update error:', error);
    res.status(500).json({ message: 'Server error updating candidate status' });
  }
});

// Set final decision (Super Admin only)
router.put('/:id/final-decision', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { decision, notes } = req.body;
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    candidate.finalDecision = {
      decision,
      notes,
      decidedBy: req.user._id,
      decidedAt: new Date()
    };

    // Update candidate status based on final decision
    if (decision === 'selected') {
      candidate.status = 'selected';
    } else if (decision === 'rejected') {
      candidate.status = 'rejected';
    } else {
      candidate.status = 'on_hold';
    }

    await candidate.save();
    await candidate.populate('user', 'name email');

    res.json({
      message: 'Final decision recorded successfully',
      candidate
    });
  } catch (error) {
    console.error('Final decision error:', error);
    res.status(500).json({ message: 'Server error recording final decision' });
  }
});

// Get candidate's own profile (for candidates)
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ message: 'Access denied. Candidates only.' });
    }

    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate('form', 'title position department')
      .populate('testResults.test', 'title')
      .populate('interviewFeedback.interview', 'title round type')
      .populate('interviewFeedback.panelMember', 'name');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json({ candidate });
  } catch (error) {
    console.error('Candidate profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update candidate application data (for candidates - limited fields)
router.put('/profile/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ message: 'Access denied. Candidates only.' });
    }

    const { applicationData } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { user: req.user._id },
      { applicationData },
      { new: true, runValidators: true }
    ).populate('user', 'name email')
     .populate('form', 'title position department');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      candidate
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Get candidates by form (Super Admin only)
router.get('/form/:formId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const candidates = await Candidate.find({ form: req.params.formId })
      .populate('user', 'name email')
      .populate('form', 'title position department')
      .sort({ createdAt: -1 });

    res.json({ candidates });
  } catch (error) {
    console.error('Form candidates fetch error:', error);
    res.status(500).json({ message: 'Server error fetching candidates' });
  }
});

// Get candidates by status (Super Admin only)
router.get('/status/:status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const candidates = await Candidate.find({ status: req.params.status })
      .populate('user', 'name email')
      .populate('form', 'title position department')
      .sort({ createdAt: -1 });

    res.json({ candidates });
  } catch (error) {
    console.error('Status candidates fetch error:', error);
    res.status(500).json({ message: 'Server error fetching candidates' });
  }
});

// Bulk update candidate status (Super Admin only)
router.put('/bulk/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { candidateIds, status } = req.body;

    const result = await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      { status }
    );

    res.json({
      message: `Updated ${result.modifiedCount} candidates`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ message: 'Server error updating candidates' });
  }
});

// Get candidate statistics (Super Admin only)
router.get('/stats/overview', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await Candidate.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCandidates = stats.reduce((sum, stat) => sum + stat.count, 0);

    // Get test and interview stats
    const testStats = await Candidate.aggregate([
      { $unwind: '$testResults' },
      {
        $group: {
          _id: '$testResults.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const interviewStats = await Candidate.aggregate([
      { $unwind: '$interviewFeedback' },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$interviewFeedback.ratings.overallRating' }
        }
      }
    ]);

    res.json({
      totalCandidates,
      statusBreakdown: stats,
      testStats,
      interviewStats: interviewStats[0] || { totalFeedback: 0, averageRating: 0 }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// Export candidates data (Super Admin only)
router.get('/export/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const candidates = await Candidate.find({})
      .populate('user', 'name email profile')
      .populate('form', 'title position department')
      .populate('testResults.test', 'title')
      .populate('interviewFeedback.interview', 'title')
      .populate('interviewFeedback.panelMember', 'name')
      .sort({ createdAt: -1 });

    // Format for export
    const exportData = candidates.map(candidate => ({
      candidateId: candidate._id,
      name: candidate.user.name,
      email: candidate.user.email,
      phone: candidate.user.profile?.phone,
      position: candidate.form.title,
      department: candidate.form.department,
      status: candidate.status,
      appliedDate: candidate.createdAt,
      testResults: candidate.testResults.map(t => ({
        testTitle: t.test.title,
        score: t.percentage,
        status: t.status
      })),
      interviewFeedback: candidate.interviewFeedback.map(f => ({
        interviewTitle: f.interview.title,
        rating: f.ratings.overallRating,
        recommendation: f.recommendation
      })),
      finalDecision: candidate.finalDecision?.decision || 'Pending'
    }));

    res.json({
      candidates: exportData,
      totalCount: exportData.length,
      exportedAt: new Date()
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error exporting data' });
  }
});

module.exports = router;
