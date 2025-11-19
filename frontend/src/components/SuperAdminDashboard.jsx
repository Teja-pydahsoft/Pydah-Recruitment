import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import sub-components
import FormSubmissions from './superadmin/FormSubmissions';
import CandidateManagement from './superadmin/CandidateManagement';
import TestsManagement from './superadmin/TestsManagement';
import InterviewsManagement from './superadmin/InterviewsManagement';
import UsersManagement from './superadmin/UsersManagement';
import DashboardOverview from './superadmin/DashboardOverview';
import FormsManagement from './superadmin/FormsManagement';
import TestResults from './superadmin/TestResults';
import InterviewFeedback from './superadmin/InterviewFeedback';
import SubAdminManagement from './superadmin/SubAdminManagement';
import NotificationSettings from './superadmin/NotificationSettings';
import CourseManagement from './superadmin/CourseManagement';

const SuperAdminDashboard = () => {
  return (
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
  );
};

export default SuperAdminDashboard;
