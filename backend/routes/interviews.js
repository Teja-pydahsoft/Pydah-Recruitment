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

    // Ensure default feedback form if not provided
    let finalFeedbackForm = feedbackForm;
    if (!finalFeedbackForm || !finalFeedbackForm.questions || finalFeedbackForm.questions.length === 0) {
      finalFeedbackForm = {
        questions: [
          {
            question: 'How would you rate the candidate\'s technical skills?',
            type: 'rating',
            required: true
          },
          {
            question: 'How would you rate the candidate\'s communication skills?',
            type: 'rating',
            required: true
          },
          {
            question: 'How would you rate the candidate\'s problem-solving abilities?',
            type: 'rating',
            required: true
          },
          {
            question: 'Overall rating for this candidate?',
            type: 'rating',
            required: true
          },
          {
            question: 'Additional comments or observations?',
            type: 'text',
            required: false
          },
          {
            question: 'Would you recommend this candidate?',
            type: 'yes_no',
            required: true,
            options: ['Yes', 'No']
          }
        ]
      };
    }

    const interview = new Interview({
      title,
      description,
      form,
      panelMembers,
      evaluationCriteria,
      feedbackForm: finalFeedbackForm,
      round,
      type,
      createdBy: req.user._id
    });

    await interview.save();

    // Populate the interview before returning
    await interview.populate('form', 'title position department formCategory');
    await interview.populate('createdBy', 'name email');

    console.log('✅ [INTERVIEW CREATION] Interview created successfully:', interview._id);
    console.log('✅ [INTERVIEW CREATION] Interview title:', interview.title);

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
    console.log('📋 [INTERVIEWS FETCH] Request from:', req.user.email, 'Role:', req.user.role);
    
    let query = {};

    // Panel members can only see interviews they're assigned to
    if (req.user.role === 'panel_member') {
      query['panelMembers.panelMember'] = req.user._id;
    }

    console.log('📋 [INTERVIEWS FETCH] Query:', JSON.stringify(query));

    const interviews = await Interview.find(query)
      .populate('form', 'title position department formCategory')
      .populate('createdBy', 'name email')
      .populate('panelMembers.panelMember', 'name email')
      .populate({
        path: 'candidates.candidate',
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'form', select: 'title position department formCategory' }
        ]
      })
      .sort({ createdAt: -1 });

    console.log('✅ [INTERVIEWS FETCH] Found', interviews.length, 'interviews');
    console.log('✅ [INTERVIEWS FETCH] Interview IDs:', interviews.map(i => i._id));

    res.json({ interviews });
  } catch (error) {
    console.error('❌ [INTERVIEWS FETCH] Error:', error);
    res.status(500).json({ message: 'Server error fetching interviews', error: error.message });
  }
});

// Get panel member dashboard statistics
router.get('/panel-member/stats', authenticateToken, requirePanelMember, async (req, res) => {
  try {
    console.log('📊 [PANEL MEMBER STATS] Fetching stats for panel member:', req.user.email);
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get total interviews assigned to this panel member
    const totalInterviews = await Interview.countDocuments({
      'panelMembers.panelMember': req.user._id
    });

    // Get interviews this week
    const interviewsThisWeek = await Interview.countDocuments({
      'panelMembers.panelMember': req.user._id,
      createdAt: { $gte: startOfWeek }
    });

    // Get feedback given count
    const candidates = await Candidate.find({
      'interviewFeedback.panelMember': req.user._id
    });
    
    const feedbackGiven = candidates.reduce((count, candidate) => {
      return count + candidate.interviewFeedback.filter(
        f => f.panelMember.toString() === req.user._id.toString()
      ).length;
    }, 0);

    // Calculate completion rate
    const completedInterviews = await Interview.countDocuments({
      'panelMembers.panelMember': req.user._id,
      'candidates.status': 'completed'
    });

    const completionRate = totalInterviews > 0 
      ? Math.round((completedInterviews / totalInterviews) * 100) 
      : 0;

    const stats = {
      totalInterviews,
      interviewsThisWeek,
      feedbackGiven,
      completionRate
    };

    console.log('✅ [PANEL MEMBER STATS] Stats retrieved:', stats);

    res.json(stats);
  } catch (error) {
    console.error('❌ [PANEL MEMBER STATS] Error:', error);
    res.status(500).json({ message: 'Server error fetching panel member stats' });
  }
});

