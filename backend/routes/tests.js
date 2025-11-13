const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const XLSX = require('xlsx');
const Test = require('../models/Test');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const QuestionBank = require('../models/QuestionBank');
const QuestionTopic = require('../models/QuestionTopic');
const PreviousPaper = require('../models/PreviousPaper');
const Interview = require('../models/Interview');
const NotificationSettings = require('../models/NotificationSettings');
const { authenticateToken, requireSuperAdminOrPermission } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const { ensureSMSConfigured, sendTemplateSMS } = require('../config/sms');

const router = express.Router();
const upload = multer({ dest: path.join(os.tmpdir(), 'uploads') });

// Create new test (Super Admin only)
router.post('/', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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

    if (!test.testLink) {
      test.testLink = `test_${test._id}_${Date.now()}`;
      await test.save();
    }

    const candidateMap = new Map(
      candidateData.map(candidate => [candidate._id.toString(), candidate])
    );

    if (candidateAssignments.length > 0) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const baseTestLink = `${frontendUrl}/test/${test.testLink}`;

      const notificationSettings = await NotificationSettings.getGlobalSettings();
      const candidateSettings = notificationSettings?.candidate || {};
      const templatePrefs = candidateSettings.templates || {};
      const emailTemplates = templatePrefs.email || {};
      const smsTemplatesPref = templatePrefs.sms || {};

      const emailChannelEnabled = candidateSettings.email !== false;
      const emailTemplateEnabled = emailTemplates.testInvitation !== false;
      const smsChannelEnabled = Boolean(candidateSettings.sms && ensureSMSConfigured());
      const smsTemplateEnabled = smsTemplatesPref.testInvitation !== false;

      for (const assignment of candidateAssignments) {
        const candidateId = assignment.candidate.toString();
        const candidateDetails = candidateMap.get(candidateId);

        if (!candidateDetails) {
          console.warn(`[NOTIFY] Candidate data missing for assignment ${candidateId}, skipping notification.`);
          continue;
        }

        const user = candidateDetails.user;
        if (!user?.email) {
          console.warn(`[NOTIFY] Candidate ${candidateId} is missing email address, skipping notification.`);
          continue;
        }

        const phone = (user.profile?.phone || '').trim();
        const canSendSMS = Boolean(smsChannelEnabled && phone && smsTemplateEnabled);

        console.log('[NOTIFY] Candidate test invitation preferences (auto-generate)', {
          candidateEmail: user.email,
          candidateName: user.name,
          emailChannelEnabled,
          emailTemplateEnabled,
          smsChannelEnabled: candidateSettings.sms !== false,
          smsTemplateEnabled,
          phonePresent: Boolean(phone),
          testTitle: test.title
        });

        const candidateLink = `${baseTestLink}?candidate=${candidateId}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
              Test Invitation: ${test.title}
            </h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Dear ${user.name},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You have been invited to complete the "${test.title}" assessment as part of the recruitment process.
            </p>
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Test Details</h3>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${test.duration} minutes</p>
              ${test.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${test.description}</p>` : ''}
              ${test.scheduledDate ? `<p style="margin: 5px 0;"><strong>Scheduled Date:</strong> ${new Date(test.scheduledDate).toLocaleDateString()}</p>` : ''}
              ${test.scheduledTime ? `<p style="margin: 5px 0;"><strong>Scheduled Time:</strong> ${test.scheduledTime}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${candidateLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Start Test
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${candidateLink}" style="color: #3b82f6;">${candidateLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated message from the Staff Recruitment System. Please do not reply to this email.
            </p>
          </div>
        `;

        const emailText = `
Test Invitation: ${test.title}

Dear ${user.name},

You have been invited to complete the "${test.title}" assessment as part of the recruitment process.

Duration: ${test.duration} minutes
${test.description ? `Description: ${test.description}\n` : ''}
${test.scheduledDate ? `Scheduled Date: ${new Date(test.scheduledDate).toLocaleDateString()}\n` : ''}
${test.scheduledTime ? `Scheduled Time: ${test.scheduledTime}\n` : ''}

Test Link: ${candidateLink}

This is an automated message from the Staff Recruitment System.
        `;

        if (emailChannelEnabled && emailTemplateEnabled) {
          try {
            await sendEmail(user.email, `Test Invitation: ${test.title}`, emailHtml, emailText);
          } catch (emailError) {
            console.error('Email send error (auto-generate):', emailError);
          }
        } else if (!emailChannelEnabled) {
          console.log('Candidate email channel disabled; skipping email for test invitation.');
        } else if (!emailTemplateEnabled) {
          console.log('Email test invitation template disabled; skipping email for test invitation.');
        }

        if (canSendSMS) {
          try {
            await sendTemplateSMS({
              templateKey: 'candidateTestInvitation',
              phoneNumber: phone,
              variables: {
                name: user.name,
                testTitle: test.title,
                duration: test.duration,
                link: candidateLink
              }
            });
          } catch (smsError) {
            console.error('SMS send error (auto-generate):', smsError);
          }
        } else if (candidateSettings.sms) {
          if (!ensureSMSConfigured()) {
            console.log('SMS configuration incomplete; skipping SMS for test invitation.');
          } else if (!phone) {
            console.log('Candidate phone number missing; skipping SMS for test invitation.');
          } else if (!smsTemplateEnabled) {
            console.log('SMS test invitation template disabled; skipping SMS for test invitation.');
          }
        }
      }
    }

    res.status(201).json({
      message: 'Test created successfully',
      test
    });
  } catch (error) {
    console.error('Test creation error:', error);
    res.status(500).json({ message: 'Server error creating test' });
  }
});

// Question Topics & Bank (Super Admin or permitted Sub Admin)
router.get('/topics', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { category, includeInactive, includeCounts } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    const topics = await QuestionTopic.find(filter).sort({ name: 1 }).lean();

    if (includeCounts === 'true' && topics.length > 0) {
      const topicIds = topics.map(topic => topic._id);
      const counts = await QuestionBank.aggregate([
        { $match: { topic: { $in: topicIds }, isActive: true } },
        { $group: { _id: '$topic', count: { $sum: 1 } } }
      ]);

      const countMap = new Map(counts.map(item => [item._id.toString(), item.count]));
      topics.forEach(topic => {
        topic.questionCount = countMap.get(topic._id.toString()) || 0;
      });
    }

    res.json({ topics });
  } catch (error) {
    console.error('Question topic fetch error:', error);
    res.status(500).json({ message: 'Server error fetching topics' });
  }
});

