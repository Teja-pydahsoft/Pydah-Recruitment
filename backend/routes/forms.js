const express = require('express');
const RecruitmentForm = require('../models/RecruitmentForm');
const Candidate = require('../models/Candidate');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { uploadToDrive, ensureFolder, verifyFolderAccess } = require('../config/googleDrive');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Create new recruitment form (Super Admin only)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, formType, position, department, requirements, formFields } = req.body;

    const form = new RecruitmentForm({
      title,
      description,
      formType: formType || 'candidate_profile',
      position: formType === 'candidate_profile' ? position : undefined,
      department: formType === 'candidate_profile' ? department : undefined,
      requirements,
      formFields,
      createdBy: req.user._id
    });

    await form.save();

    // Generate QR code
    try {
      await form.generateQRCode();
      await form.save();
    } catch (qrError) {
      console.error('QR Code generation failed:', qrError);
      // Continue without QR code - don't fail form creation
    }

    res.status(201).json({
      message: 'Recruitment form created successfully',
      form
    });
  } catch (error) {
    console.error('Form creation error:', error);
    res.status(500).json({ message: 'Server error creating form' });
  }
});

// Get all forms (Super Admin only)
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const forms = await RecruitmentForm.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ forms });
  } catch (error) {
    console.error('Forms fetch error:', error);
    res.status(500).json({ message: 'Server error fetching forms' });
  }
});

// Get form by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const form = await RecruitmentForm.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Only super admin or form creator can view full details
    if (req.user.role !== 'super_admin' && form.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ form });
  } catch (error) {
    console.error('Form fetch error:', error);
    res.status(500).json({ message: 'Server error fetching form' });
  }
});

// Update form (Super Admin only)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, formType, position, department, requirements, formFields, isActive } = req.body;

    const form = await RecruitmentForm.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        formType,
        position: formType === 'candidate_profile' ? position : undefined,
        department: formType === 'candidate_profile' ? department : undefined,
        requirements,
        formFields,
        isActive
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Regenerate QR code if form URL might have changed
    try {
      await form.generateQRCode();
      await form.save();
    } catch (qrError) {
      console.error('QR Code regeneration failed:', qrError);
    }

    res.json({
      message: 'Form updated successfully',
      form
    });
  } catch (error) {
    console.error('Form update error:', error);
    res.status(500).json({ message: 'Server error updating form' });
  }
});

// Delete form (Super Admin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const form = await RecruitmentForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if form has submissions
    const submissionCount = await Candidate.countDocuments({ form: req.params.id });
    if (submissionCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete form with existing submissions',
        submissionCount
      });
    }

    await RecruitmentForm.findByIdAndDelete(req.params.id);

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Form deletion error:', error);
    res.status(500).json({ message: 'Server error deleting form' });
  }
});

// Get public form by unique link (for candidates)
router.get('/public/:uniqueLink', async (req, res) => {
  try {
    const form = await RecruitmentForm.findOne({
      uniqueLink: req.params.uniqueLink,
      isActive: true
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found or inactive' });
    }

    res.json({
      form: {
        _id: form._id,
        title: form.title,
        description: form.description,
        position: form.position,
        department: form.department,
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
    let user = await require('../models/User').findOne({ email: userDetails.email });

    if (!user) {
      user = new (require('../models/User'))({
        name: userDetails.name,
        email: userDetails.email,
        password: Math.random().toString(36),
        role: 'candidate'
      });
      await user.save();
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

        console.log(`\n🔍 Verifying access to root folder: ${rootFolderId}`);
        await verifyFolderAccess(rootFolderId);

        console.log(`\n📂 Creating folder structure...`);
        const candidateFolderName = `${userDetails.name || 'Candidate'} - ${userDetails.email} - ${candidate._id}`;
        const candidateFolder = await ensureFolder({ name: candidateFolderName, parentId: rootFolderId });
        console.log(`✓ Candidate folder: ${candidateFolder.id}`);
        
        const resumeFolder = await ensureFolder({ name: 'Resume', parentId: candidateFolder.id });
        console.log(`✓ Resume folder: ${resumeFolder.id}`);
        
        const photoFolder = await ensureFolder({ name: 'Photo', parentId: candidateFolder.id });
        console.log(`✓ Photo folder: ${photoFolder.id}`);
        
        const certificatesFolder = await ensureFolder({ name: 'Certificates', parentId: candidateFolder.id });
        console.log(`✓ Certificates folder: ${certificatesFolder.id}`);

        const uploadWarnings = [];
        const uploadResults = [];
        console.log(`\n📤 Uploading files...`);
        
        for (const f of req.files) {
          let parentFolderId = candidateFolder.id;
          const lower = (f.fieldname || '').toLowerCase();
          if (lower.includes('resume')) parentFolderId = resumeFolder.id;
          else if (lower.includes('photo') || lower.includes('passport')) parentFolderId = photoFolder.id;
          else if (lower.includes('certificate')) parentFolderId = certificatesFolder.id;

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
              uploadedAt: new Date()
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

// Get form statistics (Super Admin only)
router.get('/:id/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
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

// Regenerate QR code (Super Admin only)
router.post('/:id/qr-code', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const form = await RecruitmentForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    await form.generateQRCode();
    await form.save();

    res.json({
      message: 'QR code generated successfully',
      qrCode: form.qrCode
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ message: 'Server error generating QR code' });
  }
});

// Get forms by type (Super Admin only)
router.get('/type/:formType', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { formType } = req.params;
    
    if (!['candidate_profile', 'feedback_form'].includes(formType)) {
      return res.status(400).json({ message: 'Invalid form type' });
    }

    const forms = await RecruitmentForm.find({ formType })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ forms });
  } catch (error) {
    console.error('Forms by type fetch error:', error);
    res.status(500).json({ message: 'Server error fetching forms by type' });
  }
});

// Get form with QR code info (Super Admin only)
router.get('/:id/qr-code', authenticateToken, requireSuperAdmin, async (req, res) => {
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

module.exports = router;
