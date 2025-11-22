const express = require('express');
const mongoose = require('mongoose');
const TypingTest = require('../models/TypingTest');
const Candidate = require('../models/Candidate');
const RecruitmentForm = require('../models/RecruitmentForm');
const { authenticateToken, requireSuperAdminOrPermission, getCampusFilter } = require('../middleware/auth');
const { sendEmail } = require('../config/email');

const router = express.Router();

/**
 * Create a new typing test (Super Admin only)
 * POST /api/typing-test
 */
router.post('/', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { title, description, typingParagraph, durationOptions, defaultDuration, form, instructions, startDate, endDate } = req.body;

    // Validate required fields
    if (!typingParagraph || typingParagraph.trim().length === 0) {
      return res.status(400).json({ message: 'Typing paragraph is required' });
    }

    // Prepare dates
    let startDateObj = startDate ? new Date(startDate) : new Date();
    let endDateObj = endDate ? new Date(endDate) : null;

    // Validate dates
    if (endDateObj && endDateObj <= startDateObj) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Create typing test
    const typingTest = new TypingTest({
      title: title || 'Typing Speed Test',
      description: description || '',
      typingParagraph: typingParagraph.trim(),
      durationOptions: durationOptions || [1, 2],
      defaultDuration: defaultDuration || 1,
      formCategory: 'non_teaching',
      form: form || null,
      instructions: instructions || 'Type the given paragraph as accurately and quickly as possible. Your typing speed (WPM) and accuracy will be measured.',
      startDate: startDateObj,
      endDate: endDateObj,
      createdBy: req.user._id
    });

    await typingTest.save();

    res.status(201).json({
      message: 'Typing test created successfully',
      typingTest
    });
  } catch (error) {
    console.error('Typing test creation error:', error);
    res.status(500).json({ message: 'Server error creating typing test', error: error.message });
  }
});

/**
 * Get all typing tests (Admin only)
 * GET /api/typing-test
 */
router.get('/', authenticateToken, requireSuperAdminOrPermission('tests.view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const campusFilter = getCampusFilter(req.user);

    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Active filter
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const numericLimit = Math.min(Number(limit) || 20, 200);
    const numericPage = Math.max(Number(page) || 1, 1);

    const typingTests = await TypingTest.find(filter)
      .populate('form', 'title position department')
      .populate('createdBy', 'name email')
      .populate('candidates.candidate', 'candidateNumber')
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    const total = await TypingTest.countDocuments(filter);

    res.json({
      typingTests,
      total,
      page: numericPage,
      limit: numericLimit
    });
  } catch (error) {
    console.error('Typing tests fetch error:', error);
    res.status(500).json({ message: 'Server error fetching typing tests' });
  }
});

