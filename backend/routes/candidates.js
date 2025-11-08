const express = require('express');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Test = require('../models/Test');
const Interview = require('../models/Interview');
const { authenticateToken, requireSuperAdminOrPermission, hasPermission } = require('../middleware/auth');

const router = express.Router();

const buildWorkflowSnapshot = (candidate, testAssignments = [], interviewAssignments = []) => {
  const tests = testAssignments || [];
  const interviews = interviewAssignments || [];
  const testResults = candidate.testResults || [];
  const finalDecision = candidate.finalDecision?.decision || null;

  const testsPending = tests.filter(t => ['invited', 'started'].includes(t.status)).length;
  const testsCompleted = tests.filter(t => t.status === 'completed').length;
  const testsExpired = tests.filter(t => t.status === 'expired').length;
  const testsAssigned = tests.length;

  const passedTests = testResults.filter(tr => tr.status === 'passed').length;
  const failedTests = testResults.filter(tr => tr.status === 'failed').length;

  const interviewsScheduled = interviews.filter(i => i.status === 'scheduled').length;
  const interviewsCompleted = interviews.filter(i => i.status === 'completed').length;
  const interviewsCancelled = interviews.filter(i => i.status === 'cancelled' || i.status === 'no_show').length;

  let stage = 'application_review';
  let label = 'Application in Review';
  let nextAction = 'Review application details';

  const candidateStatus = candidate.status;

  if (candidateStatus === 'rejected' || finalDecision === 'rejected') {
    stage = 'rejected';
    label = 'Application Rejected';
    nextAction = 'Notify candidate of decision';
  } else if (finalDecision === 'selected' || candidateStatus === 'selected') {
    stage = 'selected';
    label = 'Candidate Selected';
    nextAction = 'Proceed with onboarding';
  } else if (finalDecision === 'on_hold') {
    stage = 'on_hold';
    label = 'Candidate On Hold';
    nextAction = 'Review hold status regularly';
  } else if (interviewsCompleted > 0 && !finalDecision) {
    stage = 'awaiting_decision';
    label = 'Awaiting Final Decision';
    nextAction = 'Record final decision';
  } else if (interviewsScheduled > 0) {
    stage = 'interview_scheduled';
    label = 'Interview Scheduled';
    nextAction = 'Conduct interview and capture feedback';
  } else if (passedTests > 0) {
    stage = 'awaiting_interview';
    label = 'Awaiting Interview Scheduling';
    nextAction = 'Schedule next interview round';
  } else if (testsPending > 0) {
    stage = 'test_in_progress';
    label = 'Test In Progress';
    nextAction = 'Monitor test completion';
  } else if (testsAssigned > 0) {
    stage = 'test_assigned';
    label = 'Test Assigned';
    nextAction = 'Ensure candidate starts the test';
  } else if (['approved', 'shortlisted'].includes(candidateStatus)) {
    stage = 'awaiting_test_assignment';
    label = 'Awaiting Test Assignment';
    nextAction = 'Assign appropriate assessment';
  } else if (candidateStatus === 'pending') {
    stage = 'application_review';
    label = 'Application in Review';
    nextAction = 'Review application details';
  }

  return {
    stage,
    label,
    nextAction,
    tests: {
      assigned: testsAssigned,
      pending: testsPending,
      completed: testsCompleted,
      expired: testsExpired,
      passed: passedTests,
      failed: failedTests
    },
    interviews: {
      scheduled: interviewsScheduled,
      completed: interviewsCompleted,
      cancelled: interviewsCancelled
    },
    finalDecision: candidate.finalDecision || null
  };
};

