import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SkeletonLoader from './SkeletonLoader';
import ErrorBoundary from './ErrorBoundary';
import lazyWithRetry from '../utils/lazyWithRetry';

// Resilient lazy load sub-components for optimized performance & network failure recovery
const DashboardOverview = lazyWithRetry(() => import('./panelmember/DashboardOverview'));
const MyInterviews = lazyWithRetry(() => import('./panelmember/MyInterviews'));
const FeedbackEvaluations = lazyWithRetry(() => import('./panelmember/FeedbackEvaluations'));
const ReportsAnalytics = lazyWithRetry(() => import('./panelmember/ReportsAnalytics'));
const ProfileSettings = lazyWithRetry(() => import('./panelmember/ProfileSettings'));

const PanelMemberDashboard = () => {
  // Background preload all section chunks during idle time
  useEffect(() => {
    const preloadAll = () => {
      MyInterviews.preload?.();
      FeedbackEvaluations.preload?.();
      ReportsAnalytics.preload?.();
      ProfileSettings.preload?.();
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
      <Suspense fallback={<SkeletonLoader loading={true} variant="dashboard" />}>
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="interviews/*" element={<MyInterviews />} />
          <Route path="feedback/*" element={<FeedbackEvaluations />} />
          <Route path="reports/*" element={<ReportsAnalytics />} />
          <Route path="profile/*" element={<ProfileSettings />} />
          <Route path="*" element={<Navigate to="/panel-member" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default PanelMemberDashboard;

