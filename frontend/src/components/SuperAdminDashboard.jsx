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
  return (
    <Suspense fallback={<SkeletonLoader loading={true} variant="dashboard" />}>
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="creation/*" element={<FormsManagement />} />
        <Route path="submissions/*" element={<FormSubmissions />} />
        <Route path="tests/*" element={<TestsManagement />} />
        <Route path="users/*" element={<UsersManagement />} />
        <Route path="sub-admins/*" element={<SubAdminManagement />} />
        <Route path="courses/*" element={<CourseManagement />} />
        <Route path="interviews/*" element={<InterviewsManagement />} />
        <Route path="test-results/*" element={<TestResults />} />
        <Route path="interview-feedback/*" element={<InterviewFeedback />} />
        <Route path="candidates/*" element={<CandidateManagement />} />
        <Route path="settings" element={<NotificationSettings />} />
        <Route path="*" element={<Navigate to="/super-admin" replace />} />
      </Routes>
    </Suspense>
  );
};

export default SuperAdminDashboard;
