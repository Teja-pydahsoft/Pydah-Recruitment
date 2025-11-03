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

  const existing = await RecruitmentForm.findOne({ title: 'Candidate Registration (Teaching & Non-Teaching)' });
  if (existing) {
    console.log('Candidate Registration form already exists. Skipping.');
    return;
  }

  const formFields = [
    // Basic Information
    { fieldName: 'fullName', fieldType: 'text', required: true, placeholder: 'Your full name' },
    { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
    { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
    { fieldName: 'email', fieldType: 'email', required: true, placeholder: 'you@example.com' },
    { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
    { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
    { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },

    // Application Details
    { fieldName: 'applyingFor', fieldType: 'select', required: true, options: ['Teaching', 'Non-Teaching'] },
    { fieldName: 'department', fieldType: 'select', required: true, options: ['CSE', 'ECE', 'MECH', 'Admin', 'Accounts', 'Library'] },
    { fieldName: 'designation', fieldType: 'text', required: true, placeholder: 'e.g., Assistant Professor, Clerk' },
    { fieldName: 'preferredLocation', fieldType: 'text', required: false, placeholder: 'Preferred location (optional)' },

    // Academic Qualifications (Teaching)
    { fieldName: 'highestQualification', fieldType: 'text', required: true, placeholder: 'e.g., Ph.D., M.Tech, MBA' },
    { fieldName: 'specialization', fieldType: 'text', required: true, placeholder: 'Subject / Field' },
    { fieldName: 'universityCollege', fieldType: 'text', required: true, placeholder: 'University / College' },
    { fieldName: 'yearOfPassing', fieldType: 'number', required: true },
    { fieldName: 'percentageCgpa', fieldType: 'number', required: true },

    // Experience Details
    { fieldName: 'totalExperienceYears', fieldType: 'number', required: true },
    { fieldName: 'previousInstitutionCompany', fieldType: 'text', required: true },
    { fieldName: 'lastDesignation', fieldType: 'text', required: true },
    { fieldName: 'fromDate', fieldType: 'date', required: false },
    { fieldName: 'toDate', fieldType: 'date', required: false },

    // Documents Upload
    { fieldName: 'resume', fieldType: 'file', required: true },
    { fieldName: 'passportPhoto', fieldType: 'file', required: true },
    { fieldName: 'certificates', fieldType: 'file_multiple', required: false },

    // Declaration
    { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
  ];

  const form = new RecruitmentForm({
    title: 'Candidate Registration (Teaching & Non-Teaching)',
    description: 'Unified candidate registration for teaching and non-teaching applicants',
    formType: 'candidate_profile',
    position: 'Various',
    department: 'Multiple',
    formFields,
    createdBy: superAdmin._id
  });

  await form.save();
  try { await form.generateQRCode(); await form.save(); } catch {}
  console.log('Seeded Candidate Registration form with unique link:', form.uniqueLink);
};

// Run seeding
const runSeed = async () => {
  await connectDB();
  await seedUsers();
  await seedCandidateRegistrationForm();
  await mongoose.connection.close();
  console.log('Seeding completed. Database connection closed.');
};

runSeed().catch(console.error);