/**
 * Get all typing test results (Admin view)
 * GET /api/typing-test/results
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/results', authenticateToken, requireSuperAdminOrPermission('candidates.view'), async (req, res) => {
  try {
    const { page = 1, limit = 50, candidateId, typingTestId } = req.query;

    // Build filter for candidates with typing test results
    const candidateFilter = {};
    if (candidateId) {
      candidateFilter._id = candidateId;
    }

    // Get candidates with typing test results
    const candidates = await Candidate.find(candidateFilter)
      .populate('user', 'name email')
      .populate('form', 'title position department formCategory')
      .populate({
        path: 'typingTestResults.typingTest',
        select: 'title typingParagraph instructions'
      })
      .lean();

    // Filter candidates with typing test results
    let results = [];
    for (const candidate of candidates) {
      if (candidate.typingTestResults && candidate.typingTestResults.length > 0) {
        for (const result of candidate.typingTestResults) {
          // Filter by typing test ID if provided
          if (typingTestId && result.typingTest?._id?.toString() !== typingTestId) {
            continue;
          }

          results.push({
            candidate: {
              _id: candidate._id,
              candidateNumber: candidate.candidateNumber,
              user: candidate.user,
              form: candidate.form
            },
            typingTest: result.typingTest,
            wpm: result.wpm,
            accuracy: result.accuracy,
            totalErrors: result.totalErrors,
            timeTaken: result.timeTaken,
            duration: result.duration,
            totalCharacters: result.totalCharacters,
            correctCharacters: result.correctCharacters,
            status: result.status,
            startedAt: result.startedAt,
            submittedAt: result.submittedAt
          });
        }
      }
    }

    // Pagination
    const numericLimit = Math.min(Number(limit) || 50, 200);
    const numericPage = Math.max(Number(page) || 1, 1);
    const startIndex = (numericPage - 1) * numericLimit;
    const endIndex = startIndex + numericLimit;

    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      results: paginatedResults,
      total: results.length,
      page: numericPage,
      limit: numericLimit
    });
  } catch (error) {
    console.error('Typing test results fetch error:', error);
    res.status(500).json({ message: 'Server error fetching typing test results' });
  }
});

/**
 * Get typing test results for a candidate
 * GET /api/typing-test/results/:candidateId
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/results/:candidateId', authenticateToken, requireSuperAdminOrPermission('candidates.view'), async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId)
      .populate('typingTestResults.typingTest', 'title typingParagraph instructions')
      .populate('user', 'name email')
      .populate('form', 'title position department formCategory')
      .lean();

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    res.json({
      candidate: {
        _id: candidate._id,
        candidateNumber: candidate.candidateNumber,
        user: candidate.user,
        form: candidate.form
      },
      typingTestResults: candidate.typingTestResults || []
    });
  } catch (error) {
    console.error('Typing test results fetch error:', error);
    res.status(500).json({ message: 'Server error fetching typing test results' });
  }
});

/**
 * Get candidate's own typing test results
 * GET /api/typing-test/my-results
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/my-results', authenticateToken, async (req, res) => {
  try {
    // Find candidate by user ID
    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate('typingTestResults.typingTest', 'title typingParagraph instructions')
      .lean();

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json({
      typingTestResults: candidate.typingTestResults || []
    });
  } catch (error) {
    console.error('My typing test results fetch error:', error);
    res.status(500).json({ message: 'Server error fetching typing test results' });
  }
});

/**
 * Assign typing test to candidates
 * POST /api/typing-test/:id/assign
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.post('/:id/assign', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { candidateIds } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'Candidate IDs array is required' });
    }

    const typingTest = await TypingTest.findById(req.params.id);
    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    // Verify all candidates exist and are non-teaching
    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
      form: { $exists: true }
    }).populate('form', 'formCategory');

    // Filter only non-teaching candidates
    const nonTeachingCandidates = candidates.filter(c => c.form?.formCategory === 'non_teaching');

    if (nonTeachingCandidates.length === 0) {
      return res.status(400).json({ message: 'No valid non-teaching candidates found' });
    }

    // Add candidates to typing test
    const existingCandidateIds = new Set(typingTest.candidates.map(c => c.candidate.toString()));
    
    for (const candidate of nonTeachingCandidates) {
      if (!existingCandidateIds.has(candidate._id.toString())) {
        typingTest.candidates.push({
          candidate: candidate._id,
          status: 'invited',
          invitedAt: new Date()
        });
      }
    }

    await typingTest.save();

    // Send notifications (optional - can be enhanced with email/SMS)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const baseTestLink = `${frontendUrl}/typing-test/${typingTest.testLink}`;

    res.json({
      message: `Typing test assigned to ${nonTeachingCandidates.length} candidate(s)`,
      assignedCount: nonTeachingCandidates.length,
      testLink: baseTestLink
    });
  } catch (error) {
    console.error('Typing test assignment error:', error);
    res.status(500).json({ message: 'Server error assigning typing test', error: error.message });
  }
});

/**
 * Start typing test (mark as started)
 * POST /api/typing-test/:id/start
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { candidateId, duration } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }

    if (!duration || (duration !== 1 && duration !== 2)) {
      return res.status(400).json({ message: 'Valid duration (1 or 2 minutes) is required' });
    }

    const typingTest = await TypingTest.findById(req.params.id);
    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    // Verify candidate is assigned
    const candidateAssignment = typingTest.candidates.find(
      c => c.candidate.toString() === candidateId
    );

    if (!candidateAssignment) {
      return res.status(403).json({ message: 'You are not assigned to this typing test' });
    }

    // Update status to started
    candidateAssignment.status = 'started';
    candidateAssignment.startedAt = new Date();

    await typingTest.save();

    res.json({
      message: 'Typing test started',
      startedAt: candidateAssignment.startedAt
    });
  } catch (error) {
    console.error('Typing test start error:', error);
    res.status(500).json({ message: 'Server error starting typing test' });
  }
});

/**
 * Submit typing test results
 * POST /api/typing-test/:id/submit
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.post('/:id/submit', async (req, res) => {
  try {
    console.log('📝 [TYPING TEST SUBMIT] Received submission request:', {
      testId: req.params.id,
      body: req.body
    });

    const { candidateId, wpm, accuracy, totalErrors, timeTaken, duration, totalCharacters, correctCharacters, backspaceCount } = req.body;

    // Validate required fields
    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }

    if (wpm === undefined || accuracy === undefined || totalErrors === undefined || 
        timeTaken === undefined || duration === undefined || totalCharacters === undefined || 
        correctCharacters === undefined) {
      return res.status(400).json({ 
        message: 'All result fields are required: wpm, accuracy, totalErrors, timeTaken, duration, totalCharacters, correctCharacters' 
      });
    }

    // Validate duration
    if (duration !== 1 && duration !== 2) {
      return res.status(400).json({ message: 'Duration must be 1 or 2 minutes' });
    }

    const typingTest = await TypingTest.findById(req.params.id);
    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    // Verify candidate is assigned
    const candidateAssignment = typingTest.candidates.find(
      c => c.candidate.toString() === candidateId
    );

    if (!candidateAssignment) {
      return res.status(403).json({ message: 'You are not assigned to this typing test' });
    }

    // Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Verify candidate is non-teaching
    const form = await RecruitmentForm.findById(candidate.form);
    if (form?.formCategory !== 'non_teaching') {
      return res.status(403).json({ message: 'This typing test is only for non-teaching candidates' });
    }

    // Check if result already exists
    const existingResult = candidate.typingTestResults.find(
      r => r.typingTest.toString() === req.params.id
    );

    if (existingResult) {
      // Update existing result
      existingResult.wpm = wpm;
      existingResult.accuracy = accuracy;
      existingResult.totalErrors = totalErrors;
      existingResult.timeTaken = timeTaken;
      existingResult.duration = duration;
      existingResult.totalCharacters = totalCharacters;
      existingResult.correctCharacters = correctCharacters;
      existingResult.backspaceCount = backspaceCount || 0;
      existingResult.status = 'completed';
      existingResult.submittedAt = new Date();
    } else {
      // Create new result
      candidate.typingTestResults.push({
        typingTest: req.params.id,
        wpm,
        accuracy,
        totalErrors,
        timeTaken,
        duration,
        totalCharacters,
        correctCharacters,
        backspaceCount: backspaceCount || 0,
        status: 'completed',
        startedAt: candidateAssignment.startedAt || new Date(),
        submittedAt: new Date()
      });
    }

    await candidate.save();
    console.log('✅ [TYPING TEST SUBMIT] Candidate saved with result');

    // Update typing test candidate status
    candidateAssignment.status = 'completed';
    candidateAssignment.completedAt = new Date();
    await typingTest.save();
    console.log('✅ [TYPING TEST SUBMIT] Typing test status updated');

    console.log('✅ [TYPING TEST SUBMIT] Submission successful:', {
      candidateId,
      wpm,
      accuracy,
      totalErrors
    });

    res.json({
      message: 'Typing test results submitted successfully',
      result: {
        wpm,
        accuracy,
        totalErrors,
        timeTaken,
        duration,
        totalCharacters,
        correctCharacters,
        backspaceCount: backspaceCount || 0
      }
    });
  } catch (error) {
    console.error('❌ [TYPING TEST SUBMIT] Submission error:', error);
    console.error('❌ [TYPING TEST SUBMIT] Error details:', {
      message: error.message,
      stack: error.stack,
      testId: req.params.id,
      body: req.body
    });
    res.status(500).json({ message: 'Server error submitting typing test', error: error.message });
  }
});

/**
 * Get a single typing test by ID
 * GET /api/typing-test/:id
 */