// Get upcoming interviews for panel member
router.get('/panel-member/upcoming', authenticateToken, requirePanelMember, async (req, res) => {
  try {
    console.log('📅 [PANEL MEMBER UPCOMING] Fetching upcoming interviews for panel member:', req.user.email);
    
    const now = new Date();
    
    // Get interviews where this panel member is assigned
    const interviews = await Interview.find({
      'panelMembers.panelMember': req.user._id
    })
      .populate('form', 'title position department formCategory')
      .populate({
        path: 'candidates.candidate',
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'form', select: 'title position department formCategory' },
          { 
            path: 'interviewFeedback.panelMember', 
            select: 'name email'
          },
          {
            path: 'interviewFeedback.interview',
            select: 'title'
          }
        ]
      })
      .populate('panelMembers.panelMember', 'name email')
      .sort({ createdAt: -1 });

    // Filter and format upcoming interviews
    const upcomingInterviews = [];
    
    for (const interview of interviews) {
      for (const candidateEntry of interview.candidates) {
        if (candidateEntry.scheduledDate) {
          const scheduledDate = new Date(candidateEntry.scheduledDate);
          if (candidateEntry.scheduledTime) {
            const [hours, minutes] = candidateEntry.scheduledTime.split(':');
            scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }
          
          // Include interviews that are scheduled or upcoming
          if (scheduledDate >= now || candidateEntry.status !== 'completed') {
            // Check if this panel member has submitted feedback for this interview
            const candidate = candidateEntry.candidate;
            let submittedFeedback = null;
            
            if (candidate && candidate.interviewFeedback) {
              submittedFeedback = candidate.interviewFeedback.find(
                feedback => 
                  feedback.interview && 
                  feedback.interview.toString() === interview._id.toString() &&
                  feedback.panelMember &&
                  feedback.panelMember.toString() === req.user._id.toString()
              );
            }
            
            upcomingInterviews.push({
              _id: interview._id,
              title: interview.title,
              candidate: candidateEntry.candidate,
              form: interview.form,
              feedbackForm: interview.feedbackForm,
              scheduledAt: scheduledDate,
              scheduledDate: candidateEntry.scheduledDate,
              scheduledTime: candidateEntry.scheduledTime,
              status: candidateEntry.status || 'scheduled',
              meetingLink: candidateEntry.meetingLink,
              duration: candidateEntry.duration,
              notes: candidateEntry.notes,
              submittedFeedback: submittedFeedback || null
            });
          }
        }
      }
    }

    // Sort by scheduled date
    upcomingInterviews.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    console.log('✅ [PANEL MEMBER UPCOMING] Found', upcomingInterviews.length, 'upcoming interviews');

    res.json({ interviews: upcomingInterviews });
  } catch (error) {
    console.error('❌ [PANEL MEMBER UPCOMING] Error:', error);
    res.status(500).json({ message: 'Server error fetching upcoming interviews' });
  }
});

// Get interview by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
  const interview = await Interview.findById(req.params.id)
      .populate('form', 'title position department formCategory')
      .populate('createdBy', 'name email')
      .populate('panelMembers.panelMember', 'name email')
      .populate({
        path: 'candidates.candidate',
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'form', select: 'title position department formCategory' }
        ]
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
      isActive,
      candidates
    } = req.body;

    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Update fields if provided
    if (title !== undefined) interview.title = title;
    if (description !== undefined) interview.description = description;
    if (panelMembers !== undefined) interview.panelMembers = panelMembers;
    if (evaluationCriteria !== undefined) interview.evaluationCriteria = evaluationCriteria;
    if (feedbackForm !== undefined) interview.feedbackForm = feedbackForm;
    if (isActive !== undefined) interview.isActive = isActive;
    if (candidates !== undefined) {
      // Update candidates array
      interview.candidates = candidates.map(c => ({
        candidate: c.candidate,
        status: c.status || 'scheduled',
        scheduledDate: c.scheduledDate ? new Date(c.scheduledDate) : undefined,
        scheduledTime: c.scheduledTime,
        duration: c.duration,
        meetingLink: c.meetingLink,
        notes: c.notes
      }));
    }

    await interview.save();

    await interview.populate('form', 'title position department formCategory');
    await interview.populate('createdBy', 'name email');
    await interview.populate('panelMembers.panelMember', 'name email');

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

