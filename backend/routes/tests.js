const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const Test = require('../models/Test');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const QuestionBank = require('../models/QuestionBank');
const PreviousPaper = require('../models/PreviousPaper');
const Interview = require('../models/Interview');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { sendEmail } = require('../config/email');

const router = express.Router();
const upload = multer({ dest: path.join(os.tmpdir(), 'uploads') });

// Create new test (Super Admin only)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, form, questions, duration, passingPercentage, instructions } = req.body;

    const test = new Test({
      title,
      description,
      form,
      questions,
      duration,
      passingPercentage,
      instructions,
      createdBy: req.user._id
    });

    await test.save();

    res.status(201).json({
      message: 'Test created successfully',
      test
    });
  } catch (error) {
    console.error('Test creation error:', error);
    res.status(500).json({ message: 'Server error creating test' });
  }
});

// Question Bank CRUD (Super Admin only)
router.get('/questions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { topic, q, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (topic) filter.topic = topic;
    if (q) filter.questionText = { $regex: q, $options: 'i' };
    const questions = await QuestionBank.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await QuestionBank.countDocuments(filter);
    res.json({ questions, total });
  } catch (error) {
    console.error('Question bank fetch error:', error);
    res.status(500).json({ message: 'Server error fetching question bank' });
  }
});

router.post('/questions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { topic, subTopic, questionText, options, correctAnswer, explanation, difficulty, tags } = req.body;
    if (!questionText || !topic) {
      return res.status(400).json({ message: 'topic and questionText are required' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'At least two options are required' });
    }
    if (correctAnswer === undefined || correctAnswer === null) {
      return res.status(400).json({ message: 'correctAnswer is required' });
    }
    // Validate correctAnswer index or content exists in options
    const isIndex = typeof correctAnswer === 'number' || (Array.isArray(correctAnswer) && correctAnswer.every(a => typeof a === 'number'));
    const isValue = typeof correctAnswer === 'string' || (Array.isArray(correctAnswer) && correctAnswer.every(a => typeof a === 'string'));
    if (isIndex) {
      const indices = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
      if (indices.some(i => i < 0 || i >= options.length)) {
        return res.status(400).json({ message: 'correctAnswer index out of bounds' });
      }
    } else if (isValue) {
      const values = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
      if (values.some(v => !options.includes(v))) {
        return res.status(400).json({ message: 'correctAnswer not present in options' });
      }
    } else {
      return res.status(400).json({ message: 'correctAnswer must be index(es) or value(s)' });
    }

    const question = new QuestionBank({
      topic,
      subTopic,
      questionText,
      options,
      correctAnswer,
      explanation,
      difficulty,
      tags,
      createdBy: req.user._id
    });
    await question.save();
    res.status(201).json({ message: 'Question added to bank', question });
  } catch (error) {
    console.error('Question bank create error:', error);
    res.status(500).json({ message: 'Server error adding question' });
  }
});

router.put('/questions/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.options && (!Array.isArray(updates.options) || updates.options.length < 2)) {
      return res.status(400).json({ message: 'At least two options are required' });
    }
    if ('correctAnswer' in updates && (updates.correctAnswer === undefined || updates.correctAnswer === null)) {
      return res.status(400).json({ message: 'correctAnswer is required' });
    }
    const question = await QuestionBank.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question updated', question });
  } catch (error) {
    console.error('Question bank update error:', error);
    res.status(500).json({ message: 'Server error updating question' });
  }
});

router.delete('/questions/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const deleted = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Question bank delete error:', error);
    res.status(500).json({ message: 'Server error deleting question' });
  }
});

// Create test from question bank selections
router.post('/create-from-bank', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, form, questionIds, duration, passingPercentage, cutoffPercentage, instructions } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: 'questionIds are required' });
    }
    const questions = await QuestionBank.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ message: 'Some questions not found' });
    }
    // Map to Test question structure, validate answers exist
    const testQuestions = questions.map(q => ({
      questionText: q.questionText,
      questionType: 'mcq',
      options: q.options,
      correctAnswer: q.correctAnswer,
      marks: 1,
      difficulty: q.difficulty,
      tags: q.tags
    }));

    const test = new Test({
      title,
      description,
      form,
      questions: testQuestions,
      duration,
      passingPercentage,
      cutoffPercentage,
      instructions,
      questionSource: 'bank',
      sourceRefs: { bankQuestionIds: questionIds },
      createdBy: req.user._id
    });
    await test.save();
    res.status(201).json({ message: 'Test created from bank', test });
  } catch (error) {
    console.error('Create test from bank error:', error);
    res.status(500).json({ message: 'Server error creating test from bank' });
  }
});

