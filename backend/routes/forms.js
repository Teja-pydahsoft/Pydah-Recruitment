const express = require('express');
const RecruitmentForm = require('../models/RecruitmentForm');
const Candidate = require('../models/Candidate');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { uploadToDrive, ensureFolder, verifyFolderAccess } = require('../config/googleDrive');
const { authenticateToken, requireSuperAdminOrPermission, requireSuperAdminOrWritePermission, hasPermission, getCampusFilter } = require('../middleware/auth');

const router = express.Router();

const DRIVE_UNSAFE_CHARS = /[\\/:*?"<>|#%]+/g;
const sanitizeForDrive = (value, fallback = 'Untitled') => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  const cleaned = value.replace(DRIVE_UNSAFE_CHARS, ' ').trim();
  return cleaned.length > 0 ? cleaned.substring(0, 120) : fallback;
};

const buildJobFolderName = (form) => {
  const parts = [];
  if (form.position) parts.push(form.position);
  if (form.department) parts.push(form.department);
  parts.push(form._id.toString());
  return sanitizeForDrive(parts.join(' - '), `Form-${form._id.toString()}`);
};

const buildCandidateFolderName = (userDetails = {}, candidateId) => {
  const parts = [];
  if (userDetails.name) parts.push(userDetails.name);
  if (userDetails.email) parts.push(userDetails.email);
  if (candidateId) parts.push(candidateId.toString());
  return sanitizeForDrive(parts.join(' - '), `Candidate-${candidateId || Date.now()}`);
};

const buildFieldFolderName = (fieldName, index) => {
  return sanitizeForDrive(fieldName, `Field-${index + 1}`);
};

async function provisionDriveStructureForForm(form) {
  if (!form || form.formType !== 'candidate_profile') {
    return null;
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    console.warn('⚠️ [FORM DRIVE] Skipping Drive provisioning: GOOGLE_DRIVE_FOLDER_ID not set');
    return null;
  }

  try {
    await verifyFolderAccess(rootFolderId);
  } catch (error) {
    console.error('❌ [FORM DRIVE] Cannot access root folder:', error.message);
    return null;
  }

  try {
    const jobFolderName = buildJobFolderName(form);
    const jobFolder = await ensureFolder({ name: jobFolderName, parentId: rootFolderId });
    console.log(`✅ [FORM DRIVE] Job folder ready: ${jobFolderName} (${jobFolder.id})`);

    const fileFields = (form.formFields || []).filter(field =>
      ['file', 'file_multiple'].includes(field.fieldType)
    ).map((field, index) => ({
      fieldName: field.fieldName,
      folderName: buildFieldFolderName(field.fieldName, index)
    }));

    form.driveFolder = {
      id: jobFolder.id,
      name: jobFolderName,
      createdAt: new Date()
    };
    form.driveFieldFolders = fileFields;
    await form.save();

    return {
      jobFolder,
      fieldFolders: fileFields
    };
  } catch (error) {
    console.error('❌ [FORM DRIVE] Error provisioning Drive structure:', error.message);
    return null;
  }
}