// Get all candidates (Super Admin only)
router.get('/', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
  try {
    const candidates = await Candidate.find({})
      .populate('user', 'name email')
      .populate('form', 'title position department formCategory')
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

    const candidateIds = candidatesWithPhoto.map(candidate => candidate._id);

    const tests = await Test.find({ 'candidates.candidate': { $in: candidateIds } })
      .select('title candidates scheduledDate scheduledTime createdAt')
      .lean();

    const interviews = await Interview.find({ 'candidates.candidate': { $in: candidateIds } })
      .select('title type round candidates createdAt')
      .lean();

    const testsByCandidate = new Map();
    tests.forEach(test => {
      test.candidates.forEach(entry => {
        const candidateId = entry.candidate.toString();
        if (!testsByCandidate.has(candidateId)) {
          testsByCandidate.set(candidateId, []);
        }
        testsByCandidate.get(candidateId).push({
          testId: test._id,
          title: test.title,
          status: entry.status,
          invitedAt: entry.invitedAt,
          startedAt: entry.startedAt,
          completedAt: entry.completedAt,
          score: entry.score,
          percentage: entry.percentage,
          scheduledDate: test.scheduledDate,
          scheduledTime: test.scheduledTime,
          createdAt: test.createdAt
        });
      });
    });

    const interviewsByCandidate = new Map();
    interviews.forEach(interview => {
      interview.candidates.forEach(entry => {
        const candidateId = entry.candidate.toString();
        if (!interviewsByCandidate.has(candidateId)) {
          interviewsByCandidate.set(candidateId, []);
        }
        interviewsByCandidate.get(candidateId).push({
          interviewId: interview._id,
          title: interview.title,
          round: interview.round,
          type: interview.type,
          status: entry.status,
          scheduledDate: entry.scheduledDate,
          scheduledTime: entry.scheduledTime,
          notes: entry.notes,
          createdAt: interview.createdAt
        });
      });
    });

    const enrichedCandidates = candidatesWithPhoto.map(candidate => {
      const candidateId = candidate._id.toString();
      const testAssignments = testsByCandidate.get(candidateId) || [];
      const interviewAssignments = interviewsByCandidate.get(candidateId) || [];

      const workflow = buildWorkflowSnapshot(candidate, testAssignments, interviewAssignments);

      return {
        ...candidate,
        workflow,
        assignments: {
          tests: testAssignments,
          interviews: interviewAssignments
        }
      };
    });

    res.json({ candidates: enrichedCandidates });
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
    const canManageCandidates = hasPermission(req.user, 'candidates.manage');

    if (!canManageCandidates && candidate.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tests = await Test.find({ 'candidates.candidate': candidate._id })
      .select('title candidates scheduledDate scheduledTime createdAt')
      .lean();

    const interviews = await Interview.find({ 'candidates.candidate': candidate._id })
      .select('title type round candidates createdAt')
      .lean();

    const testAssignments = [];
    tests.forEach(test => {
      test.candidates.forEach(entry => {
        if (entry.candidate.toString() === candidate._id.toString()) {
          testAssignments.push({
            testId: test._id,
            title: test.title,
            status: entry.status,
            invitedAt: entry.invitedAt,
            startedAt: entry.startedAt,
            completedAt: entry.completedAt,
            score: entry.score,
            percentage: entry.percentage,
            scheduledDate: test.scheduledDate,
            scheduledTime: test.scheduledTime,
            createdAt: test.createdAt
          });
        }
      });
    });

    const interviewAssignments = [];
    interviews.forEach(interview => {
      interview.candidates.forEach(entry => {
        if (entry.candidate.toString() === candidate._id.toString()) {
          interviewAssignments.push({
            interviewId: interview._id,
            title: interview.title,
            round: interview.round,
            type: interview.type,
            status: entry.status,
            scheduledDate: entry.scheduledDate,
            scheduledTime: entry.scheduledTime,
            notes: entry.notes,
            createdAt: interview.createdAt
          });
        }
      });
    });

    const workflow = buildWorkflowSnapshot(candidate.toObject(), testAssignments, interviewAssignments);

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
      finalDecision: candidate.finalDecision,
      workflow,
      assignments: {
        tests: testAssignments,
        interviews: interviewAssignments
      }
    };

    res.json({ candidate: profileData });
  } catch (error) {
    console.error('Candidate fetch error:', error);
    res.status(500).json({ message: 'Server error fetching candidate' });
  }
});