// Upload previous paper (expects JSON payload of questions)
router.post('/previous-papers/upload', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, year, subject, topic, questions, originalFileUrl, fileName } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'title and questions are required' });
    }
    // Validate questions and answers
    for (const q of questions) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ message: 'Each question must have text and at least two options' });
      }
      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        return res.status(400).json({ message: 'Each question must have a correctAnswer' });
      }
      const isIndex = typeof q.correctAnswer === 'number' || (Array.isArray(q.correctAnswer) && q.correctAnswer.every(a => typeof a === 'number'));
      const isValue = typeof q.correctAnswer === 'string' || (Array.isArray(q.correctAnswer) && q.correctAnswer.every(a => typeof a === 'string'));
      if (isIndex) {
        const indices = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        if (indices.some(i => i < 0 || i >= q.options.length)) {
          return res.status(400).json({ message: 'correctAnswer index out of bounds' });
        }
      } else if (isValue) {
        const values = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        if (values.some(v => !q.options.includes(v))) {
          return res.status(400).json({ message: 'correctAnswer not present in options' });
        }
      } else {
        return res.status(400).json({ message: 'correctAnswer must be index(es) or value(s)' });
      }
    }

    const paper = new PreviousPaper({
      title,
      description,
      year,
      subject,
      topic,
      fileName,
      originalFileUrl,
      parsed: true,
      questions,
      createdBy: req.user._id
    });
    await paper.save();
    res.status(201).json({ message: 'Previous paper uploaded', paper });
  } catch (error) {
    console.error('Previous paper upload error:', error);
    res.status(500).json({ message: 'Server error uploading previous paper' });
  }
});

// Get assigned tests for candidate (Candidate only)
router.get('/assigned', authenticateToken, async (req, res) => {
  try {
    // Only candidates can access their assigned tests
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ 
        message: 'Access denied. Only candidates can view their assigned tests.' 
      });
    }

    // Find candidate by user ID
    const candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
      return res.status(404).json({ 
        message: 'Candidate profile not found. Please ensure you have submitted an application form.' 
      });
    }

    // Find all tests where this candidate is assigned
    const tests = await Test.find({
      'candidates.candidate': candidate._id,
      isActive: true
    })
      .populate('form', 'title position department')
      .select('title description duration instructions testLink scheduledDate scheduledTime candidates')
      .lean();

    // Map tests to include candidate-specific status
    const assignedTests = tests.map(test => {
      const candidateTest = test.candidates.find(
        c => c.candidate.toString() === candidate._id.toString()
      );
      
      return {
        _id: test._id,
        title: test.title,
        description: test.description,
        duration: test.duration,
        instructions: test.instructions,
        testLink: test.testLink,
        scheduledDate: test.scheduledDate,
        scheduledTime: test.scheduledTime,
        form: test.form,
        status: candidateTest?.status || 'pending',
        invitedAt: candidateTest?.invitedAt,
        completedAt: candidateTest?.completedAt,
        score: candidateTest?.score,
        percentage: candidateTest?.percentage
      };
    });

    res.json({
      message: 'Assigned tests fetched successfully',
      tests: assignedTests
    });
  } catch (error) {
    console.error('Fetch assigned tests error:', error);
    res.status(500).json({ message: 'Server error fetching assigned tests' });
  }
});

// Get all tests (Super Admin only)
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const tests = await Test.find({})
      .populate('form', 'title position department')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ tests });
  } catch (error) {
    console.error('Tests fetch error:', error);
    res.status(500).json({ message: 'Server error fetching tests' });
  }
});

// Get test by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('form', 'title position department')
      .populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Only super admin or test creator can view full details
    if (req.user.role !== 'super_admin' && test.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ test });
  } catch (error) {
    console.error('Test fetch error:', error);
    res.status(500).json({ message: 'Server error fetching test' });
  }
});

// Update test (Super Admin only)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, questions, duration, passingPercentage, instructions, isActive } = req.body;

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        questions,
        duration,
        passingPercentage,
        instructions,
        isActive
      },
      { new: true, runValidators: true }
    ).populate('form', 'title position department')
     .populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({
      message: 'Test updated successfully',
      test
    });
  } catch (error) {
    console.error('Test update error:', error);
    res.status(500).json({ message: 'Server error updating test' });
  }
});

// Delete test (Super Admin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check if test has been taken by candidates
    const candidatesTaken = await Candidate.countDocuments({
      'testResults.test': req.params.id,
      'testResults.status': { $in: ['completed', 'passed', 'failed'] }
    });

    if (candidatesTaken > 0) {
      return res.status(400).json({
        message: 'Cannot delete test that has been taken by candidates',
        candidatesTaken
      });
    }

    await Test.findByIdAndDelete(req.params.id);

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Test deletion error:', error);
    res.status(500).json({ message: 'Server error deleting test' });
  }
});