// Create new recruitment form (Super Admin only)
router.post('/', authenticateToken, requireSuperAdminOrWritePermission('forms.manage'), async (req, res) => {
  try {
    console.log('\n📝 [FORM CREATION] Request received from:', req.user.email);
    console.log('📝 [FORM CREATION] Request body:', {
      title: req.body.title,
      formType: req.body.formType,
      formCategory: req.body.formCategory,
      campus: req.body.campus,
      position: req.body.position,
      department: req.body.department,
      formFieldsCount: req.body.formFields?.length || 0
    });

    const { title, description, formType, formCategory, campus, position, department, closingDate, vacancies, requirements, formFields } = req.body;

    const form = new RecruitmentForm({
      title,
      description,
      formType: formType || 'candidate_profile',
      formCategory: formType === 'candidate_profile' ? formCategory : undefined,
      campus: formType === 'candidate_profile' ? campus : undefined,
      position: formType === 'candidate_profile' ? position : undefined,
      // Department is only required for teaching forms, optional for non-teaching
      department: formType === 'candidate_profile' && formCategory === 'teaching' ? department : (formType === 'candidate_profile' && department ? department : undefined),
      closingDate: formType === 'candidate_profile' && closingDate ? new Date(closingDate) : undefined,
      vacancies: formType === 'candidate_profile' && vacancies ? parseInt(vacancies) : undefined,
      filledVacancies: 0,
      requirements,
      formFields,
      createdBy: req.user._id
    });

    await form.save();
    console.log('✅ [FORM CREATION] Form created successfully:', form._id);
    console.log('✅ [FORM CREATION] Form title:', form.title);
    console.log('✅ [FORM CREATION] Form category:', form.formCategory || 'N/A');

    // Generate QR code
    try {
      console.log('📱 [FORM CREATION] Generating QR code...');
      await form.generateQRCode();
      await form.save();
      console.log('✅ [FORM CREATION] QR code generated successfully');
      console.log('✅ [FORM CREATION] Unique link:', form.uniqueLink);
    } catch (qrError) {
      console.error('❌ [FORM CREATION] QR Code generation failed:', qrError);
      // Continue without QR code - don't fail form creation
    }

    // Provision Google Drive folder structure for this form
    try {
      await provisionDriveStructureForForm(form);
    } catch (driveError) {
      console.error('❌ [FORM CREATION] Drive provisioning failed:', driveError.message);
    }

    console.log('✅ [FORM CREATION] Form creation completed successfully\n');
    res.status(201).json({
      message: 'Recruitment form created successfully',
      form
    });
  } catch (error) {
    console.error('❌ [FORM CREATION] Error:', error.message);
    console.error('❌ [FORM CREATION] Stack:', error.stack);
    res.status(500).json({ message: 'Server error creating form' });
  }
});

// Get all forms (Super Admin only)
router.get('/', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    console.log('\n📋 [FORMS FETCH] Request received from:', req.user.email);
    console.log('📋 [FORMS FETCH] Fetching all forms...');
    
    const campusFilter = getCampusFilter(req.user);
    const forms = await RecruitmentForm.find(campusFilter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('✅ [FORMS FETCH] Found', forms.length, 'forms');
    console.log('✅ [FORMS FETCH] Forms:', forms.map(f => ({ id: f._id, title: f.title, category: f.formCategory || 'N/A' })));
    console.log('✅ [FORMS FETCH] Request completed\n');
    
    res.json({ forms });
  } catch (error) {
    console.error('❌ [FORMS FETCH] Error:', error.message);
    res.status(500).json({ message: 'Server error fetching forms' });
  }
});

// Get forms by type (Super Admin only) - MUST BE BEFORE /:id route
router.get('/type/:formType', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { formType } = req.params;
    console.log('\n📋 [FORMS BY TYPE] Request received from:', req.user.email);
    console.log('📋 [FORMS BY TYPE] Form type:', formType);
    
    if (!['candidate_profile', 'feedback_form'].includes(formType)) {
      console.error('❌ [FORMS BY TYPE] Invalid form type:', formType);
      return res.status(400).json({ message: 'Invalid form type' });
    }

    const forms = await RecruitmentForm.find({ formType })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('✅ [FORMS BY TYPE] Found', forms.length, 'forms of type:', formType);
    console.log('✅ [FORMS BY TYPE] Forms:', forms.map(f => ({ id: f._id, title: f.title, category: f.formCategory || 'N/A' })));
    console.log('✅ [FORMS BY TYPE] Request completed\n');
    
    res.json({ forms });
  } catch (error) {
    console.error('❌ [FORMS BY TYPE] Error:', error.message);
    res.status(500).json({ message: 'Server error fetching forms by type' });
  }
});

// Get forms by category (Teaching/Non-Teaching) (Super Admin only) - MUST BE BEFORE /:id route
router.get('/category/:formCategory', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const { formCategory } = req.params;
    console.log('\n📋 [FORMS BY CATEGORY] Request received from:', req.user.email);
    console.log('📋 [FORMS BY CATEGORY] Form category:', formCategory);
    
    if (!['teaching', 'non_teaching'].includes(formCategory)) {
      console.error('❌ [FORMS BY CATEGORY] Invalid form category:', formCategory);
      return res.status(400).json({ message: 'Invalid form category' });
    }

    const forms = await RecruitmentForm.find({ 
      formType: 'candidate_profile',
      formCategory 
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('✅ [FORMS BY CATEGORY] Found', forms.length, 'forms for category:', formCategory);
    console.log('✅ [FORMS BY CATEGORY] Forms:', forms.map(f => ({ id: f._id, title: f.title, category: f.formCategory })));
    console.log('✅ [FORMS BY CATEGORY] Request completed\n');
    
    res.json({ forms });
  } catch (error) {
    console.error('❌ [FORMS BY CATEGORY] Error:', error.message);
    res.status(500).json({ message: 'Server error fetching forms by category' });
  }
});