router.get('/:id', authenticateToken, requireSuperAdminOrPermission('tests.view'), async (req, res) => {
  try {
    const typingTest = await TypingTest.findById(req.params.id)
      .populate('form', 'title position department')
      .populate('createdBy', 'name email')
      .populate('candidates.candidate', 'candidateNumber user')
      .lean();

    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    res.json({ typingTest });
  } catch (error) {
    console.error('Typing test fetch error:', error);
    res.status(500).json({ message: 'Server error fetching typing test' });
  }
});

/**
 * Update a typing test
 * PUT /api/typing-test/:id
 */
router.put('/:id', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { title, description, typingParagraph, durationOptions, defaultDuration, instructions, isActive } = req.body;

    const typingTest = await TypingTest.findById(req.params.id);

    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    if (title !== undefined) typingTest.title = title;
    if (description !== undefined) typingTest.description = description;
    if (typingParagraph !== undefined) typingTest.typingParagraph = typingParagraph.trim();
    if (durationOptions !== undefined) typingTest.durationOptions = durationOptions;
    if (defaultDuration !== undefined) typingTest.defaultDuration = defaultDuration;
    if (instructions !== undefined) typingTest.instructions = instructions;
    if (isActive !== undefined) typingTest.isActive = isActive;

    await typingTest.save();

    res.json({
      message: 'Typing test updated successfully',
      typingTest
    });
  } catch (error) {
    console.error('Typing test update error:', error);
    res.status(500).json({ message: 'Server error updating typing test', error: error.message });
  }
});