router.post('/topics', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Name and category are required' });
    }

    const existing = await QuestionTopic.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      category
    });

    if (existing) {
      return res.status(400).json({ message: 'Topic already exists for this category' });
    }

    const topic = new QuestionTopic({
      name: name.trim(),
      category,
      description: description?.trim() || undefined,
      createdBy: req.user._id
    });

    await topic.save();
    res.status(201).json({ message: 'Topic created successfully', topic });
  } catch (error) {
    console.error('Question topic create error:', error);
    res.status(500).json({ message: 'Server error creating topic' });
  }
});

router.put('/topics/:topicId', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { name, description, category, isActive } = req.body;
    const topic = await QuestionTopic.findById(req.params.topicId);

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (name !== undefined && name.trim() !== '' && name.trim().toLowerCase() !== topic.name.toLowerCase()) {
      const duplicate = await QuestionTopic.findOne({
        _id: { $ne: topic._id },
        name: { $regex: `^${name}$`, $options: 'i' },
        category: category || topic.category
      });

      if (duplicate) {
        return res.status(400).json({ message: 'Another topic with the same name exists in this category' });
      }

      topic.name = name.trim();
    }

    if (category && category !== topic.category) {
      topic.category = category;
    }

    if (description !== undefined) {
      topic.description = description?.trim() || undefined;
    }

    if (typeof isActive === 'boolean') {
      topic.isActive = isActive;
    }

    await topic.save();

    // Keep denormalised values in question bank in sync
    await QuestionBank.updateMany(
      { topic: topic._id },
      {
        $set: {
          topicName: topic.name,
          category: topic.category
        }
      }
    );

    res.json({ message: 'Topic updated successfully', topic });
  } catch (error) {
    console.error('Question topic update error:', error);
    res.status(500).json({ message: 'Server error updating topic' });
  }
});

router.delete('/topics/:topicId', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const topic = await QuestionTopic.findById(req.params.topicId);

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    topic.isActive = false;
    await topic.save();

    // Optionally deactivate related questions
    await QuestionBank.updateMany(
      { topic: topic._id },
      { $set: { isActive: false } }
    );

    res.json({ message: 'Topic deactivated successfully' });
  } catch (error) {
    console.error('Question topic delete error:', error);
    res.status(500).json({ message: 'Server error deactivating topic' });
  }
});

router.get('/questions', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const {
      topicId,
      topic,
      category,
      search,
      page = 1,
      limit = 20,
      includeInactive
    } = req.query;

    const filter = {};

    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    if (topicId && mongoose.Types.ObjectId.isValid(topicId)) {
      filter.topic = topicId;
    } else if (topic) {
      const foundTopic = await QuestionTopic.findOne({
        name: { $regex: `^${topic}$`, $options: 'i' }
      }).select('_id');

      if (!foundTopic) {
        return res.json({ questions: [], total: 0 });
      }
      filter.topic = foundTopic._id;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.questionText = { $regex: search, $options: 'i' };
    }

    const numericLimit = Math.min(Number(limit) || 20, 200);
    const numericPage = Math.max(Number(page) || 1, 1);

    const questions = await QuestionBank.find(filter)
      .populate('topic', 'name category isActive')
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    const total = await QuestionBank.countDocuments(filter);

    res.json({
      questions,
      total,
      page: numericPage,
      limit: numericLimit
    });
  } catch (error) {
    console.error('Question bank fetch error:', error);
    res.status(500).json({ message: 'Server error fetching question bank' });
  }
});

router.get('/questions/bulk-template', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const headerRow = [['Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer']];
    const worksheet = XLSX.utils.aoa_to_sheet(headerRow);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="mcq-bulk-template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Bulk template generation error:', error);
    res.status(500).json({ message: 'Unable to generate template.' });
  }
});

router.post('/questions/bulk-upload', authenticateToken, requireSuperAdminOrPermission('tests.manage'), upload.single('file'), async (req, res) => {
  let uploadedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    uploadedFilePath = req.file.path;

    const workbook = XLSX.readFile(req.file.path);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ message: 'Uploaded file does not contain any sheets' });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Uploaded file does not contain any data rows' });
    }

    const toLower = (value) => (value || '').toString().trim().toLowerCase();
    const getCell = (row, keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) {
          return row[key];
        }
      }
      return '';
    };

    const determineCorrectAnswer = (rawValue, options) => {
      if (rawValue === undefined || rawValue === null || options.length === 0) {
        return null;
      }

      const value = rawValue.toString().trim();
      if (!value) {
        return null;
      }

      // Letter based (A, B, C, ...)
      const letterMatch = value.match(/^[A-Za-z]$/);
      if (letterMatch) {
        const index = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
        return index >= 0 && index < options.length ? index : null;
      }

      // Numeric (1-based or 0-based)
      if (!Number.isNaN(Number(value))) {
        const numeric = Number(value);
        if (numeric >= 0 && numeric < options.length) {
          return numeric;
        }
        if (numeric > 0 && numeric <= options.length) {
          return numeric - 1;
        }
      }

      // Match option text
      const lowerOptions = options.map(opt => toLower(opt));
      const matchIndex = lowerOptions.indexOf(value.toLowerCase());
      if (matchIndex !== -1) {
        return matchIndex;
      }

      return null;
    };

    const allTopics = await QuestionTopic.find({ isActive: true }).lean();
    if (!allTopics.length) {
      return res.status(400).json({ message: 'No active topics found. Please create a topic before uploading questions.' });
    }
    const fallbackTopic = allTopics[0];
    const topicsByName = new Map(allTopics.map(topic => [topic.name.trim().toLowerCase(), topic]));

    const questionsToInsert = [];
    const errors = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // considering header row
      let effectiveTopic = fallbackTopic;

        const topicNameFromRow = getCell(row, ['Topic', 'topic', 'Topic Name', 'TopicName']).toString().trim();
      if (topicNameFromRow) {
        const topicLookup = topicsByName.get(topicNameFromRow.toLowerCase());
        if (topicLookup) {
          effectiveTopic = topicLookup;
        } else {
          errors.push(`Row ${rowNumber}: Topic "${topicNameFromRow}" not found`);
          return;
        }
      }

      const questionText = getCell(row, ['Question', 'question', 'Question Text']).toString().trim();
      if (!questionText) {
        errors.push(`Row ${rowNumber}: Question text is empty`);
        return;
      }

      const options = [
        getCell(row, ['OptionA', 'A', 'Option A']),
        getCell(row, ['OptionB', 'B', 'Option B']),
        getCell(row, ['OptionC', 'C', 'Option C']),
        getCell(row, ['OptionD', 'D', 'Option D']),
        getCell(row, ['OptionE', 'E', 'Option E'])
      ]
        .map(opt => opt.toString().trim())
        .filter(opt => opt !== '');

      if (options.length < 2) {
        errors.push(`Row ${rowNumber}: At least two answer options are required`);
        return;
      }

      const rawCorrectAnswer = getCell(row, ['CorrectAnswer', 'Correct Answer', 'Answer', 'Correct']);
      const correctAnswerIndex = determineCorrectAnswer(rawCorrectAnswer, options);

      if (correctAnswerIndex === null) {
        errors.push(`Row ${rowNumber}: Unable to determine correct answer`);
        return;
      }

      const difficulty = toLower(getCell(row, ['Difficulty', 'difficulty']));
      const explanation = getCell(row, ['Explanation', 'explanation']).toString().trim();
      const tagsValue = getCell(row, ['Tags', 'tags']).toString().trim();

      questionsToInsert.push({
        topic: effectiveTopic._id,
        topicName: effectiveTopic.name,
        category: effectiveTopic.category,
        questionText,
        options,
        correctAnswer: correctAnswerIndex,
        difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
        explanation: explanation || undefined,
        tags: tagsValue ? tagsValue.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        createdBy: req.user._id
      });
    });

    if (questionsToInsert.length === 0) {
      return res.status(400).json({
        message: 'No questions were imported. Please review the errors.',
        errors
      });
    }

    const inserted = await QuestionBank.insertMany(questionsToInsert, { ordered: false });

    res.status(201).json({
      message: `Bulk upload completed. Imported ${inserted.length} question(s).`,
      insertedCount: inserted.length,
      skippedCount: errors.length,
      errors
    });
  } catch (error) {
    console.error('Bulk question upload error:', error);
    res.status(500).json({ message: 'Server error processing bulk upload' });
  } finally {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        console.warn('Failed to remove uploaded file:', cleanupError.message);
      }
    }
  }
});