// Get form statistics (Super Admin only) - MUST BE BEFORE /:id route
router.get('/:id/stats', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const form = await RecruitmentForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const stats = await form.getStats();

    res.json({
      formId: form._id,
      formType: form.formType,
      title: form.title,
      ...stats,
      createdAt: form.createdAt,
      lastModified: form.updatedAt
    });
  } catch (error) {
    console.error('Form stats error:', error);
    res.status(500).json({ message: 'Server error fetching form statistics' });
  }
});

// Get form with QR code info (Super Admin only) - MUST BE BEFORE /:id route
router.get('/:id/qr-code', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    const form = await RecruitmentForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({
      form: {
        _id: form._id,
        title: form.title,
        formType: form.formType,
        uniqueLink: form.uniqueLink,
        qrCode: form.qrCode,
        isActive: form.isActive
      }
    });
  } catch (error) {
    console.error('QR code fetch error:', error);
    res.status(500).json({ message: 'Server error fetching QR code' });
  }
});

// Get form by ID - MUST BE AFTER all specific routes
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('\n📋 [FORM FETCH BY ID] Request received from:', req.user.email);
    console.log('📋 [FORM FETCH BY ID] Form ID:', req.params.id);

    const form = await RecruitmentForm.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!form) {
      console.error('❌ [FORM FETCH BY ID] Form not found:', req.params.id);
      return res.status(404).json({ message: 'Form not found' });
    }

    // Only super admin or form creator can view full details
    const canManageForms = hasPermission(req.user, 'forms.manage');

    if (!canManageForms && form.createdBy._id.toString() !== req.user._id.toString()) {
      console.error('❌ [FORM FETCH BY ID] Access denied for user:', req.user.email);
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('✅ [FORM FETCH BY ID] Form found:', form.title);
    console.log('✅ [FORM FETCH BY ID] Form category:', form.formCategory || 'N/A');
    console.log('✅ [FORM FETCH BY ID] Form fields count:', form.formFields?.length || 0);
    console.log('✅ [FORM FETCH BY ID] Request completed\n');

    res.json({ form });
  } catch (error) {
    console.error('❌ [FORM FETCH BY ID] Error:', error.message);
    res.status(500).json({ message: 'Server error fetching form' });
  }
});