// Get test by unique link (for candidates only)
router.get('/take/:testLink', authenticateToken, async (req, res) => {
  try {
    console.log(`\n=== Test Access Request ===`);
    console.log(`Test Link: ${req.params.testLink}`);
    console.log(`User ID: ${req.user._id}`);
    console.log(`User Email: ${req.user.email}`);
    console.log(`User Role: ${req.user.role}`);

    // Only candidates can access tests
    if (req.user.role !== 'candidate') {
      console.log(`✗ Access denied: User role is ${req.user.role}, only candidates can access tests`);
      return res.status(403).json({ 
        message: 'Access denied. Only candidates can access tests. Please log in with a candidate account.' 
      });
    }

    const test = await Test.findOne({
      testLink: req.params.testLink,
      isActive: true
    }).populate('form', 'title position department');

    if (!test) {
      console.log('✗ Test not found or inactive');
      return res.status(404).json({ message: 'Test not found or inactive' });
    }

    console.log(`✓ Test found: ${test.title} (ID: ${test._id})`);
    console.log(`Test assigned candidates: ${test.candidates.length}`);

    // Find candidate by user ID
    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate('user', 'name email')
      .populate('form', 'title position department');

    if (!candidate) {
      console.log('✗ Candidate profile not found for user:', req.user._id);
      console.log('User details:', {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
      });
      
      // Check if any candidate exists with this email
      const candidatesByEmail = await Candidate.find()
        .populate('user', 'email')
        .lean();
      
      const candidateWithEmail = candidatesByEmail.find(c => 
        c.user && c.user.email === req.user.email
      );

      if (candidateWithEmail) {
        console.log('⚠ Found candidate with same email but different user ID');
        return res.status(403).json({ 
          message: 'Candidate profile not found. Please ensure you are logged in with the correct account that submitted the application form.' 
        });
      }

      return res.status(403).json({ 
        message: 'Candidate profile not found. You need to submit an application form first before taking tests. Please contact support if you have already submitted a form.' 
      });
    }

    console.log(`✓ Candidate profile found: ${candidate._id}`);
    console.log(`Candidate user: ${candidate.user.name} (${candidate.user.email})`);
    console.log(`Candidate status: ${candidate.status}`);

    // Check if candidate is assigned to this test
    const candidateTest = test.candidates.find(
      c => c.candidate.toString() === candidate._id.toString()
    );

    if (!candidateTest) {
      console.log('✗ Candidate not assigned to this test');
      console.log('Test candidates:', test.candidates.map(c => ({
        candidateId: c.candidate.toString(),
        status: c.status
      })));
      return res.status(403).json({ 
        message: 'You are not assigned to this test. Please contact the administrator.' 
      });
    }

    console.log(`✓ Candidate is assigned to test (status: ${candidateTest.status})`);

    if (candidateTest.status === 'completed') {
      console.log('⚠ Test already completed');
      return res.status(400).json({ message: 'You have already completed this test' });
    }

    if (candidateTest.status === 'expired') {
      console.log('⚠ Test expired');
      return res.status(400).json({ message: 'This test has expired' });
    }

    console.log('✓ Test access granted');
    console.log('===================================\n');

    // Return test without correct answers
    const testForCandidate = {
      _id: test._id,
      title: test.title,
      description: test.description,
      duration: test.duration,
      instructions: test.instructions,
      questions: test.questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        marks: q.marks,
        timeLimit: q.timeLimit
      })),
      scheduledDate: test.scheduledDate,
      scheduledTime: test.scheduledTime
    };

    res.json({ test: testForCandidate });
  } catch (error) {
    console.error('Test fetch error:', error);
    res.status(500).json({ message: 'Server error fetching test' });
  }
});

// Helper function to normalize answer to index format for consistent comparison
const normalizeAnswerToIndex = (answer, options) => {
  if (!options || !Array.isArray(options) || options.length === 0) {
    return null;
  }

  // If answer is already an index (number)
  if (typeof answer === 'number') {
    return answer >= 0 && answer < options.length ? answer : null;
  }

  // If answer is an array (multiple choice)
  if (Array.isArray(answer)) {
    return answer.map(a => normalizeAnswerToIndex(a, options)).filter(a => a !== null);
  }

  // If answer is a string, try to find it in options
  if (typeof answer === 'string') {
    const index = options.findIndex(opt => opt.trim().toLowerCase() === answer.trim().toLowerCase());
    return index >= 0 ? index : null;
  }

  return null;
};