/**
 * Delete a typing test
 * DELETE /api/typing-test/:id
 */
router.delete('/:id', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const typingTest = await TypingTest.findById(req.params.id);

    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found' });
    }

    await typingTest.deleteOne();

    res.json({ message: 'Typing test deleted successfully' });
  } catch (error) {
    console.error('Typing test deletion error:', error);
    res.status(500).json({ message: 'Server error deleting typing test' });
  }
});

/**
 * Get typing test by link (for candidates)
 * GET /api/typing-test/take/:testLink
 */
router.get('/take/:testLink', async (req, res) => {
  try {
    const { candidate } = req.query;

    const typingTest = await TypingTest.findOne({ testLink: req.params.testLink, isActive: true })
      .populate('form', 'title position department')
      .lean();

    if (!typingTest) {
      return res.status(404).json({ message: 'Typing test not found or inactive' });
    }

    // If candidate ID is provided, verify they are assigned
    if (candidate) {
      const candidateAssigned = typingTest.candidates.some(
        c => c.candidate.toString() === candidate
      );

      if (!candidateAssigned) {
        return res.status(403).json({ message: 'You are not assigned to this typing test' });
      }

      // Check if candidate is non-teaching
      const candidateDoc = await Candidate.findById(candidate).populate('form', 'formCategory');
      if (candidateDoc?.form?.formCategory !== 'non_teaching') {
        return res.status(403).json({ message: 'This typing test is only for non-teaching candidates' });
      }
    }

    // Return test without sensitive data
    const testData = {
      _id: typingTest._id,
      title: typingTest.title,
      description: typingTest.description,
      typingParagraph: typingTest.typingParagraph,
      durationOptions: typingTest.durationOptions,
      defaultDuration: typingTest.defaultDuration,
      instructions: typingTest.instructions,
      testLink: typingTest.testLink
    };

    res.json({ typingTest: testData });
  } catch (error) {
    console.error('Typing test fetch by link error:', error);
    res.status(500).json({ message: 'Server error fetching typing test' });
  }
});

module.exports = router;

