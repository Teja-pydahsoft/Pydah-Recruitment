import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

// Components
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import PanelMemberDashboard from './components/PanelMemberDashboard';
import CandidateDashboard from './components/CandidateDashboard';
import PublicForm from './components/PublicForm';
import TakeTest from './components/TakeTest';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// App Layout Component
const AppLayout = ({ children, showSidebar = true }) => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  return (
    <div className="App">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <main
        style={{
          marginLeft: sidebarOpen ? '280px' : '70px',
          transition: 'margin-left 0.3s ease',
          padding: '2rem',
          minHeight: '100vh',
          background: '#f8fafc'
        }}
      >
        {children}
      </main>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - No Sidebar */}
          <Route path="/login" element={<AppLayout showSidebar={false}><Login /></AppLayout>} />
          <Route path="/form/:uniqueLink" element={<AppLayout showSidebar={false}><PublicForm /></AppLayout>} />
          <Route path="/test/:testLink" element={<AppLayout showSidebar={false}><TakeTest /></AppLayout>} />

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
            path="/panel-member/*"
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['panel_member']}>
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
                <RoleBasedRedirect />
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

// Component to redirect based on user role
const RoleBasedRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'super_admin':
      return <Navigate to="/super-admin" replace />;
    case 'panel_member':
      return <Navigate to="/panel-member" replace />;
    case 'candidate':
      return <Navigate to="/candidate" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;
