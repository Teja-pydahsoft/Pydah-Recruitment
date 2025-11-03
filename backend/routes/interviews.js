const express = require('express');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { authenticateToken, requireSuperAdmin, requirePanelMember } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const crypto = require('crypto');

const router = express.Router();

// Create new interview (Super Admin only)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      form,
      panelMembers,
      evaluationCriteria,
      feedbackForm,
      round,
      type
    } = req.body;

    const interview = new Interview({
      title,
      description,
      form,
      panelMembers,
      evaluationCriteria,
      feedbackForm,
      round,
      type,
      createdBy: req.user._id
    });

    await interview.save();

    res.status(201).json({
      message: 'Interview created successfully',
      interview
    });
  } catch (error) {
    console.error('Interview creation error:', error);
    res.status(500).json({ message: 'Server error creating interview' });
  }
});

// Get all interviews (Super Admin and Panel Members)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};

    // Panel members can only see interviews they're assigned to
    if (req.user.role === 'panel_member') {
      query['panelMembers.panelMember'] = req.user._id;
    }

    const interviews = await Interview.find(query)
      .populate('form', 'title position department')
      .populate('createdBy', 'name email')
      .populate('panelMembers.panelMember', 'name email')
      .sort({ createdAt: -1 });

    res.json({ interviews });
  } catch (error) {
    console.error('Interviews fetch error:', error);
    res.status(500).json({ message: 'Server error fetching interviews' });
  }
});

// Get interview by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
  const interview = await Interview.findById(req.params.id)
      .populate('form', 'title position department')
      .populate('createdBy', 'name email')
      .populate('panelMembers.panelMember', 'name email')
      .populate({
        path: 'candidates.candidate',
        populate: { path: 'user', select: 'name email' }
      });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Check if user has access to this interview
    if (req.user.role !== 'super_admin') {
      const isPanelMember = interview.panelMembers.some(
        pm => pm.panelMember._id.toString() === req.user._id.toString()
      );

      if (!isPanelMember) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ interview });
  } catch (error) {
    console.error('Interview fetch error:', error);
    res.status(500).json({ message: 'Server error fetching interview' });
  }
});

// Update interview (Super Admin only)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      panelMembers,
      evaluationCriteria,
      feedbackForm,
      isActive
    } = req.body;

    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        panelMembers,
        evaluationCriteria,
        feedbackForm,
        isActive
      },
      { new: true, runValidators: true }
    ).populate('form', 'title position department')
     .populate('createdBy', 'name email')
     .populate('panelMembers.panelMember', 'name email');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json({
      message: 'Interview updated successfully',
      interview
    });
  } catch (error) {
    console.error('Interview update error:', error);
    res.status(500).json({ message: 'Server error updating interview' });
  }
});

// Delete interview (Super Admin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Check if interview has feedback submitted
    const hasFeedback = await Candidate.countDocuments({
      'interviewFeedback.interview': req.params.id
    });

    if (hasFeedback > 0) {
      return res.status(400).json({
        message: 'Cannot delete interview with submitted feedback',
        feedbackCount: hasFeedback
      });
    }

    await Interview.findByIdAndDelete(req.params.id);

    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Interview deletion error:', error);
    res.status(500).json({ message: 'Server error deleting interview' });
  }
});

// Assign candidates to interview (Super Admin only)
router.post('/:id/assign-candidates', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Add candidates to interview
    for (const candidateId of candidateIds) {
      const existingIndex = interview.candidates.findIndex(
        c => c.candidate.toString() === candidateId
      );

      if (existingIndex < 0) {
        interview.candidates.push({
          candidate: candidateId
        });
      }
    }

    await interview.save();

    res.json({
      message: 'Candidates assigned to interview successfully',
      assignedCount: candidateIds.length
    });
  } catch (error) {
    console.error('Candidate assignment error:', error);
    res.status(500).json({ message: 'Server error assigning candidates' });
  }
});

// Schedule interview slots (Super Admin only)
router.post('/:id/schedule', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { schedules } = req.body; // Array of { candidateId, scheduledDate, scheduledTime, duration, meetingLink }
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Update candidate schedules
    for (const schedule of schedules) {
      const candidateIndex = interview.candidates.findIndex(
        c => c.candidate.toString() === schedule.candidateId
      );

      if (candidateIndex >= 0) {
        interview.candidates[candidateIndex].scheduledDate = schedule.scheduledDate;
        interview.candidates[candidateIndex].scheduledTime = schedule.scheduledTime;
        interview.candidates[candidateIndex].duration = schedule.duration;
        interview.candidates[candidateIndex].meetingLink = schedule.meetingLink;
        interview.candidates[candidateIndex].status = 'scheduled';
      }
    }

    await interview.save();

    res.json({
      message: 'Interview schedules updated successfully'
    });
  } catch (error) {
    console.error('Interview scheduling error:', error);
    res.status(500).json({ message: 'Server error scheduling interviews' });
  }
});