router.post('/questions', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const {
      topicId,
      subTopic,
      questionText,
      options,
      correctAnswer,
      explanation,
      difficulty,
      tags
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: 'Valid topicId is required' });
    }

    const topic = await QuestionTopic.findById(topicId);

    if (!topic || !topic.isActive) {
      return res.status(404).json({ message: 'Topic not found or inactive' });
    }

    if (!questionText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question text and at least two options are required' });
    }

    if (correctAnswer === undefined || correctAnswer === null) {
      return res.status(400).json({ message: 'Correct answer is required' });
    }

    const isIndex = typeof correctAnswer === 'number' ||
      (Array.isArray(correctAnswer) && correctAnswer.every(a => typeof a === 'number'));
    const isValue = typeof correctAnswer === 'string' ||
      (Array.isArray(correctAnswer) && correctAnswer.every(a => typeof a === 'string'));

    if (isIndex) {
      const indices = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
      if (indices.some(index => index < 0 || index >= options.length)) {
        return res.status(400).json({ message: 'Correct answer index out of bounds' });
      }
    } else if (isValue) {
      const values = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
      if (values.some(value => !options.includes(value))) {
        return res.status(400).json({ message: 'Correct answer value must be one of the provided options' });
      }
    } else {
      return res.status(400).json({ message: 'Correct answer must be option index(es) or option value(s)' });
    }

    const question = new QuestionBank({
      topic: topic._id,
      topicName: topic.name,
      category: topic.category,
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

router.put('/questions/:id', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const question = await QuestionBank.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const updates = { ...req.body };

    if (updates.topicId) {
      if (!mongoose.Types.ObjectId.isValid(updates.topicId)) {
        return res.status(400).json({ message: 'Valid topicId is required' });
      }

      const topic = await QuestionTopic.findById(updates.topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      updates.topic = topic._id;
      updates.topicName = topic.name;
      updates.category = topic.category;
      delete updates.topicId;
    }

    if (updates.options) {
      if (!Array.isArray(updates.options) || updates.options.length < 2) {
        return res.status(400).json({ message: 'At least two options are required' });
      }
    }

    if ('correctAnswer' in updates) {
      const correctAnswer = updates.correctAnswer;
      const options = updates.options || question.options;

      if (correctAnswer === undefined || correctAnswer === null) {
        return res.status(400).json({ message: 'Correct answer is required' });
      }

      const isIndex = typeof correctAnswer === 'number' ||
        (Array.isArray(correctAnswer) && correctAnswer.every(a => typeof a === 'number'));
      const isValue = typeof correctAnswer === 'string' ||
        (Array.isArray(correctAnswer) && correctAnswer.every(a => typeof a === 'string'));

      if (isIndex) {
        const indices = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        if (indices.some(index => index < 0 || index >= options.length)) {
          return res.status(400).json({ message: 'Correct answer index out of bounds' });
        }
      } else if (isValue) {
        const values = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        if (values.some(value => !options.includes(value))) {
          return res.status(400).json({ message: 'Correct answer value must be one of the provided options' });
        }
      } else {
        return res.status(400).json({ message: 'Correct answer must be option index(es) or option value(s)' });
      }
    }

    Object.assign(question, updates);
    await question.save();

    res.json({ message: 'Question updated', question });
  } catch (error) {
    console.error('Question bank update error:', error);
    res.status(500).json({ message: 'Server error updating question' });
  }
});

router.delete('/questions/:id', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const question = await QuestionBank.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await QuestionBank.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } }
    );

    res.json({ message: 'Question archived successfully' });
  } catch (error) {
    console.error('Question bank delete error:', error);
    res.status(500).json({ message: 'Server error archiving question' });
  }
});

const buildQuestionsFromTopicSelections = async (topicSelections = []) => {
  if (!Array.isArray(topicSelections) || topicSelections.length === 0) {
    throw new Error('Topic selections are required');
  }

  const compiledQuestions = [];
  const questionIds = [];

  for (const selection of topicSelections) {
    const { topicId, questionCount } = selection || {};

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      throw new Error('Each selection requires a valid topicId');
    }

    const count = Number(questionCount) || 0;
    if (count <= 0) {
      throw new Error('Question count must be greater than zero');
    }

    const topic = await QuestionTopic.findById(topicId);
    if (!topic || !topic.isActive) {
      throw new Error('One or more topics are inactive or missing');
    }

    const availableQuestions = await QuestionBank.countDocuments({
      topic: topic._id,
      isActive: true
    });

    if (availableQuestions < count) {
      throw new Error(`Not enough questions in topic "${topic.name}". Requested ${count}, available ${availableQuestions}.`);
    }

    const sampled = await QuestionBank.aggregate([
      { $match: { topic: topic._id, isActive: true } },
      { $sample: { size: count } }
    ]);

    sampled.forEach(question => {
      compiledQuestions.push({
        questionText: question.questionText,
        questionType: 'mcq',
        options: question.options,
        correctAnswer: question.correctAnswer,
        marks: 1,
        difficulty: question.difficulty,
        tags: question.tags || [],
        sourceTopic: topic.name,
        sourceTopicId: topic._id
      });
      questionIds.push(question._id);
    });
  }

  return { compiledQuestions, questionIds };
};