// Helper function to validate MCQ answer
const validateMCQAnswer = (candidateAnswer, correctAnswer, options) => {
  if (!options || !Array.isArray(options) || options.length === 0) {
    return false;
  }

  // Normalize candidate answer to index format
  const normalizedCandidateAnswer = normalizeAnswerToIndex(candidateAnswer, options);

  // Normalize correct answer to index format
  let normalizedCorrectAnswer;
  
  if (typeof correctAnswer === 'number') {
    // correctAnswer is already an index
    normalizedCorrectAnswer = correctAnswer >= 0 && correctAnswer < options.length ? correctAnswer : null;
  } else if (Array.isArray(correctAnswer)) {
    // Multiple correct answers
    normalizedCorrectAnswer = correctAnswer.map(ca => {
      if (typeof ca === 'number') {
        return ca >= 0 && ca < options.length ? ca : null;
      } else if (typeof ca === 'string') {
        const index = options.findIndex(opt => opt.trim().toLowerCase() === ca.trim().toLowerCase());
        return index >= 0 ? index : null;
      }
      return null;
    }).filter(ca => ca !== null);
  } else if (typeof correctAnswer === 'string') {
    // correctAnswer is a value, find its index
    const index = options.findIndex(opt => opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase());
    normalizedCorrectAnswer = index >= 0 ? index : null;
  } else {
    return false;
  }

  if (normalizedCandidateAnswer === null || normalizedCorrectAnswer === null) {
    return false;
  }

  // Compare normalized answers
  if (Array.isArray(normalizedCandidateAnswer) && Array.isArray(normalizedCorrectAnswer)) {
    // Both are arrays - check if they contain the same elements (order doesn't matter)
    const sortedCandidate = [...normalizedCandidateAnswer].sort((a, b) => a - b);
    const sortedCorrect = [...normalizedCorrectAnswer].sort((a, b) => a - b);
    return sortedCandidate.length === sortedCorrect.length &&
           sortedCandidate.every((val, idx) => val === sortedCorrect[idx]);
  } else if (!Array.isArray(normalizedCandidateAnswer) && !Array.isArray(normalizedCorrectAnswer)) {
    // Both are single values
    return normalizedCandidateAnswer === normalizedCorrectAnswer;
  }

  return false;
};

// Submit test answers
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers, screenshots, startedAt } = req.body;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Find candidate by user ID
    const candidate = await Candidate.findOne({ user: req.user._id });
    if (!candidate) {
      return res.status(403).json({ message: 'Candidate profile not found' });
    }

    // Find candidate's test entry
    const candidateTestIndex = test.candidates.findIndex(
      c => c.candidate.toString() === candidate._id.toString()
    );

    if (candidateTestIndex === -1) {
      return res.status(403).json({ message: 'You are not assigned to this test' });
    }

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;

    const processedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) return answer;

      let isCorrect = false;
      let marks = 0;

      if (question.questionType === 'mcq' || question.questionType === 'multiple_answer') {
        // Use the robust validation function
        isCorrect = validateMCQAnswer(answer.answer, question.correctAnswer, question.options);
      } else if (question.questionType === 'short_answer' || question.questionType === 'long_answer') {
        // For subjective questions, mark as pending for manual evaluation
        isCorrect = null; // null means pending evaluation
      }

      if (isCorrect === true) {
        marks = question.marks;
        totalScore += marks;
        correctAnswers++;
      }

      return {
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect,
        marks,
        timeTaken: answer.timeTaken || 0, // Time taken in seconds
        answeredAt: answer.answeredAt ? new Date(answer.answeredAt) : new Date(),
        screenshot: answer.screenshot || null // Screenshot URL if available
      };
    });

    const percentage = (totalScore / test.totalMarks) * 100;
    const passed = percentage >= test.passingPercentage;

    // Update test candidates array
    test.candidates[candidateTestIndex].status = 'completed';
    test.candidates[candidateTestIndex].score = totalScore;
    test.candidates[candidateTestIndex].percentage = percentage;
    test.candidates[candidateTestIndex].completedAt = new Date();

    await test.save();

    // Update candidate's test results
    if (candidate) {
      const existingResultIndex = candidate.testResults.findIndex(
        result => result.test.toString() === req.params.id
      );

      const resultData = {
        test: req.params.id,
        score: totalScore,
        totalScore: test.totalMarks,
        percentage,
        status: passed ? 'passed' : 'failed',
        submittedAt: new Date(),
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        answers: processedAnswers,
        candidatePhotos: req.body.candidatePhotos || [], // Array of candidate photos with timestamps
        screenshots: screenshots || [] // Legacy field - kept for backward compatibility
      };

      if (existingResultIndex >= 0) {
        candidate.testResults[existingResultIndex] = resultData;
      } else {
        candidate.testResults.push(resultData);
      }

      await candidate.save();
    }

    res.json({
      message: 'Test submitted successfully',
      result: {
        score: totalScore,
        totalScore: test.totalMarks,
        percentage,
        passed,
        status: passed ? 'passed' : 'failed'
      }
    });
  } catch (error) {
    console.error('Test submission error:', error);
    res.status(500).json({ message: 'Server error submitting test' });
  }
});

// Assign test to candidates (Super Admin only)
router.post('/:id/assign', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { candidateIds, scheduledDate, scheduledTime } = req.body;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Update test schedule
    test.scheduledDate = scheduledDate;
    test.scheduledTime = scheduledTime;

    // Add candidates to test
    for (const candidateId of candidateIds) {
      const existingIndex = test.candidates.findIndex(
        c => c.candidate.toString() === candidateId
      );

      if (existingIndex >= 0) {
        test.candidates[existingIndex].invitedAt = new Date();
      } else {
        test.candidates.push({
          candidate: candidateId,
          invitedAt: new Date()
        });
      }
    }

    await test.save();

    res.json({
      message: 'Test assigned to candidates successfully',
      assignedCount: candidateIds.length
    });
  } catch (error) {
    console.error('Test assignment error:', error);
    res.status(500).json({ message: 'Server error assigning test' });
  }
});

