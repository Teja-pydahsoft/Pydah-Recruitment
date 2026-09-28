import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from './SkeletonLoader';

// Lazy load sub-components for optimized performance
const SubAdminOverview = lazy(() => import('./subadmin/SubAdminOverview'));
const FormsManagement = lazy(() => import('./superadmin/FormsManagement'));
const FormSubmissions = lazy(() => import('./superadmin/FormSubmissions'));
const CandidateManagement = lazy(() => import('./superadmin/CandidateManagement'));
const TestsManagement = lazy(() => import('./superadmin/TestsManagement'));
const TestResults = lazy(() => import('./superadmin/TestResults'));
const InterviewsManagement = lazy(() => import('./superadmin/InterviewsManagement'));
const InterviewFeedback = lazy(() => import('./superadmin/InterviewFeedback'));
const UsersManagement = lazy(() => import('./superadmin/UsersManagement'));
const PermissionDenied = lazy(() => import('./subadmin/SubAdminPermissionDenied'));

const SubAdminDashboard = () => {
  const { hasPermission } = useAuth();
  const dashFallback = <SkeletonLoader loading={true} variant="dashboard" />;
  const tableFallback = <SkeletonLoader loading={true} variant="table-page" />;

  const guard = (permission, element) => {
    if (!permission) {
      return element;
    }

    return hasPermission(permission) ? element : <PermissionDenied requiredPermission={permission} />;
  };

  return (
    <Routes>
      <Route index element={<Suspense fallback={dashFallback}><SubAdminOverview /></Suspense>} />
      <Route path="forms/*" element={guard('forms.manage', <Suspense fallback={tableFallback}><FormsManagement /></Suspense>)} />
      <Route path="submissions/*" element={guard('forms.manage', <Suspense fallback={tableFallback}><FormSubmissions /></Suspense>)} />
      <Route path="candidates/*" element={guard('candidates.manage', <Suspense fallback={tableFallback}><CandidateManagement /></Suspense>)} />
      <Route path="tests/*" element={guard('tests.manage', <Suspense fallback={tableFallback}><TestsManagement /></Suspense>)} />
      <Route path="test-results/*" element={guard('tests.manage', <Suspense fallback={tableFallback}><TestResults /></Suspense>)} />
      <Route path="interviews/*" element={guard('interviews.manage', <Suspense fallback={tableFallback}><InterviewsManagement /></Suspense>)} />
      <Route path="interview-feedback/*" element={guard('interviews.manage', <Suspense fallback={tableFallback}><InterviewFeedback /></Suspense>)} />
      <Route path="users/*" element={guard('panel_members.manage', <Suspense fallback={tableFallback}><UsersManagement /></Suspense>)} />
      <Route path="*" element={<Navigate to="/sub-admin" replace />} />
    </Routes>
  );
};

export default SubAdminDashboard;

