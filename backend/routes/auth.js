const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user (only super admin can create panel members and other admins)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { name, email, password, role, profile } = req.body;

    // Only super admin can create panel members and other admins
    if ((role === 'panel_member' || role === 'super_admin') && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can create panel members or admins' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'candidate',
      profile
    });

    await user.save();

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
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

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
    console.error('Login error:', error);
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
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin only' });
    }

    const { name, email, profile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { name, email, profile },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Panel member not found' });
    }

    if (user.role !== 'panel_member') {
      return res.status(400).json({ message: 'User is not a panel member' });
    }

    res.json({
      message: 'Panel member updated successfully',
      user
    });
  } catch (error) {
    console.error('Panel member update error:', error);
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
