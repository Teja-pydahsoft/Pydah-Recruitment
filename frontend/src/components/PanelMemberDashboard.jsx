import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import sub-components
import DashboardOverview from './panelmember/DashboardOverview';
import MyInterviews from './panelmember/MyInterviews';
import FeedbackEvaluations from './panelmember/FeedbackEvaluations';
import ReportsAnalytics from './panelmember/ReportsAnalytics';
import ProfileSettings from './panelmember/ProfileSettings';

const PanelMemberDashboard = () => {
  return (
    <Routes>
      <Route index element={<DashboardOverview />} />
      <Route path="interviews/*" element={<MyInterviews />} />
      <Route path="feedback/*" element={<FeedbackEvaluations />} />
      <Route path="reports/*" element={<ReportsAnalytics />} />
      <Route path="profile/*" element={<ProfileSettings />} />
      <Route path="*" element={<Navigate to="/panel-member" replace />} />
    </Routes>
  );
};

export default PanelMemberDashboard;
