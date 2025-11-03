import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import sub-components
import CandidatesManagement from './superadmin/CandidatesManagement';
import TestsManagement from './superadmin/TestsManagement';
import InterviewsManagement from './superadmin/InterviewsManagement';
import UsersManagement from './superadmin/UsersManagement';
import DashboardOverview from './superadmin/DashboardOverview';
import FormsManagement from './superadmin/FormsManagement';

const SuperAdminDashboard = () => {
  return (
    <Routes>
      <Route index element={<DashboardOverview />} />
      <Route path="creation/*" element={<FormsManagement />} />
      <Route path="candidates/*" element={<CandidatesManagement />} />
      <Route path="tests/*" element={<TestsManagement />} />
      <Route path="users/*" element={<UsersManagement />} />
      <Route path="interviews/*" element={<InterviewsManagement />} />
      <Route path="*" element={<Navigate to="/super-admin" replace />} />
    </Routes>
  );
};

export default SuperAdminDashboard;
