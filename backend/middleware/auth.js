const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

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