// Generate unique candidate number
const generateCandidateNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `CAND-${year}-`;
  
  // Find the highest candidate number for this year
  const lastCandidate = await Candidate.findOne({
    candidateNumber: { $regex: `^${prefix}` }
  }).sort({ candidateNumber: -1 });
  
  let sequence = 1;
  if (lastCandidate && lastCandidate.candidateNumber) {
    const lastSequence = parseInt(lastCandidate.candidateNumber.split('-')[2] || '0');
    sequence = lastSequence + 1;
  }
  
  // Format: CAND-YYYY-XXXXX (5 digits)
  return `${prefix}${sequence.toString().padStart(5, '0')}`;
};

// Update candidate status (Super Admin only)
router.put('/:id/status', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
  try {
    const { status } = req.body;
    const candidate = await Candidate.findById(req.params.id)
      .populate('user', 'name email role');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Generate unique candidate number when status changes to approved (if not already assigned)
    if (status === 'approved' && !candidate.candidateNumber) {
      try {
        candidate.candidateNumber = await generateCandidateNumber();
        console.log(`✅ Generated candidate number: ${candidate.candidateNumber} for candidate ${candidate._id}`);
      } catch (error) {
        console.error('Error generating candidate number:', error);
        // Continue without candidate number if generation fails
      }
    }

    // Update candidate status
    candidate.status = status;
    await candidate.save();

    // Ensure user has candidate role when approved
    if (status === 'approved' && candidate.user && candidate.user.role !== 'candidate') {
      const User = require('../models/User');
      await User.findByIdAndUpdate(candidate.user._id, { role: 'candidate' });
      console.log(`✅ Updated user ${candidate.user.email} role to candidate`);
    }

    // Populate form for response
    await candidate.populate('form', 'title position department');

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
router.put('/:id/final-decision', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
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
      
      // Decrease vacancies count when candidate is selected
      const RecruitmentForm = require('../models/RecruitmentForm');
      const form = await RecruitmentForm.findById(candidate.form);
      if (form && form.vacancies) {
        // Check if vacancies are not already filled
        if (form.filledVacancies < form.vacancies) {
          form.filledVacancies = (form.filledVacancies || 0) + 1;
          await form.save();
          console.log(`✅ Vacancy filled for form ${form._id}. Now ${form.filledVacancies}/${form.vacancies} filled.`);
        }
      }
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
router.get('/form/:formId', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
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
router.get('/status/:status', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
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
router.put('/bulk/status', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
  try {
    const { candidateIds, status } = req.body;

    // If approving candidates, generate unique numbers for those without one
    if (status === 'approved') {
      const candidates = await Candidate.find({ 
        _id: { $in: candidateIds },
        candidateNumber: { $exists: false }
      });

      for (const candidate of candidates) {
        try {
          candidate.candidateNumber = await generateCandidateNumber();
          candidate.status = status;
          await candidate.save();
          console.log(`✅ Generated candidate number: ${candidate.candidateNumber} for candidate ${candidate._id}`);
        } catch (error) {
          console.error(`Error generating candidate number for ${candidate._id}:`, error);
          // Update status even if number generation fails
          candidate.status = status;
          await candidate.save();
        }
      }

      // Update remaining candidates (those that already have numbers)
      const remainingIds = candidateIds.filter(id => 
        !candidates.some(c => c._id.toString() === id.toString())
      );

      if (remainingIds.length > 0) {
        await Candidate.updateMany(
          { _id: { $in: remainingIds } },
          { status }
        );
      }

      const totalUpdated = candidates.length + remainingIds.length;

      res.json({
        message: `Updated ${totalUpdated} candidates`,
        modifiedCount: totalUpdated
      });
    } else {
      // For other statuses, just update normally
      const result = await Candidate.updateMany(
        { _id: { $in: candidateIds } },
        { status }
      );

      res.json({
        message: `Updated ${result.modifiedCount} candidates`,
        modifiedCount: result.modifiedCount
      });
    }
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ message: 'Server error updating candidates' });
  }
});

// Get candidate statistics (Super Admin only)
router.get('/stats/overview', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
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
router.get('/export/all', authenticateToken, requireSuperAdminOrPermission('candidates.manage'), async (req, res) => {
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
