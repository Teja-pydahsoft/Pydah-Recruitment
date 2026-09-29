import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from './SkeletonLoader';
import ErrorBoundary from './ErrorBoundary';
import lazyWithRetry from '../utils/lazyWithRetry';

// Resilient lazy load sub-components for optimized performance & network failure recovery
const SubAdminOverview = lazyWithRetry(() => import('./subadmin/SubAdminOverview'));
const FormsManagement = lazyWithRetry(() => import('./superadmin/FormsManagement'));
const FormSubmissions = lazyWithRetry(() => import('./superadmin/FormSubmissions'));
const CandidateManagement = lazyWithRetry(() => import('./superadmin/CandidateManagement'));
const TestsManagement = lazyWithRetry(() => import('./superadmin/TestsManagement'));
const TestResults = lazyWithRetry(() => import('./superadmin/TestResults'));
const InterviewsManagement = lazyWithRetry(() => import('./superadmin/InterviewsManagement'));
const InterviewFeedback = lazyWithRetry(() => import('./superadmin/InterviewFeedback'));
const UsersManagement = lazyWithRetry(() => import('./superadmin/UsersManagement'));
const PermissionDenied = lazyWithRetry(() => import('./subadmin/SubAdminPermissionDenied'));

const SubAdminDashboard = () => {
  const { hasPermission } = useAuth();
  const dashFallback = <SkeletonLoader loading={true} variant="dashboard" />;
  const tableFallback = <SkeletonLoader loading={true} variant="table-page" />;

  // Background preload all accessible section chunks during idle time
  useEffect(() => {
    const preloadAll = () => {
      FormsManagement.preload?.();
      FormSubmissions.preload?.();
      CandidateManagement.preload?.();
      TestsManagement.preload?.();
      TestResults.preload?.();
      InterviewsManagement.preload?.();
      InterviewFeedback.preload?.();
      UsersManagement.preload?.();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preloadAll);
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preloadAll, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  const guard = (permission, element) => {
    if (!permission) {
      return element;
    }

    return hasPermission(permission) ? element : <PermissionDenied requiredPermission={permission} />;
  };

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default SubAdminDashboard;


