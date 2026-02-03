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

// Check if user has permission (read access - allows both read_only and full_access)
const hasPermission = (user, permission, requireWrite = false) => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  if (user.role === 'sub_admin') {
    if (!permission) {
      return true;
    }

    // Handle both old format (array) and new format (object)
    if (Array.isArray(user.permissions)) {
      // Old format: array of permission keys (all are full_access)
      return user.permissions.includes(permission) || user.permissions.includes('*');
    }

    // New format: object with access levels
    if (typeof user.permissions === 'object' && user.permissions !== null) {
      const accessLevel = user.permissions[permission];
      
      if (accessLevel === 'full_access') {
        return true; // Full access allows both read and write
      }
      
      // Support both 'view_only' (new) and 'read_only' (legacy)
      if (accessLevel === 'view_only' || accessLevel === 'read_only') {
        return !requireWrite; // View-only only allows read/view operations
      }
      
      // Check for wildcard
      if (user.permissions['*'] === 'full_access') {
        return true;
      }
      
      // Support both 'view_only' and 'read_only' for wildcard
      if (user.permissions['*'] === 'view_only' || user.permissions['*'] === 'read_only') {
        return !requireWrite;
      }
    }
  }

  return false;
};

// Check if user has write permission (full access only)
const hasWritePermission = (user, permission) => {
  return hasPermission(user, permission, true);
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

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (hasPermission(req.user, permission)) {
      return next();
    }

    console.error('❌ [AUTHORIZATION] Permission denied. User:', req.user.email, 'Permission:', permission);
    return res.status(403).json({
      message: 'Access denied. Insufficient permissions',
      requiredPermission: permission,
      userRole: req.user.role,
      userPermissions: req.user.permissions || []
    });
  };
};

const requireSuperAdminOrPermission = (permission, requireWrite = false) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    if (hasPermission(req.user, permission, requireWrite)) {
      return next();
    }

    console.error('❌ [AUTHORIZATION] Access denied. Missing permission:', permission, requireWrite ? '(write required)' : '');
    return res.status(403).json({
      message: requireWrite 
        ? 'Access denied. Write permission required' 
        : 'Access denied. Insufficient permissions',
      requiredPermission: permission,
      userRole: req.user.role
    });
  };
};

// Middleware for write operations (POST, PUT, DELETE) - requires full_access
const requireSuperAdminOrWritePermission = (permission) => {
  return requireSuperAdminOrPermission(permission, true);
};

// Specific role middlewares
const requireSuperAdmin = authorizeRoles('super_admin');
const requirePanelMember = (req, res, next) => {
  if (!req.user) {
    console.log('❌ [AUTHORIZATION] No user in request');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Allow panel_member, super_admin, or sub_admin with panel member access
  const hasAccess = req.user.role === 'panel_member' || 
                    req.user.role === 'super_admin' || 
                    (req.user.role === 'sub_admin' && req.user.hasPanelMemberAccess === true);

  if (!hasAccess) {
    console.error('❌ [AUTHORIZATION] Access denied. User role:', req.user.role, 'hasPanelMemberAccess:', req.user.hasPanelMemberAccess);
    return res.status(403).json({
      message: 'Access denied. Panel member access required',
      userRole: req.user.role
    });
  }

  console.log('✅ [AUTHORIZATION] Panel member access granted');
  next();
};
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

// Helper function to get campus filter for sub-admins
// If user is a sub_admin with a campus assigned, returns filter object
// Otherwise returns empty object (no filter)
const getCampusFilter = (user) => {
  if (!user) return {};
  
  // Super admins see all data
  if (user.role === 'super_admin') return {};
  
  // Sub-admins with campus assigned only see their campus data
  if (user.role === 'sub_admin' && user.campus) {
    return { campus: user.campus };
  }
  
  // Panel members with campus assigned only see their campus data
  if (user.role === 'panel_member' && user.campus) {
    return { campus: user.campus };
  }
  
  // No filter for other cases
  return {};
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireSuperAdmin,
  requirePanelMember,
  requireCandidate,
  requireOwnershipOrAdmin,
  hasPermission,
  hasWritePermission,
  requirePermission,
  requireSuperAdminOrPermission,
  requireSuperAdminOrWritePermission,
  getCampusFilter
};
