import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

import Sidebar from './components/Sidebar';
import SkeletonLoader from './components/SkeletonLoader';
import ErrorBoundary from './components/ErrorBoundary';
import lazyWithRetry from './utils/lazyWithRetry';

// Resilient Lazy Loaded Components for Code-Splitting and Smooth Mobile/Desktop Navigation
const Login = lazyWithRetry(() => import('./components/Login'));
const SuperAdminDashboard = lazyWithRetry(() => import('./components/SuperAdminDashboard'));
const SubAdminDashboard = lazyWithRetry(() => import('./components/SubAdminDashboard'));
const PanelMemberDashboard = lazyWithRetry(() => import('./components/PanelMemberDashboard'));
const CandidateDashboard = lazyWithRetry(() => import('./components/CandidateDashboard'));
const PublicForm = lazyWithRetry(() => import('./components/PublicForm'));
const TakeTest = lazyWithRetry(() => import('./components/TakeTest'));
const TypingTest = lazyWithRetry(() => import('./components/TypingTest'));
const CareersPage = lazyWithRetry(() => import('./components/CareersPage'));


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
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Always start closed on mobile
      } else {
        setSidebarOpen(true); // Always start open on desktop
      }
    };
    
    checkMobile(); // Set initial state
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  if (!isAuthenticated || !showSidebar) {
    return (
      <div className="App">
        <div className="app-page-watermark" aria-hidden="true" />
        {children}
      </div>
    );
  }

  // On mobile: sidebar overlays (content always full width)
  // On desktop: sidebar pushes content
  const getMainContentStyle = () => {
    if (isMobile) {
      return {
        marginLeft: 0,
        width: '100%',
      };
    } else {
      return {
        marginLeft: sidebarOpen ? '264px' : '64px',
        width: sidebarOpen ? 'calc(100% - 264px)' : 'calc(100% - 64px)',
      };
    }
  };

  const mainStyle = getMainContentStyle();

  return (
    <div className="App">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />
      {/* Floating hamburger button for mobile (visible only when sidebar is closed on mobile) */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="mobile-hamburger-btn"
          aria-label="Open menu"
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: 1100,
            background: '#0ea5e9',
            border: 'none',
            borderRadius: '10px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(14,165,233,0.35)',
            color: '#ffffff',
            fontSize: '1.1rem',
          }}
        >
          &#9776;
        </button>
      )}
      <main
        style={{
          ...mainStyle,
          padding: isMobile ? 'clamp(0.5rem, 2vw, 0.875rem)' : 'clamp(0.75rem, 2vw, 2rem)',
          paddingTop: isMobile ? '56px' : 'clamp(0.75rem, 2vw, 2rem)',
          minHeight: '100vh',
          background: 'transparent',
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
            gap: isMobile ? '0.75rem' : 'clamp(1rem, 2vw, 2rem)',
            boxSizing: 'border-box',
            overflowX: 'hidden'
          }}
        >
          {children}
        </div>
      </main>
      <div className="app-page-watermark" aria-hidden="true" />
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
        <ErrorBoundary>
          <Suspense fallback={<SkeletonLoader loading={true} variant="dashboard" />}>
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
          </Suspense>
        </ErrorBoundary>
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