// Submit interview feedback (Panel Members only)
router.post('/:id/feedback', authenticateToken, requirePanelMember, async (req, res) => {
  try {
    const { candidateId, ratings, comments, recommendation } = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Check if panel member is assigned to this interview
    const isAssigned = interview.panelMembers.some(
      pm => pm.panelMember.toString() === req.user._id.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this interview' });
    }

    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check if feedback already exists
    const existingFeedbackIndex = candidate.interviewFeedback.findIndex(
      f => f.interview.toString() === req.params.id && f.panelMember.toString() === req.user._id.toString()
    );

    const feedbackData = {
      interview: req.params.id,
      panelMember: req.user._id,
      ratings,
      comments,
      recommendation,
      submittedAt: new Date()
    };

    if (existingFeedbackIndex >= 0) {
      candidate.interviewFeedback[existingFeedbackIndex] = feedbackData;
    } else {
      candidate.interviewFeedback.push(feedbackData);
    }

    await candidate.save();

    // Update interview candidate status if all panel members have submitted feedback
    const interviewCandidateIndex = interview.candidates.findIndex(
      c => c.candidate.toString() === candidateId
    );

    if (interviewCandidateIndex >= 0) {
      // Check if all panel members have submitted feedback for this candidate
      const allFeedbackSubmitted = interview.panelMembers.every(panelMember => {
        return candidate.interviewFeedback.some(
          f => f.interview.toString() === req.params.id &&
               f.panelMember.toString() === panelMember.panelMember.toString()
        );
      });

      if (allFeedbackSubmitted) {
        interview.candidates[interviewCandidateIndex].status = 'completed';
        await interview.save();
      }
    }

    res.json({
      message: 'Interview feedback submitted successfully'
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ message: 'Server error submitting feedback' });
  }
});

// Get interview feedback summary (Super Admin and assigned Panel Members)
router.get('/:id/feedback-summary', authenticateToken, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('panelMembers.panelMember', 'name email')
      .populate('candidates.candidate', 'name email');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Check access
    if (req.user.role !== 'super_admin') {
      const isAssigned = interview.panelMembers.some(
        pm => pm.panelMember._id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const feedbackSummary = await interview.getFeedbackSummary();

    res.json({
      interview: {
        _id: interview._id,
        title: interview.title,
        panelMembers: interview.panelMembers
      },
      feedbackSummary
    });
  } catch (error) {
    console.error('Feedback summary error:', error);
    res.status(500).json({ message: 'Server error fetching feedback summary' });
  }
});

// Get candidate's interview feedback (for candidates)
router.get('/candidate/feedback', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ message: 'Access denied. Candidates only.' });
    }

    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate('interviewFeedback.interview', 'title round type')
      .populate('interviewFeedback.panelMember', 'name');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json({
      feedback: candidate.interviewFeedback
    });
  } catch (error) {
    console.error('Candidate feedback fetch error:', error);
    res.status(500).json({ message: 'Server error fetching feedback' });
  }
});

