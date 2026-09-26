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

  const guard = (permission, element) => {
    if (!permission) {
      return element;
    }

    return hasPermission(permission) ? element : <PermissionDenied requiredPermission={permission} />;
  };

  return (
    <Suspense fallback={<SkeletonLoader loading={true} variant="dashboard" />}>
      <Routes>
        <Route index element={<SubAdminOverview />} />
        <Route path="forms/*" element={guard('forms.manage', <FormsManagement />)} />
        <Route path="submissions/*" element={guard('forms.manage', <FormSubmissions />)} />
        <Route path="candidates/*" element={guard('candidates.manage', <CandidateManagement />)} />
        <Route path="tests/*" element={guard('tests.manage', <TestsManagement />)} />
        <Route path="test-results/*" element={guard('tests.manage', <TestResults />)} />
        <Route path="interviews/*" element={guard('interviews.manage', <InterviewsManagement />)} />
        <Route path="interview-feedback/*" element={guard('interviews.manage', <InterviewFeedback />)} />
        <Route path="users/*" element={guard('panel_members.manage', <UsersManagement />)} />
        <Route path="*" element={<Navigate to="/sub-admin" replace />} />
      </Routes>
    </Suspense>
  );
};

export default SubAdminDashboard;

