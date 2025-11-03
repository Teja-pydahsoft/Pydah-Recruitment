const express = require('express');
const Test = require('../models/Test');
const Candidate = require('../models/Candidate');
const QuestionBank = require('../models/QuestionBank');
const PreviousPaper = require('../models/PreviousPaper');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

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

// Get test by unique link (for candidates)
router.get('/take/:testLink', authenticateToken, async (req, res) => {
  try {
    const test = await Test.findOne({
      testLink: req.params.testLink,
      isActive: true
    }).populate('form', 'title position department');

    if (!test) {
      return res.status(404).json({ message: 'Test not found or inactive' });
    }

    // Check if candidate is assigned to this test
    const candidateTest = test.candidates.find(
      c => c.candidate.toString() === req.user._id.toString()
    );

    if (!candidateTest) {
      return res.status(403).json({ message: 'You are not assigned to this test' });
    }

    if (candidateTest.status === 'completed') {
      return res.status(400).json({ message: 'You have already completed this test' });
    }

    if (candidateTest.status === 'expired') {
      return res.status(400).json({ message: 'This test has expired' });
    }

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

// Submit test answers
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Find candidate's test entry
    const candidateTestIndex = test.candidates.findIndex(
      c => c.candidate.toString() === req.user._id.toString()
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
        if (Array.isArray(answer.answer)) {
          isCorrect = JSON.stringify(answer.answer.sort()) === JSON.stringify(question.correctAnswer.sort());
        } else {
          isCorrect = answer.answer === question.correctAnswer;
        }
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
        ...answer,
        isCorrect,
        marks
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
    const candidate = await Candidate.findOne({ user: req.user._id });
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
        answers: processedAnswers
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

// Get test results (Super Admin only)
router.get('/:id/results', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('candidates.candidate', 'name email')
      .populate('form', 'title position department');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const results = test.candidates
      .filter(c => c.status === 'completed')
      .map(c => ({
        candidate: {
          _id: c.candidate._id,
          name: c.candidate.name,
          email: c.candidate.email
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

module.exports = router;
