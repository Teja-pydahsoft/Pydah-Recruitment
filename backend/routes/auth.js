const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../config/email');

const router = express.Router();

// Register new user (only super admin can create panel members and other admins)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    console.log('\n👤 [USER REGISTRATION] Request received from:', req.user.email);
    console.log('👤 [USER REGISTRATION] Request body:', {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      profile: req.body.profile
    });

    const { name, email, password, role, profile } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      console.error('❌ [USER REGISTRATION] Missing required fields');
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Only super admin can create panel members and other admins
    if ((role === 'panel_member' || role === 'super_admin') && req.user.role !== 'super_admin') {
      console.error('❌ [USER REGISTRATION] Unauthorized attempt to create', role);
      return res.status(403).json({ message: 'Only super admin can create panel members or admins' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('❌ [USER REGISTRATION] User already exists:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Clean profile object - remove empty strings
    const cleanedProfile = profile ? Object.fromEntries(
      Object.entries(profile).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    ) : {};

    console.log('👤 [USER REGISTRATION] Creating user with cleaned profile:', cleanedProfile);

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'candidate',
      profile: Object.keys(cleanedProfile).length > 0 ? cleanedProfile : undefined
    });

    await user.save();
    console.log('✅ [USER REGISTRATION] User created successfully:', user._id);
    console.log('✅ [USER REGISTRATION] User details:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.profile?.designation || 'N/A'
    });

    // Send email notification to panel members with credentials
    if (role === 'panel_member' && password) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const loginUrl = `${frontendUrl}/login`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Welcome to Staff Recruitment System</h2>
            <p>Dear ${name},</p>
            <p>Your panel member account has been created successfully. Below are your login credentials:</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
              <h3 style="margin: 0 0 10px 0; color: #1e293b;">Your Login Credentials</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
              ${user.profile?.designation ? `<p style="margin: 5px 0;"><strong>Designation:</strong> ${user.profile.designation}</p>` : ''}
              ${user.profile?.phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${user.profile.phone}</p>` : ''}
            </div>
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Portal</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated message from the Staff Recruitment System. Please do not reply to this email.
            </p>
          </div>
        `;

        const emailText = `
          Welcome to Staff Recruitment System

          Dear ${name},

          Your panel member account has been created successfully. Below are your login credentials:

          Email: ${email}
          Password: ${password}
          ${user.profile?.designation ? `Designation: ${user.profile.designation}` : ''}
          ${user.profile?.phone ? `Phone: ${user.profile.phone}` : ''}

          Important: Please change your password after your first login for security purposes.

          Login URL: ${loginUrl}

          This is an automated message from the Staff Recruitment System. Please do not reply to this email.
        `;

        await sendEmail(email, 'Panel Member Account Created - Staff Recruitment System', emailHtml, emailText);
        console.log('✅ [USER REGISTRATION] Email notification sent to:', email);
      } catch (emailError) {
        console.error('❌ [USER REGISTRATION] Failed to send email notification:', emailError);
        // Don't fail the registration if email fails
      }
    }

    console.log('✅ [USER REGISTRATION] Request completed\n');

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('\n🔐 [LOGIN] Login attempt received');
    console.log('🔐 [LOGIN] Request body:', { email: req.body.email ? req.body.email : 'missing', hasPassword: !!req.body.password });

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.error('❌ [LOGIN] Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔐 [LOGIN] Normalized email:', normalizedEmail);

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.error('❌ [LOGIN] User not found:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ [LOGIN] User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });

    if (!user.isActive) {
      console.error('❌ [LOGIN] User is inactive:', normalizedEmail);
      return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' });
    }

    // Check password
    console.log('🔐 [LOGIN] Verifying password...');
    let isPasswordValid = await user.comparePassword(password);
    
    // If password is invalid and user is a candidate, check if they entered email as password
    // This helps when candidates were created with random passwords but should use email
    if (!isPasswordValid && user.role === 'candidate') {
      console.log('🔐 [LOGIN] Password does not match, checking if user entered email as password...');
      
      // Check if user entered their email as the password
      if (password.toLowerCase().trim() === normalizedEmail) {
        // User entered email as password, but stored password doesn't match
        // This means the stored password was set to a random value
        // Reset password to email for this candidate
        console.log(`⚠️ [LOGIN] Candidate entered email as password, but stored password doesn't match. Resetting password to email.`);
        user.password = normalizedEmail;
        await user.save();
        console.log(`✅ [LOGIN] Password reset to email for candidate: ${normalizedEmail}`);
        isPasswordValid = true;
      } else {
        // Check if stored password is actually the email (for existing users who already have email as password)
        const storedPasswordIsEmail = await user.comparePassword(normalizedEmail);
        if (storedPasswordIsEmail && password.toLowerCase().trim() !== normalizedEmail) {
          console.log('⚠️ [LOGIN] Stored password is email, but user entered different password');
          // User's stored password is their email, but they entered something else
          // This is still an invalid login attempt
        }
      }
    }
    
    if (!isPasswordValid) {
      console.error('❌ [LOGIN] Invalid password for user:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ [LOGIN] Password verified successfully');

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    console.log('✅ [LOGIN] Token generated successfully');
    console.log('✅ [LOGIN] Login successful for:', normalizedEmail);
    console.log('✅ [LOGIN] User role:', user.role);
    console.log('✅ [LOGIN] Request completed\n');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('❌ [LOGIN] Login error:', error);
    console.error('❌ [LOGIN] Error stack:', error.stack);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid input data' });
    }
    
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, profile } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, profile },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// Get all users (super admin only)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin only' });
    }

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Update user status (super admin only)
router.put('/users/:userId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin only' });
    }

    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    console.error('User status update error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

// Update panel member details (super admin only)
router.put('/panel-members/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('\n👤 [PANEL MEMBER UPDATE] Request received from:', req.user.email);
    console.log('👤 [PANEL MEMBER UPDATE] User ID:', req.params.userId);
    console.log('👤 [PANEL MEMBER UPDATE] Update data:', {
      name: req.body.name,
      email: req.body.email,
      profile: req.body.profile
    });

    if (req.user.role !== 'super_admin') {
      console.error('❌ [PANEL MEMBER UPDATE] Unauthorized access');
      return res.status(403).json({ message: 'Access denied. Super admin only' });
    }

    const { name, email, password, profile } = req.body;

    // Clean profile object - remove empty strings
    const cleanedProfile = profile ? Object.fromEntries(
      Object.entries(profile).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    ) : {};

    const updateData = { name, email };
    
    // Handle password update if provided
    if (password && password.trim() !== '') {
      updateData.password = password;
      console.log('👤 [PANEL MEMBER UPDATE] Password will be updated');
    }
    
    if (Object.keys(cleanedProfile).length > 0) {
      updateData.profile = cleanedProfile;
    }

    console.log('👤 [PANEL MEMBER UPDATE] Updating with data:', { ...updateData, password: password ? '***' : 'not provided' });

    // Use findById to get the user, then save to trigger password hashing
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      console.error('❌ [PANEL MEMBER UPDATE] User not found:', req.params.userId);
      return res.status(404).json({ message: 'Panel member not found' });
    }

    // Update fields
    user.name = name;
    user.email = email;
    if (password && password.trim() !== '') {
      user.password = password; // Will be hashed by pre-save hook
    }
    if (Object.keys(cleanedProfile).length > 0) {
      user.profile = cleanedProfile;
    }

    if (user.role !== 'panel_member') {
      console.error('❌ [PANEL MEMBER UPDATE] User is not a panel member:', user.role);
      return res.status(400).json({ message: 'User is not a panel member' });
    }

    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('✅ [PANEL MEMBER UPDATE] Panel member updated successfully:', user._id);
    console.log('✅ [PANEL MEMBER UPDATE] Updated details:', {
      id: user._id,
      name: user.name,
      email: user.email,
      designation: user.profile?.designation || 'N/A'
    });
    console.log('✅ [PANEL MEMBER UPDATE] Request completed\n');

    res.json({
      message: 'Panel member updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Panel member update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error updating panel member' });
  }
});

// Delete panel member (super admin only)
router.delete('/panel-members/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin only' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'Panel member not found' });
    }

    if (user.role !== 'panel_member') {
      return res.status(400).json({ message: 'User is not a panel member' });
    }

    await User.findByIdAndDelete(req.params.userId);

    res.json({
      message: 'Panel member deleted successfully'
    });
  } catch (error) {
    console.error('Panel member delete error:', error);
    res.status(500).json({ message: 'Server error deleting panel member' });
  }
});

// Get all panel members (super admin only)
router.get('/panel-members', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin only' });
    }

    const panelMembers = await User.find({ role: 'panel_member' }).select('-password').sort({ createdAt: -1 });
    res.json({ panelMembers });
  } catch (error) {
    console.error('Panel members fetch error:', error);
    res.status(500).json({ message: 'Server error fetching panel members' });
  }
});

module.exports = router;