// Get detailed test results for a specific candidate (Super Admin only)
router.get('/:testId/results/:candidateId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { testId, candidateId } = req.params;
    
    const test = await Test.findById(testId)
      .populate('form', 'title position department');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const candidate = await Candidate.findById(candidateId)
      .populate('user', 'name email')
      .populate('form', 'title position department');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Find the test result for this candidate
    const testResult = candidate.testResults.find(
      result => result.test.toString() === testId
    );

    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found for this candidate' });
    }

    // Get candidate photo from application data
    const applicationData = candidate.applicationData instanceof Map 
      ? Object.fromEntries(candidate.applicationData)
      : candidate.applicationData || {};
    
    const passportPhoto = applicationData.passportPhoto || 
      candidate.documents?.find(d => 
        d && (d.name?.toLowerCase().includes('photo') || d.name?.toLowerCase().includes('passport'))
      )?.url;

    // Helper function to format answer for display
    const formatAnswerForDisplay = (answer, options) => {
      if (!options || !Array.isArray(options)) {
        return answer;
      }

      // If answer is an index (number)
      if (typeof answer === 'number') {
        if (answer >= 0 && answer < options.length) {
          return {
            index: answer,
            value: options[answer],
            display: `Option ${String.fromCharCode(65 + answer)}: ${options[answer]}`
          };
        }
        return { index: answer, value: null, display: `Invalid index: ${answer}` };
      }

      // If answer is an array (multiple choice)
      if (Array.isArray(answer)) {
        const formatted = answer.map(a => {
          if (typeof a === 'number' && a >= 0 && a < options.length) {
            return {
              index: a,
              value: options[a],
              display: `Option ${String.fromCharCode(65 + a)}: ${options[a]}`
            };
          }
          return { index: a, value: a, display: String(a) };
        });
        return {
          indices: formatted.map(f => f.index),
          values: formatted.map(f => f.value),
          display: formatted.map(f => f.display).join(', ')
        };
      }

      // If answer is a string, try to find it in options
      if (typeof answer === 'string') {
        const index = options.findIndex(opt => opt.trim().toLowerCase() === answer.trim().toLowerCase());
        if (index >= 0) {
          return {
            index: index,
            value: options[index],
            display: `Option ${String.fromCharCode(65 + index)}: ${options[index]}`
          };
        }
        return { index: null, value: answer, display: answer };
      }

      return { index: null, value: answer, display: String(answer) };
    };

    // Map answers with question details
    const detailedAnswers = testResult.answers.map(answer => {
      const question = test.questions.find(q => q._id.toString() === answer.questionId);
      const formattedCandidateAnswer = formatAnswerForDisplay(answer.answer, question?.options);
      const formattedCorrectAnswer = formatAnswerForDisplay(question?.correctAnswer, question?.options);
      
      return {
        questionId: answer.questionId,
        questionText: question?.questionText || 'Question not found',
        questionType: question?.questionType || 'mcq',
        options: question?.options || [],
        correctAnswer: question?.correctAnswer,
        correctAnswerFormatted: formattedCorrectAnswer,
        candidateAnswer: answer.answer,
        candidateAnswerFormatted: formattedCandidateAnswer,
        isCorrect: answer.isCorrect,
        marks: answer.marks || 0,
        questionMarks: question?.marks || 0,
        timeTaken: answer.timeTaken || 0, // Time taken in seconds
        answeredAt: answer.answeredAt,
        screenshot: answer.screenshot || null
      };
    });

    // Calculate total time taken
    const totalTimeTaken = testResult.answers.reduce((sum, ans) => sum + (ans.timeTaken || 0), 0);
    const testDuration = testResult.startedAt && testResult.submittedAt
      ? Math.floor((new Date(testResult.submittedAt) - new Date(testResult.startedAt)) / 1000)
      : totalTimeTaken;

    res.json({
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        duration: test.duration,
        totalMarks: test.totalMarks,
        passingPercentage: test.passingPercentage,
        cutoffPercentage: test.cutoffPercentage,
        questions: test.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks
        }))
      },
      candidate: {
        _id: candidate._id,
        name: candidate.user.name,
        email: candidate.user.email,
        photo: passportPhoto,
        form: candidate.form
      },
      result: {
        score: testResult.score || 0,
        totalScore: testResult.totalScore || test.totalMarks,
        percentage: testResult.percentage || 0,
        status: testResult.status,
        passed: testResult.status === 'passed',
        startedAt: testResult.startedAt,
        submittedAt: testResult.submittedAt,
        testDuration: testDuration, // Total time taken in seconds
        totalTimeTaken: totalTimeTaken, // Sum of individual question times
        answers: detailedAnswers,
        candidatePhotos: testResult.candidatePhotos || [],
        screenshots: testResult.screenshots || [] // Legacy field
      }
    });
  } catch (error) {
    console.error('Detailed test results fetch error:', error);
    res.status(500).json({ message: 'Server error fetching detailed test results' });
  }
});

