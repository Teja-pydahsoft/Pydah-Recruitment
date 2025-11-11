const User = require('../models/User');

const normalizeEmail = (value) => {
  if (!value) {
    return null;
  }
  return value.toLowerCase().trim();
};

const ensureSuperAdmin = async () => {
  const defaultEmail = 'careers@pydah.edu.in';
  const defaultPassword = 'Pydah2456@';
  const defaultName = 'Super Admin';

  const configuredEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL) || normalizeEmail(defaultEmail);
  const configuredPassword = process.env.SUPER_ADMIN_PASSWORD || defaultPassword;
  const configuredName = process.env.SUPER_ADMIN_NAME ? process.env.SUPER_ADMIN_NAME.trim() : defaultName;

  try {
    let superAdmin = await User.findOne({ role: 'super_admin' });

    if (!superAdmin) {
      superAdmin = new User({
        name: configuredName,
        email: configuredEmail,
        password: configuredPassword,
        role: 'super_admin',
        isActive: true
      });

      await superAdmin.save();
      console.log(`✅ [SUPER ADMIN] Created default super admin account for ${configuredEmail}`);
      return;
    }

    let shouldSave = false;

    if (configuredName && superAdmin.name !== configuredName) {
      superAdmin.name = configuredName;
      shouldSave = true;
    }

    if (configuredEmail && superAdmin.email !== configuredEmail) {
      const conflictingUser = await User.findOne({ email: configuredEmail });
      if (conflictingUser && !conflictingUser._id.equals(superAdmin._id)) {
        console.warn(`⚠️ [SUPER ADMIN] Configured email ${configuredEmail} is already used by another account (${conflictingUser.role}). Super admin email was not updated.`);
      } else {
        superAdmin.email = configuredEmail;
        shouldSave = true;
      }
    }

    const passwordToEnforce = configuredPassword;
    try {
      const passwordMatches = await superAdmin.comparePassword(passwordToEnforce);
      if (!passwordMatches) {
        superAdmin.password = passwordToEnforce;
        shouldSave = true;
        console.log('🔐 [SUPER ADMIN] Password updated based on configuration/defaults');
      }
    } catch (passwordCheckError) {
      console.warn('⚠️ [SUPER ADMIN] Unable to verify current password, forcing update');
      superAdmin.password = passwordToEnforce;
      shouldSave = true;
    }

    if (!superAdmin.isActive) {
      superAdmin.isActive = true;
      shouldSave = true;
    }

    if (shouldSave) {
      await superAdmin.save();
      console.log(`✅ [SUPER ADMIN] Synchronized super admin account (${superAdmin.email}) with environment configuration`);
    } else {
      console.log(`ℹ️ [SUPER ADMIN] Super admin account (${superAdmin.email}) already in sync`);
    }
  } catch (error) {
    console.error('❌ [SUPER ADMIN] Failed to ensure super admin account:', error);
  }
};

module.exports = ensureSuperAdmin;

