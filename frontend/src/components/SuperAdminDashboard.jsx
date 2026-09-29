import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SkeletonLoader from './SkeletonLoader';
import ErrorBoundary from './ErrorBoundary';
import lazyWithRetry from '../utils/lazyWithRetry';

// Resilient lazy load sub-components for optimized performance & network failure recovery
const DashboardOverview = lazyWithRetry(() => import('./superadmin/DashboardOverview'));
const FormsManagement = lazyWithRetry(() => import('./superadmin/FormsManagement'));
const FormSubmissions = lazyWithRetry(() => import('./superadmin/FormSubmissions'));
const TestsManagement = lazyWithRetry(() => import('./superadmin/TestsManagement'));
const UsersManagement = lazyWithRetry(() => import('./superadmin/UsersManagement'));
const SubAdminManagement = lazyWithRetry(() => import('./superadmin/SubAdminManagement'));
const CourseManagement = lazyWithRetry(() => import('./superadmin/CourseManagement'));
const InterviewsManagement = lazyWithRetry(() => import('./superadmin/InterviewsManagement'));
const TestResults = lazyWithRetry(() => import('./superadmin/TestResults'));
const InterviewFeedback = lazyWithRetry(() => import('./superadmin/InterviewFeedback'));
const CandidateManagement = lazyWithRetry(() => import('./superadmin/CandidateManagement'));
const NotificationSettings = lazyWithRetry(() => import('./superadmin/NotificationSettings'));

const SuperAdminDashboard = () => {
  const dashFallback = <SkeletonLoader loading={true} variant="dashboard" />;
  const tableFallback = <SkeletonLoader loading={true} variant="table-page" />;

  // Background preload all section chunks during idle time for instantaneous section switching
  useEffect(() => {
    const preloadAll = () => {
      FormsManagement.preload?.();
      FormSubmissions.preload?.();
      CandidateManagement.preload?.();
      InterviewsManagement.preload?.();
      TestsManagement.preload?.();
      UsersManagement.preload?.();
      SubAdminManagement.preload?.();
      CourseManagement.preload?.();
      TestResults.preload?.();
      InterviewFeedback.preload?.();
      NotificationSettings.preload?.();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preloadAll);
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preloadAll, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default SuperAdminDashboard;

