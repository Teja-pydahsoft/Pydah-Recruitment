import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    // Set loading to false immediately to show skeleton, then verify auth in background
    setLoading(false);

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser({
          ...parsedUser,
          permissions: parsedUser.permissions || []
        });
      } catch (error) {
        console.error('Failed to parse saved user from storage', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      const normalizedUser = {
        ...userData,
        permissions: userData.permissions || [],
        hasPanelMemberAccess: userData.hasPanelMemberAccess || false
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      const updatedUser = {
        ...user,
        ...response.data.user,
        permissions: response.data.user?.permissions || user?.permissions || []
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Profile update failed'
      };
    }
  };

  const hasPermission = (permission, requireWrite = false) => {
    if (!permission || !user) {
      return false;
    }

    if (user.role === 'super_admin') {
      return true;
    }

    if (user.role === 'sub_admin') {
      // Handle both old format (array) and new format (object with access levels)
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
        
        if (user.permissions['*'] === 'view_only' || user.permissions['*'] === 'read_only') {
          return !requireWrite;
        }
      }
    }

    return false;
  };

  // Check if user has write permission (full access only)
  const hasWritePermission = (permission) => {
    return hasPermission(permission, true);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateProfile,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isSubAdmin: user?.role === 'sub_admin',
    isPanelMember: user?.role === 'panel_member',
    isCandidate: user?.role === 'candidate',
    permissions: user?.permissions || [],
    hasPermission,
    hasWritePermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