// Create test from question bank selections
router.post('/create-from-bank', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const {
      title,
      description,
      form,
      questionIds = [],
      topicSelections = [],
      duration,
      passingPercentage,
      cutoffPercentage,
      instructions
    } = req.body;

    let testQuestions = [];
    let sourceQuestionIds = [];

    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const questions = await QuestionBank.find({ _id: { $in: questionIds } });
      if (questions.length !== questionIds.length) {
        return res.status(400).json({ message: 'Some questions not found' });
      }

      testQuestions = questions.map(q => ({
        questionText: q.questionText,
        questionType: 'mcq',
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: 1,
        difficulty: q.difficulty,
        tags: q.tags || [],
        sourceTopic: q.topicName,
        sourceTopicId: q.topic
      }));
      sourceQuestionIds = questions.map(q => q._id);
    } else if (Array.isArray(topicSelections) && topicSelections.length > 0) {
      const { compiledQuestions, questionIds: sampledIds } = await buildQuestionsFromTopicSelections(topicSelections);
      testQuestions = compiledQuestions;
      sourceQuestionIds = sampledIds;
    } else {
      return res.status(400).json({ message: 'Provide either questionIds or topicSelections' });
    }

    if (!testQuestions.length) {
      return res.status(400).json({ message: 'Unable to compile questions for the test' });
    }

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
      sourceRefs: { bankQuestionIds: sourceQuestionIds },
      createdBy: req.user._id
    });

    await test.save();
    res.status(201).json({ message: 'Test created from bank', test });
  } catch (error) {
    console.error('Create test from bank error:', error);
    res.status(500).json({ message: 'Server error creating test from bank' });
  }
});

