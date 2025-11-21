const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const Test = require('../models/Test');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const QuestionBank = require('../models/QuestionBank');
const QuestionTopic = require('../models/QuestionTopic');
const PreviousPaper = require('../models/PreviousPaper');
const Interview = require('../models/Interview');
const NotificationSettings = require('../models/NotificationSettings');
const { authenticateToken, requireSuperAdminOrPermission, getCampusFilter } = require('../middleware/auth');
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
      campus,
      department,
      set,
      page = 1,
      limit = 20,
      includeInactive
    } = req.query;

    const filter = {};
    const campusFilter = getCampusFilter(req.user);

    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    // Apply campus filter if user has campus restriction
    if (campusFilter.campus) {
      filter.campus = campusFilter.campus;
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

    if (campus && campus !== 'all') {
      filter.campus = campus;
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (set && set !== 'all') {
      filter.set = set;
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

router.get('/questions/filters', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { campus, department } = req.query;
    const campusFilter = getCampusFilter(req.user);
    
    const filter = { isActive: true };
    
    // Apply campus filter if user has campus restriction (overrides query param)
    if (campusFilter.campus) {
      filter.campus = campusFilter.campus;
    } else if (campus && campus !== 'all') {
      filter.campus = campus;
    }
    
    if (department && department !== 'all') {
      filter.department = department;
    }

    // Get unique campuses
    const campuses = await QuestionBank.distinct('campus', { ...filter, campus: { $exists: true, $ne: null, $ne: '' } });
    
    // Get unique departments (optionally filtered by campus)
    const departments = await QuestionBank.distinct('department', { ...filter, department: { $exists: true, $ne: null, $ne: '' } });
    
    // Get unique sets (optionally filtered by campus and department)
    const sets = await QuestionBank.distinct('set', { ...filter, set: { $exists: true, $ne: null, $ne: '' } });
    
    // Get unique topics (optionally filtered by campus and department)
    const topicIds = await QuestionBank.distinct('topic', filter);
    const topics = await QuestionTopic.find({ _id: { $in: topicIds }, isActive: true })
      .select('_id name category')
      .lean();

    res.json({
      campuses: campuses.filter(c => c).sort(),
      departments: departments.filter(d => d).sort(),
      sets: sets.filter(s => s).sort(),
      topics
    });
  } catch (error) {
    console.error('Question filters fetch error:', error);
    res.status(500).json({ message: 'Server error fetching question filters' });
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

// Helper function to normalize question text for duplicate detection
const normalizeQuestionText = (text) => {
  if (!text) return '';
  return text.toString().trim().toLowerCase().replace(/\s+/g, ' ');
};

// Helper function to validate and detect duplicates in questions
const validateAndDetectDuplicates = async (questionsToInsert, category, campus = null, department = null, set = null) => {
  const errors = [];
  const duplicates = [];
  const validQuestions = [];
  const seenInBatch = new Map(); // Track questions within the batch

  // First pass: validate and check for duplicates within the batch
  questionsToInsert.forEach((question, index) => {
    const rowNumber = index + 1;
    const normalizedText = normalizeQuestionText(question.questionText);

    // Validation checks
    if (!question.questionText || !question.questionText.trim()) {
      errors.push(`Row ${rowNumber}: Question text is empty`);
      return;
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`Row ${rowNumber}: At least two answer options are required`);
      return;
    }

    if (question.correctAnswer === null || question.correctAnswer === undefined) {
      errors.push(`Row ${rowNumber}: Correct answer is required`);
      return;
    }

    // Check for duplicates within the batch
    if (seenInBatch.has(normalizedText)) {
      const duplicateInfo = seenInBatch.get(normalizedText);
      duplicates.push({
        row: rowNumber,
        questionText: question.questionText.substring(0, 100) + (question.questionText.length > 100 ? '...' : ''),
        duplicateOf: duplicateInfo.row,
        reason: 'duplicate_in_batch'
      });
      return;
    }

    seenInBatch.set(normalizedText, { row: rowNumber, question });
    validQuestions.push({ question, normalizedText, originalIndex: index });
  });

  // Second pass: check for duplicates in database
  if (validQuestions.length > 0) {
    const normalizedTexts = validQuestions.map(vq => vq.normalizedText);
    
    // Build query for existing questions
    const query = {
      questionText: { $in: normalizedTexts.map(nt => new RegExp(`^${nt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
      category,
      isActive: true
    };

    // Add campus and department to query if provided
    if (campus && campus.trim()) {
      query.campus = campus.trim();
    }
    if (department && department.trim()) {
      query.department = department.trim();
    }
    // Add set to query if provided (check for duplicates within the same set)
    if (set && set.trim()) {
      query.set = set.trim();
    }

    const existingQuestions = await QuestionBank.find(query).select('questionText set').lean();

    // Create a set of existing normalized texts for quick lookup
    const existingNormalized = new Set(
      existingQuestions.map(eq => normalizeQuestionText(eq.questionText))
    );

    // Filter out questions that exist in database
    const finalValidQuestions = [];
    validQuestions.forEach(({ question, normalizedText, originalIndex }) => {
      if (existingNormalized.has(normalizedText)) {
        duplicates.push({
          row: originalIndex + 1,
          questionText: question.questionText.substring(0, 100) + (question.questionText.length > 100 ? '...' : ''),
          duplicateOf: 'existing_in_database',
          reason: 'duplicate_in_database'
        });
      } else {
        finalValidQuestions.push(question);
      }
    });

    return {
      validQuestions: finalValidQuestions,
      duplicates,
      errors
    };
  }

  return {
    validQuestions: [],
    duplicates,
    errors
  };
};

router.post('/questions/bulk-upload', authenticateToken, requireSuperAdminOrPermission('tests.manage'), upload.single('file'), async (req, res) => {
  let uploadedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    // Extract form data
    const { campus, department, category, topicId, newTopicName, set } = req.body;

    // Validate required fields
    if (!campus || !department || !category) {
      return res.status(400).json({ message: 'Campus, department, and category are required' });
    }

    // Handle topic creation or selection (topic is optional)
    let effectiveTopic = null;
    if (newTopicName && newTopicName.trim()) {
      // Create new topic
      const existingTopic = await QuestionTopic.findOne({
        name: { $regex: `^${newTopicName.trim()}$`, $options: 'i' },
        category
      });

      if (existingTopic) {
        effectiveTopic = existingTopic;
      } else {
        const newTopic = new QuestionTopic({
          name: newTopicName.trim(),
          category,
          createdBy: req.user._id
        });
        await newTopic.save();
        effectiveTopic = newTopic;
      }
    } else if (topicId) {
      // Use existing topic
      effectiveTopic = await QuestionTopic.findById(topicId);
      if (!effectiveTopic) {
        return res.status(400).json({ message: 'Selected topic not found' });
      }
      if (!effectiveTopic.isActive) {
        return res.status(400).json({ message: 'Selected topic is not active' });
      }
      if (effectiveTopic.category !== category) {
        return res.status(400).json({ message: 'Selected topic category does not match the provided category' });
      }
    }
    // If no topic provided, effectiveTopic remains null (topic is optional)

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

    console.log(`📊 [EXCEL UPLOAD] Found ${rows.length} rows in Excel file`);

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

    // If no topic provided, create or find a default topic based on category and department
    // Include set in topic name if set is provided
    if (!effectiveTopic) {
      let defaultTopicName = `${category} - ${department}`;
      if (set && set.trim()) {
        defaultTopicName = `${category} - ${department} - ${set.trim()}`;
      }
      const escapedTopicName = defaultTopicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      effectiveTopic = await QuestionTopic.findOne({
        name: { $regex: `^${escapedTopicName}$`, $options: 'i' },
        category
      });
      
      if (!effectiveTopic) {
        effectiveTopic = new QuestionTopic({
          name: defaultTopicName,
          category,
          createdBy: req.user._id
        });
        await effectiveTopic.save();
      }
    }

    const questionsToInsert = [];
    const parsingErrors = [];

    console.log(`📊 [EXCEL UPLOAD] Processing ${rows.length} rows from Excel file...`);

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // considering header row

      // Check if row is completely empty (skip empty rows)
      const hasAnyData = Object.values(row).some(val => val !== null && val !== undefined && val.toString().trim() !== '');
      if (!hasAnyData) {
        return; // Skip completely empty rows
      }

      const questionText = getCell(row, ['Question', 'question', 'Question Text']).toString().trim();
      if (!questionText) {
        parsingErrors.push(`Row ${rowNumber}: Question text is empty or missing`);
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
        parsingErrors.push(`Row ${rowNumber}: At least two answer options are required (found ${options.length})`);
        return;
      }

      const rawCorrectAnswer = getCell(row, ['CorrectAnswer', 'Correct Answer', 'Answer', 'Correct']);
      const correctAnswerIndex = determineCorrectAnswer(rawCorrectAnswer, options);

      if (correctAnswerIndex === null) {
        const answerValue = rawCorrectAnswer ? rawCorrectAnswer.toString().trim() : '(empty)';
        parsingErrors.push(`Row ${rowNumber}: Unable to determine correct answer from "${answerValue}". Please use A, B, C, D or 1, 2, 3, 4.`);
        return;
      }

      const difficulty = toLower(getCell(row, ['Difficulty', 'difficulty']));
      const explanation = getCell(row, ['Explanation', 'explanation']).toString().trim();
      const tagsValue = getCell(row, ['Tags', 'tags']).toString().trim();

      questionsToInsert.push({
        topic: effectiveTopic._id,
        topicName: effectiveTopic.name,
        category: effectiveTopic.category,
        campus: campus.trim(),
        department: department.trim(),
        set: (set && set.trim()) ? set.trim() : undefined,
        questionText,
        options,
        correctAnswer: correctAnswerIndex,
        difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
        explanation: explanation || undefined,
        tags: tagsValue ? tagsValue.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        createdBy: req.user._id
      });
    });

    console.log(`✅ [EXCEL UPLOAD] Parsed ${questionsToInsert.length} valid questions from ${rows.length} rows`);
    if (parsingErrors.length > 0) {
      console.log(`⚠️ [EXCEL UPLOAD] Found ${parsingErrors.length} parsing errors`);
    }

    // Combine parsing errors with validation errors
    if (questionsToInsert.length === 0) {
      return res.status(400).json({
        message: 'No valid questions were found in the file. Please check the file format.',
        errors: parsingErrors.length > 0 ? parsingErrors : ['No valid questions found in the uploaded file'],
        totalRows: rows.length,
        parsingErrorsCount: parsingErrors.length
      });
    }

    // Validate and detect duplicates
    console.log(`🔍 [EXCEL UPLOAD] Validating ${questionsToInsert.length} questions and checking for duplicates...`);
    const { validQuestions, duplicates, errors: validationErrors } = await validateAndDetectDuplicates(
      questionsToInsert,
      effectiveTopic.category,
      campus,
      department,
      set
    );

    console.log(`✅ [EXCEL UPLOAD] Validation complete:`);
    console.log(`   - Valid questions: ${validQuestions.length}`);
    console.log(`   - Duplicates found: ${duplicates.length}`);
    console.log(`   - Validation errors: ${validationErrors.length}`);

    // Combine all errors
    const allErrors = [...parsingErrors, ...validationErrors];

    if (validQuestions.length === 0) {
      return res.status(400).json({
        message: 'No valid questions to import after validation and duplicate removal.',
        errors: allErrors.length > 0 ? allErrors : undefined,
        duplicates: duplicates.length > 0 ? duplicates : undefined,
        totalRows: rows.length,
        totalProcessed: questionsToInsert.length,
        duplicatesCount: duplicates.length,
        parsingErrorsCount: parsingErrors.length,
        validationErrorsCount: validationErrors.length
      });
    }

    console.log(`💾 [EXCEL UPLOAD] Attempting to insert ${validQuestions.length} questions into database...`);
    
    let inserted;
    try {
      inserted = await QuestionBank.insertMany(validQuestions, { ordered: false });
      console.log(`✅ [EXCEL UPLOAD] Successfully inserted ${inserted.length} questions`);
      
      // Check if all questions were inserted
      if (inserted.length !== validQuestions.length) {
        console.warn(`⚠️ [EXCEL UPLOAD] Mismatch: Attempted to insert ${validQuestions.length}, but only ${inserted.length} were inserted`);
      }
    } catch (insertError) {
      console.error(`❌ [EXCEL UPLOAD] Error during insertMany:`, insertError);
      
      // If it's a bulk write error, extract details
      if (insertError.writeErrors && insertError.writeErrors.length > 0) {
        const failedCount = insertError.writeErrors.length;
        const insertedCount = insertError.insertedCount || 0;
        console.error(`❌ [EXCEL UPLOAD] ${failedCount} questions failed to insert, ${insertedCount} succeeded`);
        insertError.writeErrors.forEach((err, idx) => {
          console.error(`   Error ${idx + 1}:`, err.errmsg || err.err);
        });
        
        // Return partial success
        return res.status(207).json({
          message: `Partial upload completed. ${insertedCount} question(s) imported, ${failedCount} failed.`,
          insertedCount: insertedCount,
          failedCount: failedCount,
          skippedCount: allErrors.length + duplicates.length,
          duplicatesCount: duplicates.length,
          parsingErrorsCount: parsingErrors.length,
          validationErrorsCount: validationErrors.length,
          totalRows: rows.length,
          totalProcessed: questionsToInsert.length,
          errors: allErrors.length > 0 ? allErrors : undefined,
          duplicates: duplicates.length > 0 ? duplicates : undefined,
          insertErrors: insertError.writeErrors.map(e => e.errmsg || e.err)
        });
      }
      
      throw insertError; // Re-throw if not a bulk write error
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} question(s) from ${rows.length} rows.`,
      summary: {
        totalRows: rows.length,
        successfullyImported: inserted.length,
        duplicatesRemoved: duplicates.length,
        errorsFound: allErrors.length,
        skippedTotal: allErrors.length + duplicates.length
      },
      details: {
        duplicates: duplicates.length > 0 ? duplicates.map(dup => ({
          row: dup.row,
          questionText: dup.questionText,
          reason: dup.reason === 'duplicate_in_batch' 
            ? `Duplicate of row ${dup.duplicateOf} in the same file`
            : 'Already exists in database',
          duplicateOf: dup.duplicateOf
        })) : [],
        errors: allErrors.length > 0 ? allErrors : []
      }
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

// Helper function to parse questions from text content
const parseQuestionsFromText = (textContent, questionNumber = 0) => {
  console.log('\n📝 [QUESTION PARSER] Starting to parse questions from text...');
  console.log(`📝 [QUESTION PARSER] Text length: ${textContent.length} characters`);
  
  // Normalize line breaks - handle different line break formats
  let normalizedText = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // First, ensure question numbers are on separate lines
  // Pattern: number followed by colon (e.g., "51:", "52:")
  normalizedText = normalizedText.replace(/(\d+):\s*/g, '\n$1: ');
  
  // For inline options within question lines, we'll handle them in the parsing logic
  // But ensure standalone option lines are properly separated
  // Pattern: text followed by space, then A-D with space (but not if it's part of a word)
  normalizedText = normalizedText.replace(/([^\n])\s+([A-D])\s+(?=[A-Z])/g, '$1\n$2 ');
  
  // Ensure "Ans:" or "answer:" is on its own line when it appears after text
  normalizedText = normalizedText.replace(/([^\n])(\s+)(Ans|answer):/gi, '$1\n$3:');
  
  // Split into lines and clean up
  let lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log(`📝 [QUESTION PARSER] Total non-empty lines after normalization: ${lines.length}`);
  
  // If still only 1 line, try splitting by common patterns
  if (lines.length === 1 && lines[0].length > 100) {
    console.log('⚠️ [QUESTION PARSER] Single long line detected, attempting alternative parsing...');
    const singleLine = lines[0];
    
    // Try to split by question numbers (e.g., "51:", "52:", etc.)
    // Match pattern: number followed by colon, then everything until next number: or end
    // Use [\s\S] to match any character including newlines
    const questionMatches = [...singleLine.matchAll(/(\d+):\s*([\s\S]*?)(?=\d+:\s*|$)/g)];
    if (questionMatches.length > 0) {
      console.log(`📝 [QUESTION PARSER] Found ${questionMatches.length} question blocks in single line`);
      lines = [];
      questionMatches.forEach((match, idx) => {
        const questionNum = match[1];
        let questionContent = match[2].trim();
        
        console.log(`   📋 Processing question #${questionNum}, content length: ${questionContent.length}`);
        
        // Add question number and text line
        // First, find where the question text ends (before first option A, B, C, or D)
        const optionMatch = questionContent.match(/\s([A-D])\s+/);
        if (optionMatch) {
          const questionText = questionContent.substring(0, optionMatch.index).trim();
          if (questionText) {
            lines.push(`${questionNum}: ${questionText}`);
          } else {
            lines.push(`${questionNum}:`);
          }
          
          // Process the remaining content (options and answer)
          const remaining = questionContent.substring(optionMatch.index).trim();
          
          // Split by option patterns: "A ", "B ", "C ", "D " followed by text until next option or "Ans:"
          // Pattern: Option letter, space, then text until next option letter+space or Ans:
          const optionPattern = /\b([A-D])\s+([^]*?)(?=\s+[A-D]\s+|Ans:|$)/gi;
          const answerPattern = /Ans:\s*(\d+|[A-D])/gi;
          
          // Extract all options - match each A, B, C, D with its content
          let lastIndex = 0;
          const optionLetters = ['A', 'B', 'C', 'D'];
          
          for (const letter of optionLetters) {
            // Match letter followed by space, then capture text until next option or Ans:
            const letterPattern = new RegExp(`\\b${letter}\\s+([\\s\\S]*?)(?=\\s+[A-D]\\s+|Ans:|$)`, 'i');
            const letterMatch = remaining.substring(lastIndex).match(letterPattern);
            if (letterMatch) {
              const optionText = letterMatch[1].trim();
              if (optionText) {
                lines.push(`${letter} ${optionText}`);
                const matchIndex = remaining.indexOf(letterMatch[0], lastIndex);
                if (matchIndex !== -1) {
                  lastIndex = matchIndex + letterMatch[0].length;
                } else {
                  break; // No more matches
                }
              }
            }
          }
          
          // Extract answer
          const answerMatch = remaining.match(answerPattern);
          if (answerMatch) {
            lines.push(`Ans: ${answerMatch[1]}`);
          }
        } else {
          // No clear option pattern, try simpler approach
          lines.push(`${questionNum}: ${questionContent}`);
        }
      });
      console.log(`📝 [QUESTION PARSER] Re-parsed into ${lines.length} lines`);
    } else {
      // Alternative: try splitting by patterns like "A ", "B ", "C ", "D ", "Ans:"
      console.log('⚠️ [QUESTION PARSER] Trying pattern-based splitting...');
      const patternSplit = singleLine
        .replace(/(\d+):\s*/g, '\n$1: ')  // Put question numbers on new lines
        .replace(/([A-D])\s+/g, '\n$1 ')  // Put options on new lines
        .replace(/(Ans:)/gi, '\n$1')      // Put answer on new line
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      
      if (patternSplit.length > lines.length) {
        lines = patternSplit;
        console.log(`📝 [QUESTION PARSER] Pattern split into ${lines.length} lines`);
      }
    }
  }
  
  const questions = [];
  const errors = [];
  let currentQuestion = null;
  let qNum = questionNumber;

  const parseAnswer = (answerText, options) => {
    if (!answerText) {
      console.log('⚠️ [ANSWER PARSER] Empty answer text');
      return null;
    }
    
    const answer = answerText.trim().toUpperCase();
    console.log(`🔍 [ANSWER PARSER] Parsing answer: "${answer}" with ${options.length} options`);
    
    // Try to parse as number (1-4)
    const numMatch = answer.match(/^(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= options.length) {
        const index = num - 1;
        console.log(`✅ [ANSWER PARSER] Parsed as number: ${num} -> index ${index} (${String.fromCharCode(65 + index)})`);
        return index;
      }
    }
    
    // Try to parse as letter (A-D)
    const letterMatch = answer.match(/^([A-D])/);
    if (letterMatch) {
      const letter = letterMatch[1];
      const index = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      if (index >= 0 && index < options.length) {
        console.log(`✅ [ANSWER PARSER] Parsed as letter: ${letter} -> index ${index}`);
        return index;
      }
    }
    
    console.log(`❌ [ANSWER PARSER] Could not parse answer: "${answer}"`);
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line starts with a question number pattern (e.g., "51:", "52:", etc.)
    const questionMatch = line.match(/^(\d+):\s*(.+)$/);
    if (questionMatch) {
      // Save previous question if exists (even if incomplete, as long as it has at least 2 options)
      if (currentQuestion) {
        // Only save if we have at least 2 options
        if (currentQuestion.options.length >= 2) {
          if (currentQuestion.correctAnswerIndex === null) {
            const errorMsg = `Question ${qNum}: No valid answer found`;
            console.log(`❌ [QUESTION PARSER] ${errorMsg}`);
            errors.push(errorMsg);
          } else {
            console.log(`✅ [QUESTION PARSER] Saving question ${qNum}: "${currentQuestion.text.substring(0, 50)}..."`);
            console.log(`   Options: ${currentQuestion.options.length}, Correct: ${String.fromCharCode(65 + currentQuestion.correctAnswerIndex)}`);
            questions.push({
              questionText: currentQuestion.text.trim(),
              options: currentQuestion.options.slice(0, 4), // Ensure max 4 options
              correctAnswer: currentQuestion.correctAnswerIndex
            });
          }
        } else {
          console.log(`⚠️ [QUESTION PARSER] Skipping incomplete question ${qNum} (only ${currentQuestion.options.length} options)`);
        }
      }
      
      // Start new question
      qNum = parseInt(questionMatch[1], 10);
      let questionText = questionMatch[2].trim();
      console.log(`\n📋 [QUESTION PARSER] Found question #${qNum}: "${questionText.substring(0, 50)}..."`);
      
      // Check if this line contains inline options
      // Options can be: "A Option1 B Option2" or "AOption1 BOption2" or "A Option1B Option2" or ": A Option1B Option2"
      // Look for pattern: letter (A-D) optionally preceded by space/punctuation, followed by text
      // First, try to find if there are option letters in the text
      const hasOptions = /(?:^|[\s:,\-])([A-D])(?:\s|$|[A-Z])/i.test(questionText);
      
      if (hasOptions) {
        // Find where first option starts - can be after colon, dash, space, or at start
        const firstOptionMatch = questionText.match(/(?:^|[\s:,\-])([A-D])(?:\s|$|[A-Z])/i);
        if (firstOptionMatch) {
          // Find the actual position of the option letter
          const firstOptionLetter = firstOptionMatch[1];
          const firstOptionIndex = questionText.indexOf(firstOptionLetter);
          const qText = questionText.substring(0, firstOptionIndex).trim();
          const remaining = questionText.substring(firstOptionIndex).trim();
          
          currentQuestion = {
            text: qText,
            options: [],
            correctAnswerIndex: null
          };
          
          // Extract options in order (A, B, C, D)
          // Handle various formats: "A Option", "AOption", "A OptionB Option", "A Option1B Option2", etc.
          // Example: "A Cross breeding B Out breeding C In breeding D Close breeding Ans: 3"
          // Or: "A Cross breedingB Out breedingC In breedingD Close breeding Ans: 3"
          
          const optionLetters = ['A', 'B', 'C', 'D'];
          let searchText = remaining;
          
          for (let i = 0; i < optionLetters.length; i++) {
            const letter = optionLetters[i];
            const nextLetter = i < optionLetters.length - 1 ? optionLetters[i + 1] : null;
            
            // Find the option letter in the remaining text
            // Pattern: letter can be at start, after space, or after punctuation (colon, dash, etc.)
            // Match: (start or space or punctuation) + letter + (space or end or next char)
            const letterStartPattern = new RegExp(`(?:^|[\\s:,\\-])${letter}(?:\\s|$|[A-Z])`, 'i');
            const letterStartMatch = searchText.match(letterStartPattern);
            
            if (!letterStartMatch) {
              console.log(`   ⚠️ [OPTION] Option ${letter} not found in: "${searchText.substring(0, 100)}..."`);
              break;
            }
            
            const letterStartIndex = letterStartMatch.index;
            // Find the actual letter position (might be after punctuation)
            const letterPos = searchText.indexOf(letter, letterStartIndex);
            const afterLetterIndex = letterPos + 1; // Position after the letter itself
            let optionText = '';
            
            if (nextLetter) {
              // Find where next option starts - search for next letter in remaining text
              // The next letter should be followed by space, end of string, or another uppercase letter
              // We'll search for the letter and check if it's a valid option marker
              const remainingText = searchText.substring(afterLetterIndex);
              let nextLetterPos = -1;
              
              // Try to find the next letter - it can be:
              // 1. At the start of remaining text: "^B "
              // 2. After a space: " B "
              // 3. After lowercase text (word boundary): "breedingB "
              // 4. After punctuation: ": B " or "- B "
              const patterns = [
                new RegExp(`^${nextLetter}(?:\\s|$|[A-Z])`, 'i'),  // At start
                new RegExp(`\\s${nextLetter}(?:\\s|$|[A-Z])`, 'i'),  // After space
                new RegExp(`[a-z]${nextLetter}(?:\\s|$|[A-Z])`, 'i'),  // After lowercase (word boundary)
                new RegExp(`[\\s:,\\-]${nextLetter}(?:\\s|$|[A-Z])`, 'i')  // After punctuation
              ];
              
              for (const pattern of patterns) {
                const match = remainingText.match(pattern);
                if (match) {
                  // Find the actual position of the letter in the match
                  const letterIndexInMatch = match[0].indexOf(nextLetter);
                  nextLetterPos = afterLetterIndex + match.index + letterIndexInMatch;
                  console.log(`   🔍 [OPTION] Found next letter ${nextLetter} at position ${nextLetterPos} (pattern matched: "${match[0]}")`);
                  break;
                }
              }
              
              if (nextLetterPos > 0) {
                // Extract text from after current letter until next letter
                optionText = searchText.substring(afterLetterIndex, nextLetterPos).trim();
                console.log(`   📝 [OPTION] Extracted text for ${letter}: "${optionText.substring(0, 50)}..."`);
                // Update search text to start from next option letter
                searchText = searchText.substring(nextLetterPos);
              } else {
                console.log(`   ⚠️ [OPTION] Next letter ${nextLetter} not found in remaining text: "${remainingText.substring(0, 80)}..."`);
                // Next letter not found, take rest until answer
                const answerMatch = remainingText.match(/(?:Ans|answer):/i);
                if (answerMatch) {
                  optionText = searchText.substring(afterLetterIndex, afterLetterIndex + answerMatch.index).trim();
                } else {
                  optionText = searchText.substring(afterLetterIndex).trim();
                }
                searchText = ''; // No more options
              }
            } else {
              // Last option - take until answer or end
              const answerMatch = searchText.substring(afterLetterIndex).match(/(?:Ans|answer):/i);
              if (answerMatch) {
                optionText = searchText.substring(afterLetterIndex, afterLetterIndex + answerMatch.index).trim();
              } else {
                optionText = searchText.substring(afterLetterIndex).trim();
              }
            }
            
            // Clean up option text
            optionText = optionText.replace(/\s*(?:Ans|answer):\s*.*$/i, '').trim();
            optionText = optionText.replace(/\s*\d+:\s*.*$/, '').trim();
            
            if (optionText && optionText.length > 0) {
              currentQuestion.options.push(optionText);
              console.log(`   ➕ [OPTION] ${letter}: ${optionText.substring(0, 40)}...`);
            } else {
              console.log(`   ⚠️ [OPTION] Empty option text for ${letter}`);
            }
          }
          
          // Extract answer - look for "Ans:" or "answer:" followed by number or letter
          const answerMatch = remaining.match(/(?:Ans|answer):\s*(\d+|[A-D])/i);
          if (answerMatch) {
            const answerValue = answerMatch[1].trim();
            const answerIndex = parseAnswer(answerValue, currentQuestion.options);
            if (answerIndex !== null) {
              currentQuestion.correctAnswerIndex = answerIndex;
              console.log(`   ✅ [ANSWER] Set correct answer: ${String.fromCharCode(65 + answerIndex)} (from "${answerValue}")`);
            } else {
              console.log(`   ⚠️ [ANSWER] Could not parse answer: "${answerValue}"`);
            }
          } else if (currentQuestion.options.length >= 2) {
            // If no explicit answer found but we have options, log warning
            console.log(`   ⚠️ [ANSWER] No answer found for question ${qNum}`);
          }
        } else {
          // No clear option pattern found, treat as question text only
          currentQuestion = {
            text: questionText,
            options: [],
            correctAnswerIndex: null
          };
        }
      } else {
        // Just question text, options will come on subsequent lines
        currentQuestion = {
          text: questionText,
          options: [],
          correctAnswerIndex: null
        };
      }
    } else if (line.match(/^[A-D]\s+/)) {
      // Option line (A, B, C, or D) - only add if we have a current question and less than 4 options
      if (currentQuestion) {
        if (currentQuestion.options.length < 4) {
          const optionMatch = line.match(/^([A-D])\s+(.+)$/);
          if (optionMatch) {
            const optionLetter = optionMatch[1];
            const optionText = optionMatch[2].trim();
            
            // Check if this option letter matches expected sequence (A, B, C, D)
            const expectedIndex = currentQuestion.options.length;
            const expectedLetter = String.fromCharCode(65 + expectedIndex); // A=0, B=1, C=2, D=3
            
            if (optionLetter === expectedLetter) {
              currentQuestion.options.push(optionText);
              console.log(`   ➕ [OPTION] ${optionLetter}: ${optionText.substring(0, 40)}...`);
            } else {
              // Option letter doesn't match expected sequence - might be start of new question
              console.log(`   ⚠️ [OPTION] Unexpected option letter ${optionLetter} (expected ${expectedLetter}), might be new question`);
              // If we already have 4 options, this might be a new question starting
              if (currentQuestion.options.length >= 4) {
                // Save current question and start new one
                if (currentQuestion.correctAnswerIndex !== null) {
                  questions.push({
                    questionText: currentQuestion.text.trim(),
                    options: currentQuestion.options,
                    correctAnswer: currentQuestion.correctAnswerIndex
                  });
                  console.log(`✅ [QUESTION PARSER] Saved question ${qNum} before new option`);
                }
                // Don't start new question here, wait for question number
                currentQuestion = null;
              }
            }
          }
        } else {
          // Already have 4 options - this might be from next question
          console.log(`   ⚠️ [OPTION] Already have 4 options, ignoring: ${line.substring(0, 30)}...`);
        }
      } else {
        // Option found without a question
        console.log(`   ⚠️ [OPTION] Found option without question: ${line.substring(0, 30)}...`);
      }
    } else if (line.match(/^(?:Ans|answer):/i)) {
      // Answer line - handle various formats: "Ans:", "answer:", "Ans ", etc.
      if (currentQuestion) {
        const answerMatch = line.match(/(?:Ans|answer):\s*(.+)$/i);
        if (answerMatch) {
          const answerIndex = parseAnswer(answerMatch[1], currentQuestion.options);
          if (answerIndex !== null) {
            currentQuestion.correctAnswerIndex = answerIndex;
            console.log(`   ✅ [ANSWER] Set correct answer: ${String.fromCharCode(65 + answerIndex)}`);
          } else {
            const errorMsg = `Question ${qNum || 'unknown'}: Invalid answer format - "${answerMatch[1]}"`;
            console.log(`   ❌ [ANSWER] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }
    } else if (currentQuestion) {
      // Check if this line might be continuation of question text or contains answer
      // Only continue if we don't have 4 options yet and line doesn't look like an option or question number
      if (currentQuestion.options.length < 4 && !line.match(/^[A-D]\s+/) && !line.match(/^\d+:\s*/)) {
        // Check if line contains answer
        const answerMatch = line.match(/(?:Ans|answer):\s*(\d+|[A-D])/i);
        if (answerMatch) {
          const answerIndex = parseAnswer(answerMatch[1], currentQuestion.options);
          if (answerIndex !== null) {
            currentQuestion.correctAnswerIndex = answerIndex;
            console.log(`   ✅ [ANSWER] Set correct answer: ${String.fromCharCode(65 + answerIndex)}`);
          }
        } else if (currentQuestion.text && currentQuestion.text.length < 300 && !line.match(/^\d+/)) {
          // Only extend question text if:
          // - Not too long (to avoid capturing next question)
          // - Line doesn't start with a number (might be next question)
          currentQuestion.text += ' ' + line;
          console.log(`   📝 [CONTINUATION] Question text extended`);
        }
      } else if (currentQuestion.options.length >= 4 && !currentQuestion.correctAnswerIndex) {
        // We have 4 options but no answer yet - check if this line has answer
        const answerMatch = line.match(/(?:Ans|answer):\s*(\d+|[A-D])/i);
        if (answerMatch) {
          const answerIndex = parseAnswer(answerMatch[1], currentQuestion.options);
          if (answerIndex !== null) {
            currentQuestion.correctAnswerIndex = answerIndex;
            console.log(`   ✅ [ANSWER] Set correct answer: ${String.fromCharCode(65 + answerIndex)}`);
          }
        }
      }
    } else if (!currentQuestion && line.trim().length > 10 && !line.match(/^\d+:\s*/)) {
      // Question without number prefix - only if line is substantial and doesn't start with number
      qNum++;
      console.log(`\n📋 [QUESTION PARSER] Found question #${qNum} (no number): "${line.substring(0, 50)}..."`);
      currentQuestion = {
        text: line,
        options: [],
        correctAnswerIndex: null
      };
    }
  }

  // Save last question
  if (currentQuestion && currentQuestion.options.length >= 2) {
    if (currentQuestion.correctAnswerIndex === null) {
      const errorMsg = `Question ${qNum}: No valid answer found`;
      console.log(`❌ [QUESTION PARSER] ${errorMsg}`);
      errors.push(errorMsg);
    } else {
      console.log(`✅ [QUESTION PARSER] Saving final question ${qNum}: "${currentQuestion.text.substring(0, 50)}..."`);
      questions.push({
        questionText: currentQuestion.text.trim(),
        options: currentQuestion.options.slice(0, 4), // Ensure max 4 options
        correctAnswer: currentQuestion.correctAnswerIndex
      });
    }
  }

  console.log(`\n📊 [QUESTION PARSER] Parsing complete:`);
  console.log(`   ✅ Valid questions: ${questions.length}`);
  console.log(`   ❌ Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log(`   Error details:`, errors);
  }

  return { questions, errors };
};

// Preview questions from Word document (without saving)
router.post('/questions/preview-word', authenticateToken, requireSuperAdminOrPermission('tests.manage'), upload.single('file'), async (req, res) => {
  let uploadedFilePath;

  try {
    console.log('\n🔍 [PREVIEW] Word document preview request received');
    
    if (!req.file) {
      return res.status(400).json({ message: 'Word file is required' });
    }

    // Check file extension
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    console.log(`📄 [PREVIEW] File: ${req.file.originalname}, Extension: ${fileExt}`);
    
    if (fileExt !== '.docx' && fileExt !== '.doc') {
      return res.status(400).json({ message: 'Only .docx and .doc files are supported' });
    }

    uploadedFilePath = req.file.path;

    // Extract text from Word document
    let textContent;
    try {
      if (fileExt === '.docx') {
        console.log('📖 [PREVIEW] Extracting text from .docx file...');
        const result = await mammoth.extractRawText({ path: uploadedFilePath });
        textContent = result.value;
        console.log(`✅ [PREVIEW] Text extracted successfully (${textContent.length} characters)`);
      } else {
        return res.status(400).json({ message: '.doc files are not supported. Please convert to .docx format.' });
      }
    } catch (parseError) {
      console.error('❌ [PREVIEW] Word file parsing error:', parseError);
      return res.status(400).json({ message: 'Failed to parse Word document. Please ensure it is a valid .docx file.' });
    }

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ message: 'Word document appears to be empty' });
    }

    // Parse questions
    const { questions, errors } = parseQuestionsFromText(textContent);

    res.json({
      questions,
      errors: errors.length > 0 ? errors : undefined,
      message: `Preview: ${questions.length} question(s) parsed${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    });
  } catch (error) {
    console.error('❌ [PREVIEW] Preview error:', error);
    res.status(500).json({ message: 'Server error processing preview' });
  } finally {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('🧹 [PREVIEW] Cleaned up uploaded file');
      } catch (cleanupError) {
        console.warn('⚠️ [PREVIEW] Failed to remove uploaded file:', cleanupError.message);
      }
    }
  }
});

// Bulk upload questions from Word document
router.post('/questions/bulk-upload-word', authenticateToken, requireSuperAdminOrPermission('tests.manage'), upload.single('file'), async (req, res) => {
  let uploadedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Word file is required' });
    }

    // Extract form data
    const { campus, department, category, topicId, newTopicName, set } = req.body;

    // Validate required fields
    if (!campus || !department || !category) {
      return res.status(400).json({ message: 'Campus, department, and category are required' });
    }

    // Check file extension
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (fileExt !== '.docx' && fileExt !== '.doc') {
      return res.status(400).json({ message: 'Only .docx and .doc files are supported' });
    }

    uploadedFilePath = req.file.path;
    console.log('\n📤 [UPLOAD] Word document upload request received');
    console.log(`📄 [UPLOAD] File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    console.log(`📋 [UPLOAD] Campus: ${campus}, Department: ${department}, Category: ${category}`);

    // Extract text from Word document
    let textContent;
    try {
      if (fileExt === '.docx') {
        console.log('📖 [UPLOAD] Extracting text from .docx file...');
        const result = await mammoth.extractRawText({ path: uploadedFilePath });
        textContent = result.value;
        console.log(`✅ [UPLOAD] Text extracted successfully (${textContent.length} characters)`);
      } else {
        return res.status(400).json({ message: '.doc files are not supported. Please convert to .docx format.' });
      }
    } catch (parseError) {
      console.error('❌ [UPLOAD] Word file parsing error:', parseError);
      return res.status(400).json({ message: 'Failed to parse Word document. Please ensure it is a valid .docx file.' });
    }

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ message: 'Word document appears to be empty' });
    }

    // Handle topic creation or selection (topic is optional)
    let effectiveTopic = null;
    console.log('🏷️ [UPLOAD] Processing topic...');
    if (newTopicName && newTopicName.trim()) {
      console.log(`   📝 [TOPIC] Creating/finding topic: "${newTopicName}"`);
      // Create new topic
      const existingTopic = await QuestionTopic.findOne({
        name: { $regex: `^${newTopicName.trim()}$`, $options: 'i' },
        category
      });

      if (existingTopic) {
        effectiveTopic = existingTopic;
        console.log(`   ✅ [TOPIC] Found existing topic: ${existingTopic._id}`);
      } else {
        const newTopic = new QuestionTopic({
          name: newTopicName.trim(),
          category,
          createdBy: req.user._id
        });
        await newTopic.save();
        effectiveTopic = newTopic;
        console.log(`   ✅ [TOPIC] Created new topic: ${newTopic._id}`);
      }
    } else if (topicId) {
      console.log(`   📝 [TOPIC] Using existing topic ID: ${topicId}`);
      // Use existing topic
      effectiveTopic = await QuestionTopic.findById(topicId);
      if (!effectiveTopic) {
        return res.status(400).json({ message: 'Selected topic not found' });
      }
      if (!effectiveTopic.isActive) {
        return res.status(400).json({ message: 'Selected topic is not active' });
      }
      if (effectiveTopic.category !== category) {
        return res.status(400).json({ message: 'Selected topic category does not match the provided category' });
      }
      console.log(`   ✅ [TOPIC] Using topic: ${effectiveTopic.name}`);
    }

    // If no topic provided, create or find a default topic based on category and department
    // Include set in topic name if set is provided
    if (!effectiveTopic) {
      let defaultTopicName = `${category} - ${department}`;
      if (set && set.trim()) {
        defaultTopicName = `${category} - ${department} - ${set.trim()}`;
      }
      console.log(`   📝 [TOPIC] Creating/finding default topic: "${defaultTopicName}"`);
      const escapedTopicName = defaultTopicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      effectiveTopic = await QuestionTopic.findOne({
        name: { $regex: `^${escapedTopicName}$`, $options: 'i' },
        category
      });
      
      if (!effectiveTopic) {
        effectiveTopic = new QuestionTopic({
          name: defaultTopicName,
          category,
          createdBy: req.user._id
        });
        await effectiveTopic.save();
        console.log(`   ✅ [TOPIC] Created default topic: ${effectiveTopic._id}`);
      } else {
        console.log(`   ✅ [TOPIC] Found existing default topic: ${effectiveTopic._id}`);
      }
    }

    // Parse text content
    console.log('\n📝 [UPLOAD] Starting question parsing...');
    const { questions: parsedQuestions, errors: parseErrors } = parseQuestionsFromText(textContent);
    
    // Prepare questions for insertion
    const questionsToInsert = parsedQuestions.map(q => ({
      topic: effectiveTopic._id,
      topicName: effectiveTopic.name,
      category: effectiveTopic.category,
      campus: campus.trim(),
      department: department.trim(),
      set: (set && set.trim()) ? set.trim() : undefined,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: 'medium',
      createdBy: req.user._id
    }));
    
    console.log(`\n💾 [UPLOAD] Prepared ${questionsToInsert.length} questions for database insertion`);

    if (questionsToInsert.length === 0) {
      console.log('❌ [UPLOAD] No questions to insert');
      return res.status(400).json({
        message: 'No questions were parsed. Please check the format.',
        errors: parseErrors.length > 0 ? parseErrors : ['No valid questions found in the text']
      });
    }

    // Validate and detect duplicates
    console.log('🔍 [UPLOAD] Validating questions and checking for duplicates...');
    const { validQuestions, duplicates, errors: validationErrors } = await validateAndDetectDuplicates(
      questionsToInsert,
      effectiveTopic.category,
      campus,
      department,
      set
    );

    // Combine parse errors with validation errors
    const allErrors = [...parseErrors, ...validationErrors];

    if (validQuestions.length === 0) {
      console.log('❌ [UPLOAD] No valid questions after validation and duplicate removal');
      return res.status(400).json({
        message: 'No valid questions to import after validation and duplicate removal.',
        errors: allErrors.length > 0 ? allErrors : undefined,
        duplicates: duplicates.length > 0 ? duplicates : undefined,
        totalProcessed: questionsToInsert.length,
        duplicatesCount: duplicates.length,
        errorsCount: allErrors.length
      });
    }

    console.log(`💾 [UPLOAD] Inserting ${validQuestions.length} questions into database...`);
    console.log(`📊 [UPLOAD] Summary: ${validQuestions.length} valid, ${duplicates.length} duplicates, ${allErrors.length} errors`);
    const inserted = await QuestionBank.insertMany(validQuestions, { ordered: false });
    console.log(`✅ [UPLOAD] Successfully inserted ${inserted.length} questions`);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} question(s) from Word document.`,
      summary: {
        totalRows: questionsToInsert.length,
        successfullyImported: inserted.length,
        duplicatesRemoved: duplicates.length,
        errorsFound: allErrors.length,
        skippedTotal: allErrors.length + duplicates.length
      },
      details: {
        duplicates: duplicates.length > 0 ? duplicates.map(dup => ({
          row: dup.row,
          questionText: dup.questionText,
          reason: dup.reason === 'duplicate_in_batch' 
            ? `Duplicate of row ${dup.duplicateOf} in the same file`
            : 'Already exists in database',
          duplicateOf: dup.duplicateOf
        })) : [],
        errors: allErrors.length > 0 ? allErrors : []
      }
    });
  } catch (error) {
    console.error('❌ [UPLOAD] Bulk Word upload error:', error);
    res.status(500).json({ message: 'Server error processing bulk Word upload' });
  } finally {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('🧹 [UPLOAD] Cleaned up uploaded file');
      } catch (cleanupError) {
        console.warn('⚠️ [UPLOAD] Failed to remove uploaded file:', cleanupError.message);
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

    // Check for duplicate question
    const normalizedQuestionText = normalizeQuestionText(questionText);
    const duplicateQuery = {
      questionText: new RegExp(`^${normalizedQuestionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      category: topic.category,
      isActive: true
    };

    // Optionally check campus and department if provided in request
    const { campus, department } = req.body;
    if (campus && campus.trim()) {
      duplicateQuery.campus = campus.trim();
    }
    if (department && department.trim()) {
      duplicateQuery.department = department.trim();
    }

    const existingQuestion = await QuestionBank.findOne(duplicateQuery);
    if (existingQuestion) {
      return res.status(409).json({
        message: 'Duplicate question detected',
        duplicate: {
          questionText: existingQuestion.questionText.substring(0, 100) + (existingQuestion.questionText.length > 100 ? '...' : ''),
          id: existingQuestion._id,
          topic: existingQuestion.topicName,
          category: existingQuestion.category,
          reason: 'duplicate_in_database'
        }
      });
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
      campus: campus ? campus.trim() : undefined,
      department: department ? department.trim() : undefined,
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
        // Handle both 0-indexed (0, 1, 2, 3) and 1-indexed (1, 2, 3, 4) numbers
        // Mapping: 1-indexed -> 0-indexed
        //   1 -> A (index 0)
        //   2 -> B (index 1)
        //   3 -> C (index 2)
        //   4 -> D (index 3)
        // Note: Frontend sends 0-indexed (0, 1, 2, 3), so we only convert when clearly 1-indexed
        const indices = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        const normalizedIndices = indices.map(index => {
          // If index equals options.length, it's definitely 1-indexed (last option)
          // Example: index 4 with 4 options means D (1-indexed), convert to 3 (0-indexed)
          if (index === options.length) {
            return index - 1; // Convert 1-indexed to 0-indexed
          }
          
          // If index is in valid 0-indexed range [0, options.length-1], use as-is
          // This handles frontend sends (0, 1, 2, 3) and also 1-indexed values that
          // are in the ambiguous range (1, 2, 3) - we'll assume they're 0-indexed
          // to maintain compatibility with frontend
          if (index >= 0 && index < options.length) {
            return index;
          }
          
          // If index is > options.length, it might be 1-indexed
          // Example: index 5 with 4 options - invalid, but could be user error
          // We'll try to convert if it's in reasonable range
          if (index > options.length && index <= options.length + 1) {
            // Might be 1-indexed value that's slightly out of range
            return index - 1;
          }
          
          // Invalid index - return as-is (will be caught by validation)
          return index;
        });
        
        // Validate normalized indices
        if (normalizedIndices.some(index => index < 0 || index >= options.length)) {
          return res.status(400).json({ 
            message: `Correct answer index out of bounds. Valid range: 0-${options.length - 1} (0-indexed) or 1-${options.length} (1-indexed). Received: ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}` 
          });
        }
        
        // Update with normalized indices
        if (Array.isArray(correctAnswer)) {
          updates.correctAnswer = normalizedIndices;
        } else {
          updates.correctAnswer = normalizedIndices[0];
        }
        
        const answerLetter = String.fromCharCode(65 + updates.correctAnswer);
        const originalValue = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;
        console.log(`✅ [QUESTION UPDATE] Correct answer: ${originalValue} -> ${updates.correctAnswer} (${answerLetter})`);
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

// Bulk delete questions
router.post('/questions/bulk-delete', authenticateToken, requireSuperAdminOrPermission('tests.manage'), async (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of question IDs to delete' });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = questionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({ message: 'No valid question IDs provided' });
    }

    if (validIds.length !== questionIds.length) {
      console.warn(`⚠️ [BULK DELETE] Some invalid IDs were filtered out: ${questionIds.length - validIds.length} invalid IDs`);
    }

    // Update all questions to set isActive to false (soft delete)
    const result = await QuestionBank.updateMany(
      { _id: { $in: validIds } },
      { $set: { isActive: false } }
    );

    console.log(`✅ [BULK DELETE] Archived ${result.modifiedCount} question(s) out of ${validIds.length} requested`);

    res.json({ 
      message: `${result.modifiedCount} question(s) archived successfully`,
      deletedCount: result.modifiedCount,
      requestedCount: questionIds.length,
      validCount: validIds.length
    });
  } catch (error) {
    console.error('Bulk delete questions error:', error);
    res.status(500).json({ message: 'Server error archiving questions' });
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

    // Fetch candidate data early to get campus/department for filtering
    let candidateData = [];
    let filterCampus = null;
    let filterDepartment = null;

    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      const uniqueCandidateIds = [...new Set(candidateIds.map(id => id.toString()))];
      const candidateObjectIds = uniqueCandidateIds.map(id => new mongoose.Types.ObjectId(id));
      candidateData = await Candidate.find({ _id: { $in: candidateObjectIds } })
        .populate('form', 'title position department formCategory campus')
        .populate('user', 'name email profile');

      if (candidateData.length !== uniqueCandidateIds.length) {
        return res.status(400).json({ message: 'One or more selected candidates could not be found' });
      }

      // Get campus and department from candidate if single candidate is selected
      if (candidateIds.length === 1 && candidateData.length > 0) {
        const candidate = candidateData[0];
        if (candidate.form?.campus) {
          filterCampus = candidate.form.campus;
        }
        if (candidate.form?.department) {
          filterDepartment = candidate.form.department;
        }
      }
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
      const matchFilter = { topic: topicObjectId, isActive: true };
      
      // Add campus and department filter if available
      if (filterCampus) {
        matchFilter.campus = filterCampus;
      }
      if (filterDepartment) {
        matchFilter.department = filterDepartment;
      }
      
      const sampledQuestions = await QuestionBank.aggregate([
        { $match: matchFilter },
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

    // candidateData is already fetched above for filtering questions
    if (Array.isArray(candidateIds) && candidateIds.length > 0 && candidateData.length > 0) {
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

    // Define frontendUrl outside the if block so it's available for assignment details
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const baseTestLink = `${frontendUrl}/test/${test.testLink}`;

    if (candidateAssignments.length > 0) {
      const candidateMap = new Map(
        candidateData.map(candidate => {
          const doc = candidate.toObject({ virtuals: true });
          return [candidate._id.toString(), doc];
        })
      );

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

    // Generate assignment details for response
    const assignmentDetails = candidateData.map(candidate => {
      const candidateLink = `${frontendUrl}/test/${test.testLink}?candidate=${candidate._id.toString()}`;
      return {
        candidateId: candidate._id.toString(),
        candidateName: candidate.user?.name || 'Unknown',
        testName: test.title,
        duration: test.duration,
        testLink: candidateLink
      };
    });

    res.status(201).json({
      message: 'Assessment generated successfully',
      test: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        testLink: test.testLink
      },
      assignments: assignmentDetails
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
    const campusFilter = getCampusFilter(req.user);
    let query = {};
    
    // If user has campus restriction, filter by form's campus
    if (campusFilter.campus) {
      // First find forms with the matching campus
      const RecruitmentForm = require('../models/RecruitmentForm');
      const formsWithCampus = await RecruitmentForm.find({ campus: campusFilter.campus }).select('_id').lean();
      const formIds = formsWithCampus.map(f => f._id);
      query.form = { $in: formIds };
    }
    
    const tests = await Test.find(query)
      .populate('form', 'title position department formCategory formType campus')
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
    const test = await Test.findById(req.params.id)
      .populate('form', 'title position department');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Ensure testLink exists
    if (!test.testLink) {
      test.testLink = `test_${test._id}_${Date.now()}`;
      await test.save();
    }

    // Update test schedule
    test.scheduledDate = scheduledDate;
    test.scheduledTime = scheduledTime;

    // Fetch candidate details
    const candidates = await Candidate.find({ _id: { $in: candidateIds } })
      .populate('user', 'name email');

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

    // Generate test links for each candidate
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const baseTestLink = `${frontendUrl}/test/${test.testLink}`;
    
    const assignmentDetails = candidates.map(candidate => {
      const candidateLink = `${baseTestLink}?candidate=${candidate._id.toString()}`;
      return {
        candidateId: candidate._id.toString(),
        candidateName: candidate.user?.name || 'Unknown',
        testName: test.title,
        duration: test.duration,
        testLink: candidateLink
      };
    });

    res.json({
      message: 'Test assigned to candidates successfully',
      assignedCount: candidateIds.length,
      test: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        testLink: test.testLink
      },
      assignments: assignmentDetails
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
