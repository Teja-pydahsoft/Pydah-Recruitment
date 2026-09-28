import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SkeletonLoader from './SkeletonLoader';

// Lazy load sub-components for optimized performance
const DashboardOverview = lazy(() => import('./superadmin/DashboardOverview'));
const FormsManagement = lazy(() => import('./superadmin/FormsManagement'));
const FormSubmissions = lazy(() => import('./superadmin/FormSubmissions'));
const TestsManagement = lazy(() => import('./superadmin/TestsManagement'));
const UsersManagement = lazy(() => import('./superadmin/UsersManagement'));
const SubAdminManagement = lazy(() => import('./superadmin/SubAdminManagement'));
const CourseManagement = lazy(() => import('./superadmin/CourseManagement'));
const InterviewsManagement = lazy(() => import('./superadmin/InterviewsManagement'));
const TestResults = lazy(() => import('./superadmin/TestResults'));
const InterviewFeedback = lazy(() => import('./superadmin/InterviewFeedback'));
const CandidateManagement = lazy(() => import('./superadmin/CandidateManagement'));
const NotificationSettings = lazy(() => import('./superadmin/NotificationSettings'));

const SuperAdminDashboard = () => {
  const dashFallback = <SkeletonLoader loading={true} variant="dashboard" />;
  const tableFallback = <SkeletonLoader loading={true} variant="table-page" />;

  return (
    <Routes>
      <Route index element={<Suspense fallback={dashFallback}><DashboardOverview /></Suspense>} />
      <Route path="creation/*" element={<Suspense fallback={tableFallback}><FormsManagement /></Suspense>} />
      <Route path="submissions/*" element={<Suspense fallback={tableFallback}><FormSubmissions /></Suspense>} />
      <Route path="tests/*" element={<Suspense fallback={tableFallback}><TestsManagement /></Suspense>} />
      <Route path="users/*" element={<Suspense fallback={tableFallback}><UsersManagement /></Suspense>} />
      <Route path="sub-admins/*" element={<Suspense fallback={tableFallback}><SubAdminManagement /></Suspense>} />
      <Route path="courses/*" element={<Suspense fallback={tableFallback}><CourseManagement /></Suspense>} />
      <Route path="interviews/*" element={<Suspense fallback={tableFallback}><InterviewsManagement /></Suspense>} />
      <Route path="test-results/*" element={<Suspense fallback={tableFallback}><TestResults /></Suspense>} />
      <Route path="interview-feedback/*" element={<Suspense fallback={tableFallback}><InterviewFeedback /></Suspense>} />
      <Route path="candidates/*" element={<Suspense fallback={tableFallback}><CandidateManagement /></Suspense>} />
      <Route path="settings" element={<Suspense fallback={tableFallback}><NotificationSettings /></Suspense>} />
      <Route path="*" element={<Navigate to="/super-admin" replace />} />
    </Routes>
  );
};

export default SuperAdminDashboard;
