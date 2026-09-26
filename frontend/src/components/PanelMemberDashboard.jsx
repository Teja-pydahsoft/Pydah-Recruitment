import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SkeletonLoader from './SkeletonLoader';

// Lazy load sub-components for optimized performance
const DashboardOverview = lazy(() => import('./panelmember/DashboardOverview'));
const MyInterviews = lazy(() => import('./panelmember/MyInterviews'));
const FeedbackEvaluations = lazy(() => import('./panelmember/FeedbackEvaluations'));
const ReportsAnalytics = lazy(() => import('./panelmember/ReportsAnalytics'));
const ProfileSettings = lazy(() => import('./panelmember/ProfileSettings'));

const PanelMemberDashboard = () => {
  return (
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
  );
};

export default PanelMemberDashboard;