// Get test results (Super Admin only)
router.get('/:id/results', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate({
        path: 'candidates.candidate',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate('form', 'title position department');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const results = test.candidates
      .filter(c => c.status === 'completed')
      .map(c => ({
        candidate: {
          _id: c.candidate._id,
          name: c.candidate.user?.name || 'Unknown',
          email: c.candidate.user?.email || 'Unknown'
        },
        score: c.score,
        percentage: c.percentage,
        completedAt: c.completedAt,
        passed: c.percentage >= test.passingPercentage,
        suggestNextRound: c.percentage >= (test.cutoffPercentage || test.passingPercentage)
      }))
      .sort((a, b) => b.percentage - a.percentage);

    res.json({
      test: {
        _id: test._id,
        title: test.title,
        totalMarks: test.totalMarks,
        passingPercentage: test.passingPercentage,
        cutoffPercentage: test.cutoffPercentage
      },
      results,
      summary: {
        totalCandidates: test.candidates.length,
        completed: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        averageScore: results.length > 0 ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length : 0
      }
    });
  } catch (error) {
    console.error('Test results fetch error:', error);
    res.status(500).json({ message: 'Server error fetching test results' });
  }
});

// Suggest/move candidates to next round based on cutoff (Super Admin only)
router.post('/:id/suggest-next-round', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const cutoff = test.cutoffPercentage || test.passingPercentage;
    // Find candidate docs by test.candidates
    const candidateIds = test.candidates
      .filter(c => c.status === 'completed' && c.percentage >= cutoff)
      .map(c => c.candidate);
    if (candidateIds.length === 0) {
      return res.json({ message: 'No candidates meet the cutoff', updated: 0 });
    }
    // Mark as shortlisted for next interview round
    const result = await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      { status: 'shortlisted' }
    );
    res.json({ message: 'Candidates suggested for next round', updated: result.modifiedCount });
  } catch (error) {
    console.error('Suggest next round error:', error);
    res.status(500).json({ message: 'Server error suggesting next round' });
  }
});