// Update form (Super Admin only)
router.put('/:id', authenticateToken, requireSuperAdminOrWritePermission('forms.manage'), async (req, res) => {
  try {
    console.log('\n📝 [FORM UPDATE] Request received from:', req.user.email);
    console.log('📝 [FORM UPDATE] Form ID:', req.params.id);
    console.log('📝 [FORM UPDATE] Update data:', {
      title: req.body.title,
      formType: req.body.formType,
      formCategory: req.body.formCategory,
      isActive: req.body.isActive
    });

    // First, get the existing form to preserve formType
    const existingForm = await RecruitmentForm.findById(req.params.id);
    if (!existingForm) {
      console.error('❌ [FORM UPDATE] Form not found:', req.params.id);
      return res.status(404).json({ message: 'Form not found' });
    }

    // Prevent formType from being changed (data integrity)
    const originalFormType = existingForm.formType;
    const { title, description, formCategory, campus, position, department, closingDate, vacancies, requirements, formFields, isActive } = req.body;

    // Use original formType, ignore any formType in request body
    const updateData = {
      title,
      description,
      formType: originalFormType, // Preserve original form type
      formCategory: originalFormType === 'candidate_profile' ? formCategory : undefined,
      campus: originalFormType === 'candidate_profile' ? campus : undefined,
      position: originalFormType === 'candidate_profile' ? position : undefined,
      // Department is only required for teaching forms, optional for non-teaching
      department: originalFormType === 'candidate_profile' && formCategory === 'teaching' ? department : (originalFormType === 'candidate_profile' && department ? department : undefined),
      closingDate: originalFormType === 'candidate_profile' && closingDate ? new Date(closingDate) : undefined,
      vacancies: originalFormType === 'candidate_profile' && vacancies ? parseInt(vacancies) : undefined,
      requirements,
      formFields,
      isActive
    };

    // If formType was attempted to be changed, log a warning
    if (req.body.formType && req.body.formType !== originalFormType) {
      console.warn('⚠️ [FORM UPDATE] Form type change attempted but prevented:', {
        original: originalFormType,
        attempted: req.body.formType
      });
    }

    const form = await RecruitmentForm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!form) {
      console.error('❌ [FORM UPDATE] Form update failed:', req.params.id);
      return res.status(500).json({ message: 'Failed to update form' });
    }

    console.log('✅ [FORM UPDATE] Form updated successfully:', form._id);
    console.log('✅ [FORM UPDATE] Form type preserved:', form.formType);

    // Regenerate QR code if form URL might have changed
    try {
      console.log('📱 [FORM UPDATE] Regenerating QR code...');
      await form.generateQRCode();
      await form.save();
      console.log('✅ [FORM UPDATE] QR code regenerated successfully');
    } catch (qrError) {
      console.error('❌ [FORM UPDATE] QR Code regeneration failed:', qrError);
    }

    console.log('✅ [FORM UPDATE] Request completed\n');
    res.json({
      message: 'Form updated successfully',
      form
    });
  } catch (error) {
    console.error('❌ [FORM UPDATE] Error:', error.message);
    res.status(500).json({ message: 'Server error updating form' });
  }
});

// Delete form (Super Admin only)
router.delete('/:id', authenticateToken, requireSuperAdminOrWritePermission('forms.manage'), async (req, res) => {
  try {
    console.log('\n🗑️  [FORM DELETE] Request received from:', req.user.email);
    console.log('🗑️  [FORM DELETE] Form ID:', req.params.id);

    const form = await RecruitmentForm.findById(req.params.id);

    if (!form) {
      console.error('❌ [FORM DELETE] Form not found:', req.params.id);
      return res.status(404).json({ message: 'Form not found' });
    }

    console.log('🗑️  [FORM DELETE] Form found:', form.title);

    // Check if form has submissions
    const submissionCount = await Candidate.countDocuments({ form: req.params.id });
    if (submissionCount > 0) {
      console.error('❌ [FORM DELETE] Cannot delete form with', submissionCount, 'submissions');
      return res.status(400).json({
        message: 'Cannot delete form with existing submissions',
        submissionCount
      });
    }

    await RecruitmentForm.findByIdAndDelete(req.params.id);
    console.log('✅ [FORM DELETE] Form deleted successfully:', req.params.id);
    console.log('✅ [FORM DELETE] Request completed\n');

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('❌ [FORM DELETE] Error:', error.message);
    res.status(500).json({ message: 'Server error deleting form' });
  }
});

// Public endpoint to fetch active recruitment forms grouped by category
router.get('/public/active', async (req, res) => {
  try {
    const now = new Date();
    const baseFilters = {
      formType: 'candidate_profile',
      isActive: true,
      $or: [
        { closingDate: { $exists: false } },
        { closingDate: null },
        { closingDate: { $gte: now } }
      ]
    };

    const selectFields = 'title description position department closingDate vacancies filledVacancies formCategory uniqueLink requirements createdAt';

    const [teachingForms, nonTeachingForms] = await Promise.all([
      RecruitmentForm.find({ ...baseFilters, formCategory: 'teaching' })
        .sort({ createdAt: -1 })
        .select(selectFields)
        .lean(),
      RecruitmentForm.find({ ...baseFilters, formCategory: 'non_teaching' })
        .sort({ createdAt: -1 })
        .select(selectFields)
        .lean()
    ]);

    const sanitizeForm = (form) => ({
      id: form._id,
      title: form.title,
      description: form.description,
      position: form.position,
      department: form.department,
      closingDate: form.closingDate,
      vacancies: form.vacancies,
      filledVacancies: form.filledVacancies,
      uniqueLink: form.uniqueLink,
      requirements: form.requirements || {}
    });

    res.json({
      teaching: teachingForms.map(sanitizeForm),
      nonTeaching: nonTeachingForms.map(sanitizeForm)
    });
  } catch (error) {
    console.error('❌ [PUBLIC FORMS FETCH] Error:', error.message);
    res.status(500).json({ message: 'Server error fetching recruitment forms' });
  }
});

