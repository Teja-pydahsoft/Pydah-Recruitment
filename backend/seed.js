const mongoose = require('mongoose');
const User = require('./models/User');
const RecruitmentForm = require('./models/RecruitmentForm');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_recruitment');
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    // Check if users already exist
    const existingUsers = await User.find({});
    if (existingUsers.length > 0) {
      console.log('Users already exist in database. Skipping seeding.');
      return;
    }

    const users = [
      {
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'super_admin',
        profile: {
          phone: '+1-234-567-8900',
          department: 'Administration',
          experience: 10,
          skills: ['Management', 'Leadership', 'System Administration']
        }
      },
      {
        name: 'Panel Member',
        email: 'panel@example.com',
        password: 'panel123',
        role: 'panel_member',
        profile: {
          phone: '+1-234-567-8901',
          department: 'Computer Science',
          experience: 8,
          skills: ['Teaching', 'Research', 'Interviewing']
        }
      },
      {
        name: 'Demo Candidate',
        email: 'candidate@example.com',
        password: 'candidate123',
        role: 'candidate',
        profile: {
          phone: '+1-234-567-8902',
          department: 'Computer Science',
          experience: 5,
          skills: ['Programming', 'Data Structures', 'Algorithms']
        }
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${userData.email}`);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

const seedCandidateRegistrationForm = async () => {
  // Ensure a super admin exists to own the form
  const superAdmin = await User.findOne({ role: 'super_admin' });
  if (!superAdmin) {
    console.log('No super admin found; skipping form seeding.');
    return;
  }

  // Seed Teaching Form
  const existingTeaching = await RecruitmentForm.findOne({ title: 'Teaching Staff Registration Form' });
  if (!existingTeaching) {
    const teachingFormFields = [
      // Basic Information
      { fieldName: 'fullName', fieldType: 'text', required: true, placeholder: 'Your full name' },
      { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
      { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
      { fieldName: 'email', fieldType: 'email', required: true, placeholder: 'you@example.com' },
      { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
      { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
      { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },
      
      // Application Details
      { fieldName: 'department', fieldType: 'select', required: true, options: ['CSE', 'ECE', 'MECH', 'Civil', 'EEE'] },
      { fieldName: 'designation', fieldType: 'select', required: true, options: ['Assistant Professor', 'Associate Professor', 'Professor'] },
      { fieldName: 'preferredLocation', fieldType: 'text', required: false, placeholder: 'Preferred location (optional)' },
      
      // Academic Qualifications
      { fieldName: 'highestQualification', fieldType: 'select', required: true, options: ['Ph.D.', 'M.Tech', 'M.E.', 'M.Sc.', 'B.Tech', 'B.E.'] },
      { fieldName: 'specialization', fieldType: 'text', required: true, placeholder: 'Subject / Field' },
      { fieldName: 'universityCollege', fieldType: 'text', required: true, placeholder: 'University / College' },
      { fieldName: 'yearOfPassing', fieldType: 'number', required: true, placeholder: 'Year of passing' },
      { fieldName: 'percentageCgpa', fieldType: 'number', required: true, placeholder: 'Percentage or CGPA' },
      
      // Experience Details
      { fieldName: 'totalExperienceYears', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
      { fieldName: 'teachingExperience', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
      { fieldName: 'previousInstitutionCompany', fieldType: 'text', required: true, placeholder: 'Previous Institution/Company' },
      { fieldName: 'lastDesignation', fieldType: 'text', required: true, placeholder: 'Last Designation' },
      { fieldName: 'fromDate', fieldType: 'date', required: false },
      { fieldName: 'toDate', fieldType: 'date', required: false },
      
      // Documents Upload
      { fieldName: 'resume', fieldType: 'file', required: true },
      { fieldName: 'passportPhoto', fieldType: 'file', required: true },
      { fieldName: 'certificates', fieldType: 'file_multiple', required: false },
      
      // Declaration
      { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
    ];

    const teachingForm = new RecruitmentForm({
      title: 'Teaching Staff Registration Form',
      description: 'Registration form for teaching positions',
      formType: 'candidate_profile',
      formCategory: 'teaching',
      position: 'Teaching Staff',
      department: 'Various',
      formFields: teachingFormFields,
      createdBy: superAdmin._id
    });

    await teachingForm.save();
    try { await teachingForm.generateQRCode(); await teachingForm.save(); } catch {}
    console.log('✅ Seeded Teaching Staff Registration form with unique link:', teachingForm.uniqueLink);
  } else {
    console.log('Teaching Staff Registration form already exists. Skipping.');
  }

  // Seed Non-Teaching Form
  const existingNonTeaching = await RecruitmentForm.findOne({ title: 'Non-Teaching Staff Registration Form' });
  if (!existingNonTeaching) {
    const nonTeachingFormFields = [
      // Basic Information
      { fieldName: 'fullName', fieldType: 'text', required: true, placeholder: 'Your full name' },
      { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
      { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
      { fieldName: 'email', fieldType: 'email', required: true, placeholder: 'you@example.com' },
      { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
      { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
      { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },
      
      // Application Details
      { fieldName: 'department', fieldType: 'select', required: true, options: ['Admin', 'Accounts', 'Library', 'HR', 'IT', 'Maintenance'] },
      { fieldName: 'designation', fieldType: 'select', required: true, options: ['Clerk', 'Accountant', 'Librarian', 'Administrative Assistant', 'IT Support', 'Other'] },
      { fieldName: 'preferredLocation', fieldType: 'text', required: false, placeholder: 'Preferred location (optional)' },
      
      // Academic Qualifications
      { fieldName: 'highestQualification', fieldType: 'select', required: true, options: ['Ph.D.', 'Masters', 'Bachelors', 'Diploma', '12th', '10th'] },
      { fieldName: 'specialization', fieldType: 'text', required: true, placeholder: 'Subject / Field' },
      { fieldName: 'universityCollege', fieldType: 'text', required: true, placeholder: 'University / College' },
      { fieldName: 'yearOfPassing', fieldType: 'number', required: true, placeholder: 'Year of passing' },
      { fieldName: 'percentageCgpa', fieldType: 'number', required: true, placeholder: 'Percentage or CGPA' },
      
      // Experience Details
      { fieldName: 'totalExperienceYears', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
      { fieldName: 'previousInstitutionCompany', fieldType: 'text', required: true, placeholder: 'Previous Institution/Company' },
      { fieldName: 'lastDesignation', fieldType: 'text', required: true, placeholder: 'Last Designation' },
      { fieldName: 'fromDate', fieldType: 'date', required: false },
      { fieldName: 'toDate', fieldType: 'date', required: false },
      
      // Documents Upload
      { fieldName: 'resume', fieldType: 'file', required: true },
      { fieldName: 'passportPhoto', fieldType: 'file', required: true },
      { fieldName: 'certificates', fieldType: 'file_multiple', required: false },
      
      // Declaration
      { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
    ];

    const nonTeachingForm = new RecruitmentForm({
      title: 'Non-Teaching Staff Registration Form',
      description: 'Registration form for non-teaching positions',
      formType: 'candidate_profile',
      formCategory: 'non_teaching',
      position: 'Non-Teaching Staff',
      department: 'Various',
      formFields: nonTeachingFormFields,
      createdBy: superAdmin._id
    });

    await nonTeachingForm.save();
    try { await nonTeachingForm.generateQRCode(); await nonTeachingForm.save(); } catch {}
    console.log('✅ Seeded Non-Teaching Staff Registration form with unique link:', nonTeachingForm.uniqueLink);
  } else {
    console.log('Non-Teaching Staff Registration form already exists. Skipping.');
  }
};

// Seed default feedback form
const seedDefaultFeedbackForm = async () => {
  // Ensure a super admin exists to own the form
  const superAdmin = await User.findOne({ role: 'super_admin' });
  if (!superAdmin) {
    console.log('No super admin found; skipping feedback form seeding.');
    return;
  }

  // Check if default feedback form already exists
  const existingFeedbackForm = await RecruitmentForm.findOne({ 
    formType: 'feedback_form',
    title: 'Default Interview Feedback Form'
  });

  if (!existingFeedbackForm) {
    const feedbackFormFields = [
      {
        fieldName: 'technicalSkills',
        fieldType: 'rating',
        required: true,
        placeholder: 'Rate technical skills (1-5)'
      },
      {
        fieldName: 'communication',
        fieldType: 'rating',
        required: true,
        placeholder: 'Rate communication skills (1-5)'
      },
      {
        fieldName: 'problemSolving',
        fieldType: 'rating',
        required: true,
        placeholder: 'Rate problem-solving abilities (1-5)'
      },
      {
        fieldName: 'overallRating',
        fieldType: 'rating',
        required: true,
        placeholder: 'Overall rating (1-5)'
      },
      {
        fieldName: 'comments',
        fieldType: 'textarea',
        required: false,
        placeholder: 'Additional comments or observations'
      },
      {
        fieldName: 'recommendation',
        fieldType: 'yes_no',
        required: true,
        options: ['Yes', 'No'],
        placeholder: 'Would you recommend this candidate?'
      }
    ];

    const defaultFeedbackForm = new RecruitmentForm({
      title: 'Default Interview Feedback Form',
      description: 'Default feedback form for interview evaluations',
      formType: 'feedback_form',
      formFields: feedbackFormFields,
      createdBy: superAdmin._id
    });

    await defaultFeedbackForm.save();
    try { 
      await defaultFeedbackForm.generateQRCode(); 
      await defaultFeedbackForm.save(); 
    } catch (err) {
      console.log('QR code generation skipped for feedback form');
    }
    console.log('✅ Seeded Default Interview Feedback Form with ID:', defaultFeedbackForm._id);
  } else {
    console.log('Default Interview Feedback Form already exists. Skipping.');
  }
};

// Run seeding
const runSeed = async () => {
  await connectDB();
  await seedUsers();
  await seedCandidateRegistrationForm();
  await seedDefaultFeedbackForm();
  await mongoose.connection.close();
  console.log('Seeding completed. Database connection closed.');
};

runSeed().catch(console.error);