router.post('/auto-generate', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      duration,
      passingPercentage,
      cutoffPercentage,
      topicSelections,
      candidateIds,
      formId,
      scheduledDate,
      scheduledTime
    } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    if (!Array.isArray(topicSelections) || topicSelections.length === 0) {
      return res.status(400).json({ message: 'At least one topic selection is required' });
    }

    const normalizedSelections = topicSelections.map(selection => ({
      topicId: selection.topicId,
      questionCount: Number(selection.questionCount || 0)
    })).filter(selection => selection.topicId && selection.questionCount > 0);

    if (normalizedSelections.length === 0) {
      return res.status(400).json({ message: 'Every topic selection must include a topicId and questionCount greater than 0' });
    }

    // Fetch topic metadata
    const topicIds = normalizedSelections.map(selection => selection.topicId);
    const topics = await QuestionTopic.find({ _id: { $in: topicIds } }).lean();
    const topicMap = new Map(topics.map(topic => [topic._id.toString(), topic]));

    if (topicMap.size !== normalizedSelections.length) {
      return res.status(400).json({ message: 'One or more selected topics could not be found' });
    }

    // Gather questions for each topic
    const bankQuestionIds = [];
    const testQuestions = [];

    for (const selection of normalizedSelections) {
      const topicObjectId = new mongoose.Types.ObjectId(selection.topicId);
      const sampledQuestions = await QuestionBank.aggregate([
        { $match: { topic: topicObjectId, isActive: true } },
        { $sample: { size: selection.questionCount } }
      ]);

      if (sampledQuestions.length < selection.questionCount) {
        const topicName = topicMap.get(selection.topicId)?.name || 'Selected topic';
        return res.status(400).json({
          message: `Not enough active questions available for topic "${topicName}". Requested ${selection.questionCount}, found ${sampledQuestions.length}.`
        });
      }

      sampledQuestions.forEach(question => {
        bankQuestionIds.push(question._id);
        testQuestions.push({
          questionText: question.questionText,
          questionType: 'mcq',
          options: question.options,
          correctAnswer: question.correctAnswer,
          marks: 1,
          difficulty: question.difficulty || 'medium',
          tags: question.tags || []
        });
      });
    }

    if (testQuestions.length === 0) {
      return res.status(400).json({ message: 'No questions were generated for this test' });
    }

    let resolvedFormId = formId ? new mongoose.Types.ObjectId(formId) : null;
    let candidateAssignments = [];

    let candidateData = [];

    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      const uniqueCandidateIds = [...new Set(candidateIds.map(id => id.toString()))];
      const candidateObjectIds = uniqueCandidateIds.map(id => new mongoose.Types.ObjectId(id));
      candidateData = await Candidate.find({ _id: { $in: candidateObjectIds } })
        .populate('form', 'title position department formCategory')
        .populate('user', 'name email profile');

      if (candidateData.length !== uniqueCandidateIds.length) {
        return res.status(400).json({ message: 'One or more selected candidates could not be found' });
      }

      const formIds = [...new Set(candidateData.map(candidate => candidate.form?._id?.toString() || candidate.form?.toString()))];

      if (formIds.length > 1 && !resolvedFormId) {
        return res.status(400).json({ message: 'Selected candidates belong to different forms. Please ensure they are from the same recruitment form or specify a target form.' });
      }

      resolvedFormId = resolvedFormId || candidateData[0].form?._id || candidateData[0].form;

      candidateAssignments = candidateData.map(candidate => ({
        candidate: candidate._id,
        status: 'invited',
        invitedAt: new Date()
      }));
    }

    if (!resolvedFormId) {
      return res.status(400).json({ message: 'Unable to determine the recruitment form. Please select at least one candidate or provide a formId.' });
    }

    const test = new Test({
      title: title.trim(),
      description: description?.trim() || '',
      instructions: instructions?.trim() || '',
      form: resolvedFormId,
      questions: testQuestions,
      duration: Number(duration),
      passingPercentage: Number.isFinite(Number(passingPercentage)) ? Number(passingPercentage) : 50,
      cutoffPercentage: Number.isFinite(Number(cutoffPercentage)) ? Number(cutoffPercentage) : (Number.isFinite(Number(passingPercentage)) ? Number(passingPercentage) : 50),
      questionSource: 'bank',
      sourceRefs: {
        bankQuestionIds,
        topicSelections: normalizedSelections.map(selection => ({
          topicId: new mongoose.Types.ObjectId(selection.topicId),
          topicName: topicMap.get(selection.topicId)?.name || '',
          questionCount: selection.questionCount
        }))
      },
      createdBy: req.user._id,
      candidates: candidateAssignments,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      scheduledTime
    });

    await test.save();

    if (!test.testLink) {
      test.testLink = `test_${test._id}_${Date.now()}`;
      await test.save();
    }

    if (candidateAssignments.length > 0) {
      const candidateMap = new Map(
        candidateData.map(candidate => {
          const doc = candidate.toObject({ virtuals: true });
          return [candidate._id.toString(), doc];
        })
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const baseTestLink = `${frontendUrl}/test/${test.testLink}`;

      const notificationSettings = await NotificationSettings.getGlobalSettings();
      const candidateSettings = notificationSettings?.candidate || {};
      const templatePrefs = candidateSettings.templates || {};
      const emailTemplates = templatePrefs.email || {};
      const smsTemplatesPref = templatePrefs.sms || {};

      const emailChannelEnabled = candidateSettings.email !== false;
      const emailTemplateEnabled = emailTemplates.testInvitation !== false;
      const smsChannelEnabled = Boolean(candidateSettings.sms && ensureSMSConfigured());
      const smsTemplateEnabled = smsTemplatesPref.testInvitation !== false;

      for (const assignment of candidateAssignments) {
        const candidateId = assignment.candidate.toString();
        const candidateDetails = candidateMap.get(candidateId);

        if (!candidateDetails) {
          console.warn(`[NOTIFY] Candidate data missing for assignment ${candidateId}, skipping notification.`);
          continue;
        }

        const user = candidateDetails.user || {};
        if (!user.email) {
          console.warn(`[NOTIFY] Candidate ${candidateId} is missing email address, skipping notification.`);
          continue;
        }

        const phone = (user.profile?.phone || '').trim();
        const canSendSMS = Boolean(smsChannelEnabled && phone && smsTemplateEnabled);

        console.log('[NOTIFY] Candidate test invitation preferences (auto-generate)', {
          candidateEmail: user.email,
          candidateName: user.name,
          emailChannelEnabled,
          emailTemplateEnabled,
          smsChannelEnabled: candidateSettings.sms !== false,
          smsTemplateEnabled,
          phonePresent: Boolean(phone),
          testTitle: test.title
        });

        const candidateLink = `${baseTestLink}?candidate=${candidateId}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
              Test Invitation: ${test.title}
            </h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Dear ${user.name || 'Candidate'},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You have been invited to complete the "${test.title}" assessment as part of the recruitment process.
            </p>
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Test Details</h3>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${test.duration} minutes</p>
              ${test.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${test.description}</p>` : ''}
              ${test.scheduledDate ? `<p style="margin: 5px 0;"><strong>Scheduled Date:</strong> ${new Date(test.scheduledDate).toLocaleDateString()}</p>` : ''}
              ${test.scheduledTime ? `<p style="margin: 5px 0;"><strong>Scheduled Time:</strong> ${test.scheduledTime}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${candidateLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Start Test
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${candidateLink}" style="color: #3b82f6;">${candidateLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated message from the Staff Recruitment System. Please do not reply to this email.
            </p>
          </div>
        `;

        const emailText = `
Test Invitation: ${test.title}

Dear ${user.name || 'Candidate'},

You have been invited to complete the "${test.title}" assessment as part of the recruitment process.

Duration: ${test.duration} minutes
${test.description ? `Description: ${test.description}\n` : ''}
${test.scheduledDate ? `Scheduled Date: ${new Date(test.scheduledDate).toLocaleDateString()}\n` : ''}
${test.scheduledTime ? `Scheduled Time: ${test.scheduledTime}\n` : ''}

Test Link: ${candidateLink}

This is an automated message from the Staff Recruitment System.
        `;

        if (emailChannelEnabled && emailTemplateEnabled) {
          try {
            await sendEmail(user.email, `Test Invitation: ${test.title}`, emailHtml, emailText);
            console.log('✅ [TEST INVITATION] Email sent:', user.email);
          } catch (emailError) {
            console.error('Email send error (auto-generate):', emailError);
          }
        } else if (!emailChannelEnabled) {
          console.log('Candidate email channel disabled; skipping email for test invitation.');
        } else if (!emailTemplateEnabled) {
          console.log('Email test invitation template disabled; skipping email for test invitation.');
        }

        if (canSendSMS) {
          try {
            await sendTemplateSMS({
              templateKey: 'candidateTestInvitation',
              phoneNumber: phone,
              variables: {
                name: user.name,
                testTitle: test.title,
                duration: test.duration,
                link: candidateLink
              }
            });
          } catch (smsError) {
            console.error('SMS send error (auto-generate):', smsError);
          }
        } else if (candidateSettings.sms) {
          if (!ensureSMSConfigured()) {
            console.log('SMS configuration incomplete; skipping SMS for test invitation.');
          } else if (!phone) {
            console.log('Candidate phone number missing; skipping SMS for test invitation.');
          } else if (!smsTemplateEnabled) {
            console.log('SMS test invitation template disabled; skipping SMS for test invitation.');
          }
        }
      }
    }

    res.status(201).json({
      message: 'Assessment generated successfully',
      test
    });
  } catch (error) {
    console.error('Auto-generate test error:', error);
    res.status(500).json({ message: 'Server error generating assessment from topics' });
  }
});

