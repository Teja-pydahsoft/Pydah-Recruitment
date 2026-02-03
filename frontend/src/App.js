import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

// Components
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import SubAdminDashboard from './components/SubAdminDashboard';
import PanelMemberDashboard from './components/PanelMemberDashboard';
import CandidateDashboard from './components/CandidateDashboard';
import PublicForm from './components/PublicForm';
import TakeTest from './components/TakeTest';
import TypingTest from './components/TypingTest';
import Sidebar from './components/Sidebar';
import SkeletonLoader from './components/SkeletonLoader';
import CareersPage from './components/CareersPage';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <SkeletonLoader loading={true} variant="dashboard" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0) {
    // Check if user role is allowed
    const roleAllowed = allowedRoles.includes(user.role);
    
    // For panel member routes, also check if sub_admin has panel member access
    if (!roleAllowed && user.role === 'sub_admin' && allowedRoles.includes('sub_admin')) {
      const hasPanelAccess = user.hasPanelMemberAccess === true;
      if (!hasPanelAccess) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (!roleAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

// App Layout Component
const AppLayout = ({ children, showSidebar = true }) => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    checkMobile(); // Set initial state
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (!isAuthenticated || !showSidebar) {
    return (
      <div className="App">
        {children}
      </div>
    );
  }

  // Calculate responsive margins and widths based on screen size
  const getMainContentStyle = () => {
    if (isMobile) {
      // On mobile, sidebar overlays when open
      return {
        marginLeft: sidebarOpen ? '0' : '60px',
        width: sidebarOpen ? '100%' : 'calc(100% - 60px)',
      };
    } else {
      // On desktop, sidebar pushes content
      return {
        marginLeft: sidebarOpen ? '300px' : '70px',
        width: sidebarOpen ? 'calc(100% - 300px)' : 'calc(100% - 70px)',
      };
    }
  };

  const mainStyle = getMainContentStyle();

  return (
    <div className="App">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <main
        style={{
          ...mainStyle,
          padding: 'clamp(0.75rem, 2vw, 2rem)',
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
        className="main-content"
      >
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(1rem, 2vw, 2rem)',
            boxSizing: 'border-box',
            overflowX: 'hidden'
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

const getRedirectPathForRole = (role) => {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'sub_admin':
      return '/sub-admin';
    case 'panel_member':
      return '/panel-member';
    case 'candidate':
      return '/candidate';
    default:
      return '/login';
  }
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - No Sidebar */}
          <Route path="/login" element={<AppLayout showSidebar={false}><Login /></AppLayout>} />
          <Route path="/careers" element={<AppLayout showSidebar={false}><CareersPage /></AppLayout>} />
          <Route path="/form/:uniqueLink" element={<AppLayout showSidebar={false}><PublicForm /></AppLayout>} />
          <Route path="/test/:testLink" element={<AppLayout showSidebar={false}><TakeTest /></AppLayout>} />
          <Route path="/typing-test/:testLink" element={<AppLayout showSidebar={false}><TypingTest /></AppLayout>} />

          {/* Protected Routes - With Sidebar */}
          <Route
            path="/super-admin/*"
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              </AppLayout>
            }
          />

          <Route
            path="/sub-admin/*"
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['sub_admin']}>
                  <SubAdminDashboard />
                </ProtectedRoute>
              </AppLayout>
            }
          />

          <Route
            path="/panel-member/*"
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['panel_member', 'super_admin', 'sub_admin']}>
                  <PanelMemberDashboard />
                </ProtectedRoute>
              </AppLayout>
            }
          />

          <Route
            path="/candidate/*"
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateDashboard />
                </ProtectedRoute>
              </AppLayout>
            }
          />

          {/* Default redirect based on user role */}
          <Route
            path="/"
            element={
              <AppLayout showSidebar={false}>
                <PublicLanding />
              </AppLayout>
            }
          />

          {/* Unauthorized page */}
          <Route
            path="/unauthorized"
            element={
              <AppLayout showSidebar={false}>
                <div className="text-center mt-5">
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this page.</p>
                </div>
              </AppLayout>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<AppLayout showSidebar={false}><Navigate to="/" replace /></AppLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

const PublicLanding = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <SkeletonLoader loading={true} variant="dashboard" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/careers" replace />;
  }

  return <Navigate to={getRedirectPathForRole(user.role)} replace />;
};

export default App;