// Update interview candidate status (Super Admin only)
router.put('/:id/candidate/:candidateId/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const candidateIndex = interview.candidates.findIndex(
      c => c.candidate.toString() === req.params.candidateId
    );

    if (candidateIndex < 0) {
      return res.status(404).json({ message: 'Candidate not found in this interview' });
    }

    interview.candidates[candidateIndex].status = status;
    if (notes) {
      interview.candidates[candidateIndex].notes = notes;
    }

    await interview.save();

    res.json({
      message: 'Interview candidate status updated successfully'
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// Assign panel members to interview with email notification (Super Admin only)
router.post('/:id/assign-panel-members', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { panelMemberIds } = req.body;
    const interview = await Interview.findById(req.params.id)
      .populate('form', 'title position department')
      .populate('createdBy', 'name');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Clear existing panel members
    interview.panelMembers = [];

    // Add new panel members with tokens
    for (const panelMemberId of panelMemberIds) {
      const panelMember = await User.findById(panelMemberId);
      if (!panelMember || panelMember.role !== 'panel_member') {
        continue; // Skip invalid panel members
      }

      // Generate unique feedback token
      const feedbackToken = crypto.randomBytes(32).toString('hex');

      interview.panelMembers.push({
        panelMember: panelMemberId,
        feedbackToken,
        notificationSent: false
      });
    }

    await interview.save();

    // Send email notifications to panel members
    const emailPromises = interview.panelMembers.map(async (pm) => {
      const panelMember = await User.findById(pm.panelMember);
      if (!panelMember || !panelMember.email) return;

      const feedbackUrl = `${process.env.FRONTEND_URL}/feedback/${pm.feedbackToken}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Interview Assignment Notification</h2>
          <p>Dear ${panelMember.name},</p>
          <p>You have been assigned as a panel member for the following interview:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e293b;">${interview.title}</h3>
            <p style="margin: 5px 0;"><strong>Position:</strong> ${interview.form.title}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${interview.form.department}</p>
            <p style="margin: 5px 0;"><strong>Round:</strong> ${interview.round}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${interview.type}</p>
            ${interview.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${interview.description}</p>` : ''}
          </div>
          <p>Please review the candidates and provide your feedback by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${feedbackUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Provide Feedback</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${feedbackUrl}" style="color: #3b82f6;">${feedbackUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from the Faculty Recruitment System.
          </p>
        </div>
      `;

      const emailText = `
        Interview Assignment Notification

        Dear ${panelMember.name},

        You have been assigned as a panel member for the following interview:

        ${interview.title}
        Position: ${interview.form.title}
        Department: ${interview.form.department}
        Round: ${interview.round}
        Type: ${interview.type}
        ${interview.description ? `Description: ${interview.description}` : ''}

        Please provide your feedback using this link: ${feedbackUrl}

        This is an automated message from the Faculty Recruitment System.
      `;

      try {
        await sendEmail(panelMember.email, `Interview Assignment: ${interview.title}`, emailHtml, emailText);

        // Mark notification as sent
        pm.notificationSent = true;
        await interview.save();

        return { email: panelMember.email, success: true };
      } catch (emailError) {
        console.error(`Failed to send email to ${panelMember.email}:`, emailError);
        return { email: panelMember.email, success: false, error: emailError.message };
      }
    });

    const emailResults = await Promise.allSettled(emailPromises);

    const successfulEmails = emailResults.filter(result =>
      result.status === 'fulfilled' && result.value?.success
    ).length;

    const failedEmails = emailResults.filter(result =>
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value?.success)
    ).length;

    res.json({
      message: 'Panel members assigned successfully',
      assignedCount: interview.panelMembers.length,
      emailNotifications: {
        successful: successfulEmails,
        failed: failedEmails
      }
    });
  } catch (error) {
    console.error('Panel member assignment error:', error);
    res.status(500).json({ message: 'Server error assigning panel members' });
  }
});


// Feedback management route for super admins
router.get('/feedback/management', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    // Get all feedback from candidates
    const candidates = await Candidate.find({
      'interviewFeedback.0': { $exists: true }
    })
    .populate('interviewFeedback.interview', 'title scheduledDate')
    .populate('interviewFeedback.panelMember', 'name email')
    .populate('user', 'name email phone')
    .populate('form', 'title position department');

    // Transform the data for the frontend
    const feedbackData = [];
    for (const candidate of candidates) {
      for (const feedback of candidate.interviewFeedback) {
        feedbackData.push({
          _id: `${candidate._id}_${feedback.interview._id}_${feedback.panelMember._id}`,
          candidate: {
            _id: candidate._id,
            name: candidate.user.name,
            email: candidate.user.email,
            phone: candidate.user.phone
          },
          interview: {
            _id: feedback.interview._id,
            title: feedback.interview.title,
            scheduledDate: feedback.interview.scheduledDate,
            form: candidate.form
          },
          panelMember: {
            _id: feedback.panelMember._id,
            name: feedback.panelMember.name,
            email: feedback.panelMember.email
          },
          ratings: feedback.ratings,
          comments: feedback.comments,
          recommendation: feedback.recommendation,
          status: feedback.reviewed ? 'reviewed' : (feedback.submittedAt ? 'submitted' : 'pending'),
          submittedAt: feedback.submittedAt,
          reviewedAt: feedback.reviewedAt
        });
      }
    }

    res.json({ feedback: feedbackData });
  } catch (error) {
    console.error('Feedback management fetch error:', error);
    res.status(500).json({ message: 'Server error fetching feedback data' });
  }
});

module.exports = router;