// Upload previous paper (expects JSON payload of questions)
router.post('/previous-papers/upload', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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

router.post('/conduct-from-topics', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const {
      candidateId,
      title,
      description = '',
      duration,
      passingPercentage,
      cutoffPercentage,
      instructions,
      topicSelections,
      scheduledDate,
      scheduledTime
    } = req.body;

    if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'A valid candidateId is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Test title is required' });
    }

    if (!duration || Number(duration) <= 0) {
      return res.status(400).json({ message: 'Duration must be greater than zero' });
    }

    if (!Array.isArray(topicSelections) || topicSelections.length === 0) {
      return res.status(400).json({ message: 'At least one topic selection is required' });
    }

    const candidate = await Candidate.findById(candidateId)
      .populate('user', 'name email profile')
      .populate('form', 'title position department formCategory');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const { compiledQuestions, questionIds } = await buildQuestionsFromTopicSelections(topicSelections);

    const test = new Test({
      title: title.trim(),
      description: description.trim(),
      form: candidate.form?._id,
      questions: compiledQuestions,
      duration: Number(duration),
      passingPercentage: Number(passingPercentage) || 50,
      cutoffPercentage: Number(cutoffPercentage) || Number(passingPercentage) || 60,
      instructions: instructions?.trim() || description?.trim() || 'Please answer all questions carefully.',
      questionSource: 'bank',
      sourceRefs: { bankQuestionIds: questionIds },
      candidates: [{
        candidate: candidateId,
        status: 'invited',
        invitedAt: new Date()
      }],
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      scheduledTime: scheduledTime || undefined,
      createdBy: req.user._id
    });

    await test.save();

    if (!test.testLink) {
      test.testLink = `test_${test._id}_${Date.now()}`;
      await test.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const candidateLink = `${frontendUrl}/test/${test.testLink}?candidate=${candidateId.toString()}`;

    const user = candidate.user;
    const phone = (user.profile?.phone || '').trim();

    const notificationSettings = await NotificationSettings.getGlobalSettings();
    const candidateSettings = notificationSettings?.candidate || {};
    const templatePrefs = candidateSettings.templates || {};
    const emailTemplates = templatePrefs.email || {};
    const smsTemplatesPref = templatePrefs.sms || {};

    const canSendEmail = candidateSettings.email !== false;
    const allowEmailTemplate = emailTemplates.testInvitation !== false;
    const canSendSMS = Boolean(
      candidateSettings.sms &&
      ensureSMSConfigured() &&
      phone &&
      smsTemplatesPref.testInvitation !== false
    );

    console.log('[NOTIFY] Candidate test invitation preferences', {
      candidateEmail: user.email,
      candidateName: user.name,
      emailChannelEnabled: canSendEmail,
      emailTemplateEnabled: allowEmailTemplate,
      smsChannelEnabled: candidateSettings.sms !== false,
      smsTemplateEnabled: smsTemplatesPref.testInvitation !== false,
      phonePresent: Boolean(phone),
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          Test Invitation: ${test.title}
        </h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Dear ${user.name},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You have been invited to complete the "${test.title}" assessment as part of the recruitment process.
        </p>
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Test Details</h3>
          <p style="margin: 5px 0;"><strong>Duration:</strong> ${test.duration} minutes</p>
          ${test.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${test.description}</p>` : ''}
          ${test.scheduledDate ? `<p style="margin: 5px 0;"><strong>Scheduled Date:</strong> ${new Date(test.scheduledDate).toLocaleDateString()}</p>` : ''}
          ${test.scheduledTime ? `<p style="margin: 5px 0;"><strong>Scheduled Time:</strong> ${test.scheduledTime}</p>` : ''}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${candidateLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Start Test
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${candidateLink}" style="color: #3b82f6;">${candidateLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message from the Staff Recruitment System. Please do not reply to this email.
        </p>
      </div>
    `;

    const emailText = `
Test Invitation: ${test.title}

Dear ${user.name},

You have been invited to complete the "${test.title}" assessment as part of the recruitment process.

Duration: ${test.duration} minutes
${test.description ? `Description: ${test.description}\n` : ''}
${test.scheduledDate ? `Scheduled Date: ${new Date(test.scheduledDate).toLocaleDateString()}\n` : ''}
${test.scheduledTime ? `Scheduled Time: ${test.scheduledTime}\n` : ''}

Test Link: ${candidateLink}

This is an automated message from the Staff Recruitment System.
    `;

    if (canSendEmail && allowEmailTemplate) {
      try {
        await sendEmail(user.email, `Test Invitation: ${test.title}`, emailHtml, emailText);
      } catch (emailError) {
        console.error('Email send error (topics):', emailError);
        // Do not fail request if email fails
      }
    } else if (!canSendEmail) {
      console.log('Candidate email channel disabled; skipping email for test invitation.');
    } else if (!allowEmailTemplate) {
      console.log('Email test invitation template disabled; skipping email for test invitation.');
    }

    if (canSendSMS) {
      try {
        await sendTemplateSMS({
          templateKey: 'candidateTestInvitation',
          phoneNumber: phone,
          variables: {
            name: user.name,
            testTitle: test.title,
            duration: test.duration,
            link: candidateLink
          }
        });
      } catch (smsError) {
        console.error('SMS send error (test invitation):', smsError);
      }
    } else if (candidateSettings.sms) {
      if (!ensureSMSConfigured()) {
        console.log('SMS configuration incomplete; skipping SMS for test invitation.');
      } else if (!phone) {
        console.log('Candidate phone number missing; skipping SMS for test invitation.');
      } else if (smsTemplatesPref.testInvitation === false) {
        console.log('SMS test invitation template disabled; skipping SMS for test invitation.');
      }
    }

    res.status(201).json({
      message: 'Test generated and candidate notified successfully',
      test: {
        _id: test._id,
        title: test.title,
        testLink: test.testLink
      }
    });
  } catch (error) {
    console.error('Conduct test from topics error:', error);
    res.status(500).json({ message: error.message || 'Server error conducting test from topics' });
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
router.get('/', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const tests = await Test.find({})
      .populate('form', 'title position department formCategory formType')
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
router.put('/:id', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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
router.delete('/:id', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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
router.get('/take/:testLink', async (req, res) => {
  try {
    const { candidateId: candidateIdQuery, candidate: candidateQuery } = req.query;
    const candidateIdentifier = candidateIdQuery || candidateQuery || '';

    console.log('\n=== Test Access Request ===');
    console.log('Test Link:', req.params.testLink);
    console.log('Candidate Identifier:', candidateIdentifier || 'Not provided');

    const test = await Test.findOne({
      testLink: req.params.testLink,
      isActive: true
    }).populate('form', 'title position department');

    if (!test) {
      console.warn('✗ Test not found or inactive');
      return res.status(404).json({ message: 'Test not found or inactive' });
    }

    let candidate = null;
    let candidateTestEntry = null;
    let candidateTestIndex = -1;
    let testModified = false;

    if (candidateIdentifier) {
      if (!mongoose.Types.ObjectId.isValid(candidateIdentifier)) {
        console.warn(`⚠ Invalid candidate identifier provided: ${candidateIdentifier}`);
      } else {
        candidate = await Candidate.findById(candidateIdentifier)
          .populate('user', 'name email')
          .populate('form', 'title position department');

        if (!candidate) {
          console.warn(`⚠ Candidate ${candidateIdentifier} not found for test ${test._id}`);
        } else {
          candidateTestIndex = test.candidates.findIndex(
            entry => entry.candidate?.toString() === candidate._id.toString()
          );

          if (candidateTestIndex === -1) {
            console.warn(`⚠ Candidate ${candidate._id} was not assigned to test ${test._id}. Auto-assigning entry.`);
            test.candidates.push({
              candidate: candidate._id,
              status: 'started',
              invitedAt: new Date(),
              startedAt: new Date()
            });
            candidateTestIndex = test.candidates.length - 1;
            testModified = true;
          }

          candidateTestEntry = test.candidates[candidateTestIndex];

          if (candidateTestEntry.status === 'completed') {
            console.warn('⚠ Test already completed by candidate. Providing read-only view.');
          } else if (candidateTestEntry.status === 'expired') {
            console.warn('⚠ Test expired for candidate.');
            return res.status(400).json({ message: 'This test has expired' });
          } else {
            if (candidateTestEntry.status !== 'started') {
              candidateTestEntry.status = 'started';
              testModified = true;
            }
            if (!candidateTestEntry.startedAt) {
              candidateTestEntry.startedAt = new Date();
              testModified = true;
            }
          }
        }
      }
    } else {
      console.warn('⚠ No candidate identifier provided. Results will not be attributed to a profile.');
    }

    if (testModified) {
      await test.save();
    }

    console.log('✓ Test access granted');
    console.log('Candidate:', candidate ? `${candidate.user?.name} (${candidate.user?.email})` : 'Anonymous');
    console.log('Candidate Test Status:', candidateTestEntry?.status || 'N/A');
    console.log('===================================\n');

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
      scheduledTime: test.scheduledTime,
      candidate: candidate
        ? {
            id: candidate._id,
            name: candidate.user?.name,
            email: candidate.user?.email
          }
        : null,
      assignmentStatus: candidateTestEntry?.status || null
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
router.post('/:id/submit', async (req, res) => {
  try {
    const { answers, screenshots, startedAt, candidateId } = req.body;

    console.log('\n=== Test Submission Attempt ===');
    console.log('Test ID:', req.params.id);
    console.log('Candidate ID:', candidateId || 'Not provided');

    if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
      console.warn('✗ Submission rejected: candidateId missing or invalid.');
      return res.status(400).json({ message: 'Candidate identifier is required to submit this test.' });
    }

    const test = await Test.findById(req.params.id);

    if (!test) {
      console.warn('✗ Submission rejected: test not found.');
      return res.status(404).json({ message: 'Test not found' });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      console.warn(`✗ Submission rejected: candidate ${candidateId} not found.`);
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    let candidateTestIndex = test.candidates.findIndex(
      c => c.candidate?.toString() === candidate._id.toString()
    );

    if (candidateTestIndex === -1) {
      console.warn(`⚠ Candidate ${candidate._id} was not assigned to test ${test._id}. Auto-assigning entry.`);
      test.candidates.push({
        candidate: candidate._id,
        status: 'started',
        invitedAt: new Date(),
        startedAt: startedAt ? new Date(startedAt) : new Date()
      });
      candidateTestIndex = test.candidates.length - 1;
    }

    const candidateTestEntry = test.candidates[candidateTestIndex];

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;

    const processedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) return answer;

      let isCorrect = false;
      let marks = 0;
      const rawAnswer = answer.answer;
      const candidateAnswer = (rawAnswer === -1 || rawAnswer === '' || rawAnswer === null || typeof rawAnswer === 'undefined')
        ? null
        : rawAnswer;

      if (question.questionType === 'mcq' || question.questionType === 'multiple_answer') {
        if (candidateAnswer === null) {
          isCorrect = false;
        } else {
          // Use the robust validation function
          isCorrect = validateMCQAnswer(candidateAnswer, question.correctAnswer, question.options);
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
        questionId: answer.questionId,
        answer: candidateAnswer,
        isCorrect,
        marks,
        timeTaken: answer.timeTaken || 0, // Time taken in seconds
        answeredAt: answer.answeredAt ? new Date(answer.answeredAt) : new Date(),
        screenshot: answer.screenshot || null // Screenshot URL if available
      };
    });

    const percentage = (totalScore / test.totalMarks) * 100;
    const passed = percentage >= test.passingPercentage;

    candidateTestEntry.status = 'completed';
    candidateTestEntry.score = totalScore;
    candidateTestEntry.percentage = percentage;
    candidateTestEntry.completedAt = new Date();
    candidateTestEntry.startedAt = candidateTestEntry.startedAt || (startedAt ? new Date(startedAt) : new Date());

    await test.save();

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
      startedAt: startedAt ? new Date(startedAt) : candidateTestEntry.startedAt || new Date(),
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

    console.log(`[TEST SUBMIT] Candidate ${candidate._id} completed test ${test._id}`);
    console.log(`Answered: ${processedAnswers.length}/${test.questions.length}`);
    console.log(`Score: ${totalScore}/${test.totalMarks} (${percentage.toFixed(2)}%) Status: ${passed ? 'passed' : 'failed'}`);
    console.log('===================================\n');

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
router.post('/:id/assign', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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
router.get('/:testId/results/:candidateId', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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
router.get('/:id/results', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate({
        path: 'candidates.candidate',
        populate: [
          {
            path: 'user',
            select: 'name email'
          },
          {
            path: 'form',
            select: 'title position department formCategory formType'
          }
        ]
      })
      .populate('form', 'title position department formCategory formType');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const results = test.candidates
      .filter(c => c.status === 'completed')
      .map(c => {
        const candidateForm = c.candidate.form && typeof c.candidate.form === 'object'
          ? {
              _id: c.candidate.form._id,
              title: c.candidate.form.title,
              position: c.candidate.form.position,
              department: c.candidate.form.department,
              formCategory: c.candidate.form.formCategory,
              formType: c.candidate.form.formType
            }
          : null;

        const candidateStatus = c.candidate.status || null;
        const candidateFinalDecision = c.candidate.finalDecision?.decision || null;

        return {
          candidate: {
            _id: c.candidate._id,
            name: c.candidate.user?.name || 'Unknown',
            email: c.candidate.user?.email || 'Unknown',
            form: candidateForm,
            status: candidateStatus,
            finalDecision: candidateFinalDecision
          },
          score: c.score,
          percentage: c.percentage,
          completedAt: c.completedAt,
          passed: c.percentage >= test.passingPercentage,
          suggestNextRound: c.percentage >= (test.cutoffPercentage || test.passingPercentage)
        };
      })
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
router.post('/:id/suggest-next-round', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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
router.post('/conduct-from-csv', authenticateToken, requireSuperAdminOrPermission('tests.manage'), upload.single('csvFile'), async (req, res) => {
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
    const phone = (user.profile?.phone || '').trim();

    const notificationSettings = await NotificationSettings.getGlobalSettings();
    const candidateSettings = notificationSettings?.candidate || {};
    const templatePrefs = candidateSettings.templates || {};
    const emailTemplates = templatePrefs.email || {};
    const smsTemplatesPref = templatePrefs.sms || {};

    const canSendEmail = candidateSettings.email !== false;
    const allowEmailTemplate = emailTemplates.testInvitation !== false;
    const canSendSMS = Boolean(
      candidateSettings.sms &&
      ensureSMSConfigured() &&
      phone &&
      smsTemplatesPref.testInvitation !== false
    );

    console.log('[NOTIFY] Candidate test invitation preferences (CSV)', {
      candidateEmail: user.email,
      candidateName: user.name,
      emailChannelEnabled: canSendEmail,
      emailTemplateEnabled: allowEmailTemplate,
      smsChannelEnabled: candidateSettings.sms !== false,
      smsTemplateEnabled: smsTemplatesPref.testInvitation !== false,
      phonePresent: Boolean(phone),
    });

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
          const baseTestLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/test/${test.testLink}`;
          const candidateLink = `${baseTestLink}?candidate=${candidateId.toString()}`;

          // Log test details for debugging
          console.log('\n=== Test Created Successfully ===');
          console.log(`Test ID: ${test._id}`);
          console.log(`Test Title: ${test.title}`);
          console.log(`Test Link: ${candidateLink}`);
          console.log(`Candidate: ${user.name} (${user.email})`);
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
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${candidateLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Start Test
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${candidateLink}" style="color: #3b82f6;">${candidateLink}</a>
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

Test Link: ${candidateLink}

This is an automated message from the Faculty Recruitment System.
            `;

          if (canSendEmail && allowEmailTemplate) {
            try {
              await sendEmail(user.email, `Test Invitation: ${test.title}`, emailHtml, emailText);
            } catch (emailError) {
              console.error('Email send error:', emailError);
              // Don't fail the request if email fails
            }
          } else if (!canSendEmail) {
            console.log('Candidate email channel disabled; skipping email for CSV test invitation.');
          } else if (!allowEmailTemplate) {
            console.log('Email test invitation template disabled; skipping email for CSV test invitation.');
          }

          if (canSendSMS) {
            try {
              await sendTemplateSMS({
                templateKey: 'candidateTestInvitation',
                phoneNumber: phone,
                variables: {
                  name: user.name,
                  testTitle: test.title,
                  duration: test.duration,
                  link: candidateLink
                }
              });
            } catch (smsError) {
              console.error('SMS send error (CSV test invitation):', smsError);
            }
          } else if (candidateSettings.sms) {
            if (!ensureSMSConfigured()) {
              console.log('SMS configuration incomplete; skipping SMS for CSV test invitation.');
            } else if (!phone) {
              console.log('Candidate phone number missing; skipping SMS for CSV test invitation.');
            } else if (smsTemplatesPref.testInvitation === false) {
              console.log('SMS test invitation template disabled; skipping SMS for CSV test invitation.');
            }
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
router.post('/:id/release-results', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
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
    const phone = (user.profile?.phone || '').trim();

    const notificationSettings = await NotificationSettings.getGlobalSettings();
    const candidateSettings = notificationSettings?.candidate || {};
    const templatePrefs = candidateSettings.templates || {};
    const emailTemplates = templatePrefs.email || {};
    const smsTemplatesPref = templatePrefs.sms || {};

    const emailChannelEnabled = candidateSettings.email !== false;
    const smsChannelEnabled = Boolean(candidateSettings.sms && ensureSMSConfigured() && phone);

    const allowEmailPass = emailTemplates.testResultsPassed !== false;
    const allowEmailFail = emailTemplates.testResultsNotSelected !== false;
    const allowEmailSchedule = emailTemplates.interviewScheduleUpdate !== false;
    const allowSmsResult = smsTemplatesPref.testResultStatus !== false;
    const allowSmsSchedule = smsTemplatesPref.interviewScheduleUpdate !== false;

    console.log('[NOTIFY] Test result announcement preferences', {
      candidateEmail: user.email,
      candidateName: user.name,
      emailChannelEnabled,
      emailTemplates: {
        testResultsPassed: allowEmailPass,
        testResultsNotSelected: allowEmailFail,
        interviewScheduleUpdate: allowEmailSchedule,
      },
      smsChannelEnabled: candidateSettings.sms !== false,
      smsTemplates: {
        testResultStatus: allowSmsResult,
        interviewScheduleUpdate: allowSmsSchedule,
      },
      phonePresent: Boolean(phone),
      promote,
    });

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

      if (emailChannelEnabled && allowEmailPass) {
        try {
          await sendEmail(user.email, `Test Results: ${test.title}`, emailHtml, emailText);
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }
      } else if (!emailChannelEnabled) {
        console.log('Candidate email channel disabled; skipping email for test promotion.');
      } else if (!allowEmailPass) {
        console.log('Email test results (passed) template disabled; skipping email for test promotion.');
      }

      if (smsChannelEnabled && allowSmsResult) {
        try {
          await sendTemplateSMS({
            templateKey: 'candidateTestResult',
            phoneNumber: phone,
            variables: {
              name: user.name,
              testTitle: test.title,
              status: 'Selected',
              percentage: (candidateTest.percentage?.toFixed(1) || 0),
            }
          });

          if (interviewDate && allowSmsSchedule) {
            await sendTemplateSMS({
              templateKey: 'candidateInterviewSchedule',
              phoneNumber: phone,
              variables: {
                name: user.name,
                position: candidate.form?.position || candidate.form?.title || test.title,
                date: new Date(interviewDate).toLocaleDateString(),
                time: interviewTime || 'TBD',
                mode: 'Interview scheduled',
              }
            });
          } else if (interviewDate && !allowSmsSchedule) {
            console.log('SMS interview schedule template disabled; skipping interview schedule SMS.');
          }
        } catch (smsError) {
          console.error('SMS send error (test promotion):', smsError);
        }
      } else if (candidateSettings.sms) {
        if (!ensureSMSConfigured()) {
          console.log('SMS configuration incomplete; skipping SMS for test promotion.');
        } else if (!phone) {
          console.log('Candidate phone number missing; skipping SMS for test promotion.');
        } else if (!allowSmsResult) {
          console.log('SMS test result template disabled; skipping SMS for test promotion.');
        }
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

      if (emailChannelEnabled && allowEmailFail) {
        try {
          await sendEmail(user.email, `Test Results: ${test.title}`, emailHtml, emailText);
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }
      } else if (!emailChannelEnabled) {
        console.log('Candidate email channel disabled; skipping email for test rejection.');
      } else if (!allowEmailFail) {
        console.log('Email test results (not selected) template disabled; skipping email for test rejection.');
      }

      if (smsChannelEnabled && allowSmsResult) {
        try {
          await sendTemplateSMS({
            templateKey: 'candidateTestResult',
            phoneNumber: phone,
            variables: {
              name: user.name,
              testTitle: test.title,
              status: 'Not Selected',
              percentage: (candidateTest.percentage?.toFixed(1) || 0),
            }
          });
        } catch (smsError) {
          console.error('SMS send error (test rejection):', smsError);
        }
      } else if (candidateSettings.sms) {
        if (!ensureSMSConfigured()) {
          console.log('SMS configuration incomplete; skipping SMS for test rejection.');
        } else if (!phone) {
          console.log('Candidate phone number missing; skipping SMS for test rejection.');
        } else if (!allowSmsResult) {
          console.log('SMS test result template disabled; skipping SMS for test rejection.');
        }
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
