const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ [AUTH] No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('✅ [AUTH] Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('❌ [AUTH] User not found:', decoded.userId);
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    if (!user.isActive) {
      console.log('❌ [AUTH] User is inactive:', user.email);
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    console.log('✅ [AUTH] User authenticated:', user.email, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ [AUTH] Authentication error:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('❌ [AUTHORIZATION] No user in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('🔐 [AUTHORIZATION] Checking access for:', req.user.email);
    console.log('🔐 [AUTHORIZATION] User role:', req.user.role);
    console.log('🔐 [AUTHORIZATION] Required roles:', roles);

    if (!roles.includes(req.user.role)) {
      console.error('❌ [AUTHORIZATION] Access denied. User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    console.log('✅ [AUTHORIZATION] Access granted');
    next();
  };
};

// Specific role middlewares
const requireSuperAdmin = authorizeRoles('super_admin');
const requirePanelMember = authorizeRoles('panel_member', 'super_admin');
const requireCandidate = authorizeRoles('candidate', 'super_admin');

// Middleware to check if user owns the resource or is super admin
const requireOwnershipOrAdmin = (userField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Super admin can access everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if the resource belongs to the user
    const resourceUserId = req.params.userId || req.body[userField] || req.params.id;

    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({ message: 'Access denied. Resource not owned by user' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireSuperAdmin,
  requirePanelMember,
  requireCandidate,
  requireOwnershipOrAdmin
};