// Conduct test from CSV upload (Super Admin only)
router.post('/conduct-from-csv', authenticateToken, requireSuperAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    const { candidateId, title, description, duration, passingPercentage, cutoffPercentage } = req.body;

    if (!candidateId || !title || !duration) {
      return res.status(400).json({ message: 'candidateId, title, and duration are required' });
    }

    // Get candidate and user details
    const candidate = await Candidate.findById(candidateId).populate('user', 'name email profile').populate('form', 'title position department');
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const user = candidate.user;
    const phone = user.profile?.phone || '';

    // Parse CSV file
    const questions = [];

    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(req.file.path);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      let isFirstLine = true;

      rl.on('line', (line) => {
        // Skip empty lines
        if (!line.trim()) {
          return;
        }

        if (isFirstLine) {
          isFirstLine = false;
          return; // Skip header
        }

        // Parse CSV - handle both comma and pipe-separated formats
        // First try to detect delimiter by checking which one appears more often
        const commaCount = (line.match(/,/g) || []).length;
        const pipeCount = (line.match(/\|/g) || []).length;
        const delimiter = pipeCount > commaCount ? '|' : ',';
        
        // Parse the line, handling quoted fields
        const parts = [];
        let currentPart = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            parts.push(currentPart.trim());
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        // Add the last part
        if (currentPart.trim() || parts.length > 0) {
          parts.push(currentPart.trim());
        }

        if (parts.length >= 6) {
          const question = parts[0].replace(/^"|"$/g, ''); // Remove surrounding quotes
          const optionA = parts[1].replace(/^"|"$/g, '');
          const optionB = parts[2].replace(/^"|"$/g, '');
          const optionC = parts[3].replace(/^"|"$/g, '');
          const optionD = parts[4].replace(/^"|"$/g, '');
          const answer = parts[5].trim().toUpperCase().replace(/^"|"$/g, '');

          if (question && optionA && optionB && optionC && optionD && answer) {
            // Determine correct answer index - handle single letter (A, B, C, D)
            // Extract just the first letter and convert to uppercase
            const answerLetter = answer.trim().charAt(0).toUpperCase();
            let correctAnswerIndex = -1;
            
            if (answerLetter === 'A') correctAnswerIndex = 0;
            else if (answerLetter === 'B') correctAnswerIndex = 1;
            else if (answerLetter === 'C') correctAnswerIndex = 2;
            else if (answerLetter === 'D') correctAnswerIndex = 3;

            if (correctAnswerIndex >= 0) {
              questions.push({
                questionText: question,
                questionType: 'mcq',
                options: [optionA, optionB, optionC, optionD],
                correctAnswer: correctAnswerIndex,
                marks: 1,
                difficulty: 'medium'
              });
            }
          }
        }
      });

      rl.on('close', async () => {
        try {
          // Clean up temp file
          fs.unlinkSync(req.file.path);

          if (questions.length === 0) {
            return resolve(res.status(400).json({ message: 'No valid questions found in CSV file' }));
          }

          // Create test
          const test = new Test({
              title,
              description: description || '',
              form: candidate.form._id,
              questions,
              duration: Number(duration),
              passingPercentage: Number(passingPercentage) || 50,
              cutoffPercentage: Number(cutoffPercentage) || 60,
              instructions: description || 'Please answer all questions carefully.',
              candidates: [{
                candidate: candidateId,
                status: 'invited',
                invitedAt: new Date()
              }],
              createdBy: req.user._id
          });

          await test.save();

          // Ensure testLink is generated (in case pre-save hook didn't run)
          if (!test.testLink) {
            test.testLink = `test_${test._id}_${Date.now()}`;
            await test.save();
          }

          // Generate full test link URL
          const testLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/test/${test.testLink}`;
          const username = phone || user.email;
          const password = phone || user.email;

          // Log test details for debugging
          console.log('\n=== Test Created Successfully ===');
          console.log(`Test ID: ${test._id}`);
          console.log(`Test Title: ${test.title}`);
          console.log(`Test Link: ${testLink}`);
          console.log(`Candidate: ${user.name} (${user.email})`);
          console.log(`Username: ${username}`);
          console.log(`Password: ${password}`);
          console.log(`Phone: ${phone || 'Not provided'}`);
          console.log('===================================\n');

          // Send email notification
          const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                  Congratulations! You've been selected for the first phase of interview
                </h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Dear ${user.name},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  We are pleased to inform you that you have been selected for the first phase of interview with a test.
                </p>
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-top: 0;">Test Details</h3>
                  <p style="margin: 5px 0;"><strong>Test Title:</strong> ${test.title}</p>
                  <p style="margin: 5px 0;"><strong>Duration:</strong> ${test.duration} minutes</p>
                  ${test.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${test.description}</p>` : ''}
                </div>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                  <h3 style="color: #92400e; margin-top: 0;">Login Credentials</h3>
                  <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
                  <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${testLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Start Test
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${testLink}" style="color: #3b82f6;">${testLink}</a>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                  This is an automated message from the Staff Recruitment System. Please do not reply to this email.
                </p>
              </div>
            `;

            const emailText = `
Congratulations! You've been selected for the first phase of interview

Dear ${user.name},

We are pleased to inform you that you have been selected for the first phase of interview with a test.

Test Details:
- Test Title: ${test.title}
- Duration: ${test.duration} minutes
${test.description ? `- Description: ${test.description}` : ''}

Login Credentials:
- Username: ${username}
- Password: ${password}

Test Link: ${testLink}

This is an automated message from the Faculty Recruitment System.
            `;

          try {
            await sendEmail(user.email, `Test Invitation: ${test.title}`, emailHtml, emailText);
          } catch (emailError) {
            console.error('Email send error:', emailError);
            // Don't fail the request if email fails
          }

          resolve(res.status(201).json({
            message: 'Test created and notification sent successfully',
            test: {
              _id: test._id,
              title: test.title,
              testLink: test.testLink
            }
          }));
        } catch (error) {
          reject(error);
        }
      });

      rl.on('error', (error) => {
        // Clean up temp file on error
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (e) {}
        reject(error);
      });
    });
  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error('Conduct test from CSV error:', error);
    res.status(500).json({ message: 'Server error conducting test from CSV' });
  }
});

// Release test results and promote/reject candidates (Super Admin only)
router.post('/:id/release-results', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { candidateId, promote, interviewDate, interviewTime, rejectReason } = req.body;
    const test = await Test.findById(req.params.id).populate('candidates.candidate');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const candidateTest = test.candidates.find(c => c.candidate._id.toString() === candidateId);
    if (!candidateTest) {
      return res.status(404).json({ message: 'Candidate not found in test' });
    }

    const candidate = await Candidate.findById(candidateId).populate('user', 'name email profile').populate('form', 'title position department');
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const user = candidate.user;
    const phone = user.profile?.phone || '';

    // Initialize interview variables (used in both promote and reject paths)
    let interview = null;
    let interviewCreated = false;

    if (promote) {
      // Promote to interview
      candidate.status = 'shortlisted';
      await candidate.save();

      // If interview date is provided, automatically create or find interview and add candidate
      if (interviewDate) {
        // Find or create an interview for this form and round
        // First, try to find an existing interview for the same form
        interview = await Interview.findOne({
          form: candidate.form._id,
          round: 1, // Default to round 1, can be made configurable
          type: 'technical' // Default type
        });

        // If no interview exists, create a new one
        if (!interview) {
          interview = new Interview({
            title: `Interview - ${candidate.form.title || candidate.form.position || 'Technical Interview'}`,
            description: `Interview for candidates who passed the test: ${test.title}`,
            form: candidate.form._id,
            round: 1,
            type: 'technical',
            createdBy: req.user._id
          });
          await interview.save();
          interviewCreated = true;
          console.log('✅ [INTERVIEW AUTO-CREATE] Created new interview:', interview._id);
        }

        // Check if candidate is already in this interview
        const existingCandidateIndex = interview.candidates.findIndex(
          c => c.candidate.toString() === candidateId
        );

        if (existingCandidateIndex >= 0) {
          // Update existing candidate entry with schedule
          interview.candidates[existingCandidateIndex].scheduledDate = new Date(interviewDate);
          interview.candidates[existingCandidateIndex].scheduledTime = interviewTime || '';
          interview.candidates[existingCandidateIndex].status = 'scheduled';
        } else {
          // Add candidate to interview with schedule
          interview.candidates.push({
            candidate: candidateId,
            scheduledDate: new Date(interviewDate),
            scheduledTime: interviewTime || '',
            status: 'scheduled'
          });
        }

        await interview.save();
        console.log('✅ [INTERVIEW AUTO-ASSIGN] Candidate added to interview:', interview._id);
      }

      // Send promotion email with interview schedule
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
            Congratulations! You've passed the test
          </h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Dear ${user.name},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Congratulations! You have successfully passed the test and have been selected for the interview phase.
          </p>
          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h3 style="color: #065f46; margin-top: 0;">Test Results</h3>
            <p style="margin: 5px 0;"><strong>Score:</strong> ${candidateTest.score || 0}/${test.totalMarks}</p>
            <p style="margin: 5px 0;"><strong>Percentage:</strong> ${candidateTest.percentage?.toFixed(1) || 0}%</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Passed</p>
          </div>
          ${interviewDate ? `
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Interview Schedule</h3>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            ${interviewTime ? `<p style="margin: 5px 0;"><strong>Time:</strong> ${interviewTime}</p>` : ''}
            <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
              You have been automatically scheduled for this interview. You will receive further details and meeting link shortly.
            </p>
          </div>
          ` : ''}
          <p style="color: #6b7280; font-size: 14px;">
            ${interviewDate ? 'Please keep this date and time available for your interview.' : 'You will receive further details about the interview shortly.'}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from the Staff Recruitment System.
          </p>
        </div>
      `;

      const emailText = `
Congratulations! You've passed the test

Dear ${user.name},

Congratulations! You have successfully passed the test and have been selected for the interview phase.

Test Results:
- Score: ${candidateTest.score || 0}/${test.totalMarks}
- Percentage: ${candidateTest.percentage?.toFixed(1) || 0}%
- Status: Passed

${interviewDate ? `Interview Schedule:\n- Date: ${new Date(interviewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n${interviewTime ? `- Time: ${interviewTime}\n` : ''}\nYou have been automatically scheduled for this interview. You will receive further details and meeting link shortly.\n` : ''}

${interviewDate ? 'Please keep this date and time available for your interview.' : 'You will receive further details about the interview shortly.'}

This is an automated message from the Faculty Recruitment System.
      `;

      try {
        await sendEmail(user.email, `Test Results: ${test.title}`, emailHtml, emailText);
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    } else {
      // Reject candidate
      candidate.status = 'rejected';
      await candidate.save();

      // Send rejection email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">
            Test Results Update
          </h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Dear ${user.name},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for taking the test. Unfortunately, we are unable to proceed with your application at this time.
          </p>
          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">Test Results</h3>
            <p style="margin: 5px 0;"><strong>Score:</strong> ${candidateTest.score || 0}/${test.totalMarks}</p>
            <p style="margin: 5px 0;"><strong>Percentage:</strong> ${candidateTest.percentage?.toFixed(1) || 0}%</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Not Selected</p>
            ${rejectReason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${rejectReason}</p>` : ''}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            We appreciate your interest and wish you the best in your future endeavors.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from the Staff Recruitment System.
          </p>
        </div>
      `;

      const emailText = `
Test Results Update

Dear ${user.name},

Thank you for taking the test. Unfortunately, we are unable to proceed with your application at this time.

Test Results:
- Score: ${candidateTest.score || 0}/${test.totalMarks}
- Percentage: ${candidateTest.percentage?.toFixed(1) || 0}%
- Status: Not Selected
${rejectReason ? `- Reason: ${rejectReason}\n` : ''}

We appreciate your interest and wish you the best in your future endeavors.

This is an automated message from the Faculty Recruitment System.
      `;

      try {
        await sendEmail(user.email, `Test Results: ${test.title}`, emailHtml, emailText);
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    res.json({
      message: promote ? 'Results released and candidate promoted to interview' : 'Results released and candidate rejected',
      candidate: {
        _id: candidate._id,
        status: candidate.status
      },
      interview: interview ? {
        _id: interview._id,
        title: interview.title,
        created: interviewCreated
      } : null
    });
  } catch (error) {
    console.error('Release results error:', error);
    res.status(500).json({ message: 'Server error releasing results' });
  }
});

module.exports = router;