// Get public form by unique link (for candidates)
router.get('/public/:uniqueLink', async (req, res) => {
  try {
    const form = await RecruitmentForm.findOne({
      uniqueLink: req.params.uniqueLink
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if form is active and closing date hasn't passed
    const now = new Date();
    const isClosed = form.closingDate && new Date(form.closingDate) < now;
    
    if (!form.isActive || isClosed) {
      return res.status(404).json({ 
        message: isClosed ? 'Form submission deadline has passed' : 'Form is not currently active' 
      });
    }

    res.json({
      form: {
        _id: form._id,
        title: form.title,
        description: form.description,
        formType: form.formType,
        formCategory: form.formCategory,
        position: form.position,
        department: form.department,
        closingDate: form.closingDate,
        vacancies: form.vacancies,
        filledVacancies: form.filledVacancies,
        requirements: form.requirements,
        formFields: form.formFields
      }
    });
  } catch (error) {
    console.error('Public form fetch error:', error);
    res.status(500).json({ message: 'Server error fetching form' });
  }
});

// Submit form response (public endpoint for candidates) with optional file uploads
const upload = multer({ dest: path.join(os.tmpdir(), 'uploads') });
router.post('/public/:uniqueLink/submit', upload.any(), async (req, res) => {
  try {
    const form = await RecruitmentForm.findOne({
      uniqueLink: req.params.uniqueLink,
      isActive: true
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found or inactive' });
    }

    // Parse body (supports JSON and multipart)
    let candidateData = req.body.candidateData;
    let userDetails = req.body.userDetails;

    if (typeof candidateData === 'string') {
      try { candidateData = JSON.parse(candidateData); } catch {}
    }
    if (typeof userDetails === 'string') {
      try { userDetails = JSON.parse(userDetails); } catch {}
    }

    if (!userDetails || !userDetails.email) {
      return res.status(400).json({ message: 'Missing user details' });
    }

    // Create or find user (candidate)
    // If user exists, update their role to candidate if it's not already
    const User = require('../models/User');
    let user = await User.findOne({ email: userDetails.email.toLowerCase().trim() });

    if (!user) {
      // Set password to email for candidates (they can change it later)
      // This allows them to login with their email as both username and password
      const password = userDetails.email.toLowerCase().trim();
      
      user = new User({
        name: userDetails.name,
        email: userDetails.email.toLowerCase().trim(),
        password: password, // Will be hashed by pre-save hook
        role: 'candidate'
      });
      await user.save();
      console.log(`✅ Created new candidate user: ${user.email} with password set to email`);
    } else {
      // If user exists but doesn't have candidate role, update it
      if (user.role !== 'candidate') {
        console.log(`⚠️ User ${user.email} exists with role ${user.role}, updating to candidate role`);
        user.role = 'candidate';
        await user.save();
      }
      
      // If user exists but password might be wrong (random password), reset it to email
      // This helps when users created from forms try to login
      const testPassword = await user.comparePassword(userDetails.email.toLowerCase().trim());
      if (!testPassword) {
        console.log(`⚠️ User ${user.email} password doesn't match email, resetting password to email`);
        user.password = userDetails.email.toLowerCase().trim();
        await user.save();
        console.log(`✅ Reset password for user: ${user.email}`);
      }
    }

    const documents = [];

    // Handle any uploaded files (organize in Drive folders)
    if (Array.isArray(req.files) && req.files.length > 0) {
      // Create candidate after we have user to build folder name temp, but we need candidate ID for folder
      // We'll create candidate record later; for folder naming, use email+timestamp for now
    }

    // Create candidate submission (initially without documents if files exist)
    const candidate = new Candidate({
      user: user._id,
      form: form._id,
      applicationData: candidateData || {},
      documents: []
    });

    await candidate.save();

    // If there are files, organize and upload now that we have candidate ID
    if (Array.isArray(req.files) && req.files.length > 0) {
      console.log(`\n📦 Starting file upload process for candidate: ${userDetails.name} (${userDetails.email})`);
      console.log(`📁 Files to upload: ${req.files.length}`);
      req.files.forEach(f => {
        console.log(`  - ${f.fieldname}: ${f.originalname} (${f.mimetype})`);
      });

      try {
        const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!rootFolderId) {
          throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
        }

        let jobFolderId = form.driveFolder?.id || null;
        let driveFieldFolders = form.driveFieldFolders || [];

        if (!jobFolderId) {
          const provisioned = await provisionDriveStructureForForm(form);
          if (provisioned?.jobFolder?.id) {
            jobFolderId = provisioned.jobFolder.id;
            driveFieldFolders = provisioned.fieldFolders || [];
          }
        }

        jobFolderId = jobFolderId || rootFolderId;
        console.log(`\n🔍 Verifying access to job folder: ${jobFolderId}`);
        await verifyFolderAccess(jobFolderId);

        console.log(`\n📂 Creating folder structure...`);
        const candidateFolderName = buildCandidateFolderName(userDetails, candidate._id);
        const candidateFolder = await ensureFolder({ name: candidateFolderName, parentId: jobFolderId });
        console.log(`✓ Candidate folder: ${candidateFolder.id}`);

        const fileFields = (form.formFields || []).filter(field =>
          ['file', 'file_multiple'].includes(field.fieldType)
        );

        const candidateFieldFolders = new Map();

        for (let i = 0; i < fileFields.length; i += 1) {
          const field = fileFields[i];
          const stored = driveFieldFolders.find(ff => ff.fieldName === field.fieldName);
          const fieldFolderName = stored?.folderName || buildFieldFolderName(field.fieldName, i);
          const fieldFolder = await ensureFolder({ name: fieldFolderName, parentId: candidateFolder.id });
          candidateFieldFolders.set(field.fieldName, {
            id: fieldFolder.id,
            name: fieldFolderName
          });
          console.log(`✓ Candidate field folder ready: ${fieldFolderName} (${fieldFolder.id})`);
        }

        const uploadWarnings = [];
        const uploadResults = [];
        console.log(`\n📤 Uploading files...`);
        
        for (const f of req.files) {
          const fieldFolder = candidateFieldFolders.get(f.fieldname);
          const parentFolderId = fieldFolder?.id || candidateFolder.id;

          try {
            const uploaded = await uploadToDrive({
              filePath: f.path,
              mimeType: f.mimetype,
              originalName: f.originalname,
              parentFolderId
            });

            documents.push({
              name: uploaded.name || f.originalname,
              url: uploaded.webViewLink || uploaded.webContentLink || '',
              uploadedAt: new Date(),
              field: f.fieldname || null
            });

            uploadResults.push({
              field: f.fieldname,
              originalName: f.originalname,
              id: uploaded.id,
              url: uploaded.webViewLink || uploaded.webContentLink || ''
            });

            if (candidateData && f.fieldname && Object.prototype.hasOwnProperty.call(candidateData, f.fieldname)) {
              candidate.applicationData.set(f.fieldname, uploaded.webViewLink || uploaded.webContentLink || uploaded.id);
            }
          } catch (uploadErr) {
            console.error(`❌ Upload failed for ${f.originalname}:`, uploadErr.message);
            uploadWarnings.push(`Failed to upload ${f.originalname}: ${uploadErr.message}`);
          }
        }

        candidate.documents = documents;
        await candidate.save();

        console.log(`\n✅ Upload process completed:`);
        console.log(`  - Successful uploads: ${uploadResults.length}`);
        console.log(`  - Failed uploads: ${uploadWarnings.length}`);
        
        if (uploadResults.length > 0) {
          console.log(`\n📋 Uploaded files:`);
          uploadResults.forEach(r => {
            console.log(`  ✓ ${r.originalName} → ${r.url || r.id}`);
          });
        }

        if (uploadWarnings.length > 0) {
          req.uploadWarnings = uploadWarnings;
          console.warn(`\n⚠️  Upload warnings:`);
          uploadWarnings.forEach(w => console.warn(`  - ${w}`));
        }
        if (uploadResults.length > 0) {
          req.uploadResults = uploadResults;
        }

        // Clean up temporary files after upload
        for (const f of req.files) {
          try {
            if (fs.existsSync(f.path)) {
              fs.unlinkSync(f.path);
              console.log(`✓ Cleaned up temp file: ${f.originalname}`);
            }
          } catch (cleanupErr) {
            console.warn(`⚠ Could not delete temp file ${f.path}:`, cleanupErr.message);
          }
        }
      } catch (e) {
        console.error('\n❌ Organized upload failed:', e.message);
        console.error('Stack trace:', e.stack);
        req.uploadWarnings = [e.message];

        // Clean up temp files even on error
        if (Array.isArray(req.files)) {
          for (const f of req.files) {
            try {
              if (fs.existsSync(f.path)) {
                fs.unlinkSync(f.path);
              }
            } catch (cleanupErr) {
              // Ignore cleanup errors
            }
          }
        }
      }
    }

    // Update form submission count
    await RecruitmentForm.findByIdAndUpdate(form._id, {
      $inc: { submissionCount: 1 }
    });

    // Send push notification to all admin users (super_admin + sub_admin) about new application
    try {
      const { sendNotificationToAllAdmins } = require('../utils/pushNotificationService');
      
      // Populate form details for notification
      await form.populate('createdBy', 'name email');
      
      // Get frontend URL (handle comma-separated values)
      let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (frontendUrl.includes(',')) {
        frontendUrl = frontendUrl.split(',')[0].trim();
      }
      
      const notificationData = {
        title: '🎯 New Application Received',
        body: `${userDetails.name} has submitted an application for ${form.position || form.title}`,
        icon: `${frontendUrl}/pydah-logo.png`,
        badge: `${frontendUrl}/pydah-logo.png`,
        url: `${frontendUrl}/candidates/${candidate._id}`,
        data: {
          candidateId: candidate._id.toString(),
          formId: form._id.toString(),
          type: 'new_application'
        },
        tag: 'new-application',
        color: '#10b981', // Green color for new applications
        requireInteraction: false,
        priority: 'high'
      };
      
      // Send notification to all admins (filtered by campus if form has campus)
      const options = form.campus ? { campus: form.campus } : {};
      
      // Send notification asynchronously (don't block response)
      sendNotificationToAllAdmins(notificationData, options)
        .then(result => {
          if (result.success) {
            console.log(`✅ [PUSH] Notification sent to ${result.sent} admin user(s) about new application`);
          } else {
            console.log(`ℹ️  [PUSH] No notifications sent (${result.message || 'no subscriptions'})`);
          }
        })
        .catch(err => {
          console.error('❌ [PUSH] Error sending notification (non-blocking):', err.message);
        });
    } catch (pushError) {
      // Don't fail the request if push notification fails
      console.error('❌ [PUSH] Error setting up notification (non-blocking):', pushError.message);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      candidateId: candidate._id,
      documents: candidate.documents,
      warnings: req.uploadWarnings || [],
      uploads: req.uploadResults || []
    });
  } catch (error) {
    console.error('Form submission error:', error);
    
    // Clean up temp files on error
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        try {
          if (fs.existsSync(f.path)) {
            fs.unlinkSync(f.path);
          }
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
      }
    }
    
    res.status(500).json({ message: 'Server error submitting form' });
  }
});

// Regenerate QR code (Super Admin only)
router.post('/:id/qr-code', authenticateToken, requireSuperAdminOrPermission('forms.manage'), async (req, res) => {
  try {
    console.log('\n📱 [QR CODE REGENERATE] Request received from:', req.user.email);
    console.log('📱 [QR CODE REGENERATE] Form ID:', req.params.id);
    
    const form = await RecruitmentForm.findById(req.params.id);

    if (!form) {
      console.error('❌ [QR CODE REGENERATE] Form not found:', req.params.id);
      return res.status(404).json({ message: 'Form not found' });
    }

    await form.generateQRCode();
    await form.save();

    console.log('✅ [QR CODE REGENERATE] QR code regenerated successfully');
    console.log('✅ [QR CODE REGENERATE] Unique link:', form.uniqueLink);
    console.log('✅ [QR CODE REGENERATE] Request completed\n');

    res.json({
      message: 'QR code generated successfully',
      qrCode: form.qrCode
    });
  } catch (error) {
    console.error('❌ [QR CODE REGENERATE] Error:', error.message);
    res.status(500).json({ message: 'Server error generating QR code' });
  }
});

module.exports = router;