// Update individual candidate schedule (Super Admin only)
router.put('/:id/candidate/:candidateId/schedule', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { scheduledDate, scheduledTime, duration, meetingLink, notes, status, sendNotification } = req.body;
    const interview = await Interview.findById(req.params.id)
      .populate('form', 'title position department')
      .populate({
        path: 'candidates.candidate',
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'form', select: 'title position department' }
        ]
      });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const candidateIndex = interview.candidates.findIndex(
      c => c.candidate.toString() === req.params.candidateId
    );

    if (candidateIndex < 0) {
      return res.status(404).json({ message: 'Candidate not found in this interview' });
    }

    // Store old schedule for comparison
    const oldSchedule = {
      scheduledDate: interview.candidates[candidateIndex].scheduledDate,
      scheduledTime: interview.candidates[candidateIndex].scheduledTime,
      meetingLink: interview.candidates[candidateIndex].meetingLink
    };

    // Check if schedule is being changed (for reschedule notification)
    const isReschedule = (scheduledDate !== undefined && oldSchedule.scheduledDate && 
                          new Date(scheduledDate).getTime() !== new Date(oldSchedule.scheduledDate).getTime()) ||
                         (scheduledTime !== undefined && oldSchedule.scheduledTime !== scheduledTime);

    // Update candidate schedule fields
    if (scheduledDate !== undefined) {
      interview.candidates[candidateIndex].scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }
    if (scheduledTime !== undefined) {
      interview.candidates[candidateIndex].scheduledTime = scheduledTime;
    }
    if (duration !== undefined) {
      interview.candidates[candidateIndex].duration = duration;
    }
    if (meetingLink !== undefined) {
      interview.candidates[candidateIndex].meetingLink = meetingLink;
    }
    if (notes !== undefined) {
      interview.candidates[candidateIndex].notes = notes;
    }
    if (status !== undefined) {
      interview.candidates[candidateIndex].status = status;
    }

    await interview.save();

    // Send reschedule notification if schedule changed and notification is requested
    if (isReschedule && sendNotification !== false) {
      const candidateEntry = interview.candidates[candidateIndex];
      const candidate = candidateEntry.candidate;
      const user = candidate.user;

      if (user && user.email) {
        const newDate = candidateEntry.scheduledDate 
          ? new Date(candidateEntry.scheduledDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'To be determined';
        const newTime = candidateEntry.scheduledTime || 'To be determined';
        const oldDate = oldSchedule.scheduledDate 
          ? new Date(oldSchedule.scheduledDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'Not scheduled';
        const oldTime = oldSchedule.scheduledTime || 'Not scheduled';

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
              Interview Schedule Updated
            </h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Dear ${user.name},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              This is to inform you that your interview schedule has been updated.
            </p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">Previous Schedule</h3>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${oldDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${oldTime}</p>
            </div>
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">New Schedule</h3>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${newDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${newTime}</p>
              ${candidateEntry.duration ? `<p style="margin: 5px 0;"><strong>Duration:</strong> ${candidateEntry.duration} minutes</p>` : ''}
              ${candidateEntry.meetingLink ? `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${candidateEntry.meetingLink}">${candidateEntry.meetingLink}</a></p>` : ''}
            </div>
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Interview Details</h3>
              <p style="margin: 5px 0;"><strong>Interview:</strong> ${interview.title}</p>
              <p style="margin: 5px 0;"><strong>Position:</strong> ${interview.form.title || interview.form.position || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Department:</strong> ${interview.form.department || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Round:</strong> ${interview.round}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${interview.type}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Please update your calendar accordingly. If you have any concerns or need to reschedule, please contact us as soon as possible.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated message from the Staff Recruitment System.
            </p>
          </div>
        `;

        const emailText = `
Interview Schedule Updated

Dear ${user.name},

This is to inform you that your interview schedule has been updated.

Previous Schedule:
- Date: ${oldDate}
- Time: ${oldTime}

New Schedule:
- Date: ${newDate}
- Time: ${newTime}
${candidateEntry.duration ? `- Duration: ${candidateEntry.duration} minutes` : ''}
${candidateEntry.meetingLink ? `- Meeting Link: ${candidateEntry.meetingLink}` : ''}

Interview Details:
- Interview: ${interview.title}
- Position: ${interview.form.title || interview.form.position || 'N/A'}
- Department: ${interview.form.department || 'N/A'}
- Round: ${interview.round}
- Type: ${interview.type}

Please update your calendar accordingly. If you have any concerns or need to reschedule, please contact us as soon as possible.

This is an automated message from the Staff Recruitment System.
        `;

        try {
          await sendEmail(user.email, `Interview Schedule Updated: ${interview.title}`, emailHtml, emailText);
          console.log('✅ [RESCHEDULE NOTIFICATION] Email sent to candidate:', user.email);
        } catch (emailError) {
          console.error('❌ [RESCHEDULE NOTIFICATION] Email send error:', emailError);
          // Don't fail the request if email fails
        }
      }
    }

    res.json({
      message: 'Candidate schedule updated successfully',
      interview,
      notificationSent: isReschedule && sendNotification !== false
    });
  } catch (error) {
    console.error('Candidate schedule update error:', error);
    res.status(500).json({ message: 'Server error updating candidate schedule' });
  }
});

// Get feedback form by token (for panel members)
router.get('/feedback/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find interview with this feedback token
    const interview = await Interview.findOne({
      'panelMembers.feedbackToken': token
    })
      .populate('form', 'title position department')
      .populate('candidates.candidate', 'user candidateNumber')
      .populate('candidates.candidate.user', 'name email');

    if (!interview) {
      return res.status(404).json({ message: 'Invalid feedback token' });
    }

    // Find the panel member with this token
    const panelMember = interview.panelMembers.find(pm => pm.feedbackToken === token);
    if (!panelMember) {
      return res.status(404).json({ message: 'Panel member not found' });
    }

    // Get candidates for this interview
    const candidates = interview.candidates.map(candidateEntry => ({
      _id: candidateEntry.candidate._id,
      name: candidateEntry.candidate.user?.name || 'Unknown',
      email: candidateEntry.candidate.user?.email || '',
      candidateNumber: candidateEntry.candidate.candidateNumber || '',
      scheduledDate: candidateEntry.scheduledDate,
      scheduledTime: candidateEntry.scheduledTime,
      status: candidateEntry.status
    }));

    res.json({
      interview: {
        _id: interview._id,
        title: interview.title,
        description: interview.description,
        form: interview.form,
        feedbackForm: interview.feedbackForm || { questions: [] }
      },
      panelMember: {
        _id: panelMember.panelMember,
        role: panelMember.role
      },
      candidates
    });
  } catch (error) {
    console.error('Feedback form fetch error:', error);
    res.status(500).json({ message: 'Server error fetching feedback form' });
  }
});

// Submit interview feedback (Panel Members only)
router.post('/:id/feedback', authenticateToken, requirePanelMember, async (req, res) => {
  try {
    const { candidateId, ratings, comments, recommendation, questionAnswers } = req.body;
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

    // Validate feedback form questions if provided
    if (questionAnswers && interview.feedbackForm && interview.feedbackForm.questions) {
      const requiredQuestions = interview.feedbackForm.questions.filter(q => q.required);
      for (const requiredQ of requiredQuestions) {
        const answer = questionAnswers.find(qa => 
          qa.question === requiredQ.question || qa.questionId === requiredQ._id?.toString()
        );
        if (!answer || answer.answer === null || answer.answer === undefined || answer.answer === '') {
          return res.status(400).json({ 
            message: `Required question "${requiredQ.question}" is missing or empty` 
          });
        }
      }
    }

    // Check if feedback already exists
    const existingFeedbackIndex = candidate.interviewFeedback.findIndex(
      f => f.interview.toString() === req.params.id && f.panelMember.toString() === req.user._id.toString()
    );

    const feedbackData = {
      interview: req.params.id,
      panelMember: req.user._id,
      ratings: ratings || {},
      comments: comments || '',
      recommendation: recommendation || 'neutral',
      questionAnswers: questionAnswers || [],
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

// Submit feedback by token (for panel members without authentication)
router.post('/feedback/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { candidateId, ratings, comments, recommendation, questionAnswers } = req.body;
    
    // Find interview with this feedback token
    const interview = await Interview.findOne({
      'panelMembers.feedbackToken': token
    });

    if (!interview) {
      return res.status(404).json({ message: 'Invalid feedback token' });
    }

    // Find the panel member with this token
    const panelMember = interview.panelMembers.find(pm => pm.feedbackToken === token);
    if (!panelMember) {
      return res.status(404).json({ message: 'Panel member not found' });
    }

    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Validate feedback form questions if provided
    if (questionAnswers && interview.feedbackForm && interview.feedbackForm.questions) {
      const requiredQuestions = interview.feedbackForm.questions.filter(q => q.required);
      for (const requiredQ of requiredQuestions) {
        const answer = questionAnswers.find(qa => 
          qa.question === requiredQ.question || qa.questionId === requiredQ._id?.toString()
        );
        if (!answer || answer.answer === null || answer.answer === undefined || answer.answer === '') {
          return res.status(400).json({ 
            message: `Required question "${requiredQ.question}" is missing or empty` 
          });
        }
      }
    }

    // Check if feedback already exists
    const existingFeedbackIndex = candidate.interviewFeedback.findIndex(
      f => f.interview.toString() === interview._id.toString() && 
           f.panelMember.toString() === panelMember.panelMember.toString()
    );

    const feedbackData = {
      interview: interview._id,
      panelMember: panelMember.panelMember,
      ratings: ratings || {},
      comments: comments || '',
      recommendation: recommendation || 'neutral',
      questionAnswers: questionAnswers || [],
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
      const allFeedbackSubmitted = interview.panelMembers.every(pm => {
        return candidate.interviewFeedback.some(
          f => f.interview.toString() === interview._id.toString() &&
               f.panelMember.toString() === pm.panelMember.toString()
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

// Remove candidate from interview (Super Admin only)
router.delete('/:id/candidate/:candidateId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
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

    // Remove candidate from array
    interview.candidates.splice(candidateIndex, 1);
    await interview.save();

    res.json({
      message: 'Candidate removed from interview successfully'
    });
  } catch (error) {
    console.error('Remove candidate error:', error);
    res.status(500).json({ message: 'Server error removing candidate from interview' });
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

    // Populate candidates with their details for email
    await interview.populate({
      path: 'candidates.candidate',
      populate: [
        { path: 'user', select: 'name email' },
        { path: 'form', select: 'title position department' }
      ]
    });

    // Send email notifications to panel members
    const emailPromises = interview.panelMembers.map(async (pm) => {
      const panelMember = await User.findById(pm.panelMember);
      if (!panelMember || !panelMember.email) return;

      const feedbackUrl = `${process.env.FRONTEND_URL}/feedback/${pm.feedbackToken}`;

      // Build candidate schedule list
      let candidateSchedulesHtml = '';
      let candidateSchedulesText = '';
      
      if (interview.candidates && interview.candidates.length > 0) {
        candidateSchedulesHtml = '<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;"><h3 style="color: #1e40af; margin-top: 0;">Candidate Interview Schedules</h3>';
        candidateSchedulesText = '\n\nCandidate Interview Schedules:\n';
        
        for (const candidateEntry of interview.candidates) {
          const candidate = candidateEntry.candidate;
          const candidateName = candidate?.user?.name || 'Unknown Candidate';
          const candidateNumber = candidate?.candidateNumber || '';
          const jobRole = candidate?.form?.position || interview.form?.position || 'N/A';
          
          if (candidateEntry.scheduledDate) {
            const scheduledDate = new Date(candidateEntry.scheduledDate);
            const dateStr = scheduledDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            const timeStr = candidateEntry.scheduledTime || 'Time TBD';
            const duration = candidateEntry.duration ? `${candidateEntry.duration} minutes` : '';
            const meetingLink = candidateEntry.meetingLink ? `<br><strong>Meeting Link:</strong> <a href="${candidateEntry.meetingLink}">${candidateEntry.meetingLink}</a>` : '';
            
            candidateSchedulesHtml += `
              <div style="background: white; padding: 12px; margin: 10px 0; border-radius: 6px; border: 1px solid #dbeafe;">
                <p style="margin: 5px 0;"><strong>Candidate:</strong> ${candidateName}${candidateNumber ? ` (${candidateNumber})` : ''}</p>
                <p style="margin: 5px 0;"><strong>Job Role:</strong> ${jobRole}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
                ${duration ? `<p style="margin: 5px 0;"><strong>Duration:</strong> ${duration}</p>` : ''}
                ${meetingLink}
              </div>
            `;
            
            candidateSchedulesText += `\n- ${candidateName}${candidateNumber ? ` (${candidateNumber})` : ''} - ${jobRole}\n  Date: ${dateStr}\n  Time: ${timeStr}${duration ? `\n  Duration: ${duration}` : ''}${candidateEntry.meetingLink ? `\n  Meeting Link: ${candidateEntry.meetingLink}` : ''}\n`;
          } else {
            candidateSchedulesHtml += `
              <div style="background: white; padding: 12px; margin: 10px 0; border-radius: 6px; border: 1px solid #dbeafe;">
                <p style="margin: 5px 0;"><strong>Candidate:</strong> ${candidateName}${candidateNumber ? ` (${candidateNumber})` : ''}</p>
                <p style="margin: 5px 0;"><strong>Job Role:</strong> ${jobRole}</p>
                <p style="margin: 5px 0; color: #f59e0b;"><strong>Schedule:</strong> To be determined</p>
              </div>
            `;
            
            candidateSchedulesText += `\n- ${candidateName}${candidateNumber ? ` (${candidateNumber})` : ''} - ${jobRole}\n  Schedule: To be determined\n`;
          }
        }
        
        candidateSchedulesHtml += '</div>';
      }

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
          ${candidateSchedulesHtml}
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
            This is an automated message from the Staff Recruitment System.
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
        ${candidateSchedulesText}

        Please provide your feedback using this link: ${feedbackUrl}

        This is an automated message from the Staff Recruitment System.
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
