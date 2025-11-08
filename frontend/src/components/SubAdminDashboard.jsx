import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Reuse existing super admin modules where applicable
import FormsManagement from './superadmin/FormsManagement';
import FormSubmissions from './superadmin/FormSubmissions';
import CandidateManagement from './superadmin/CandidateManagement';
import TestsManagement from './superadmin/TestsManagement';
import TestResults from './superadmin/TestResults';
import InterviewsManagement from './superadmin/InterviewsManagement';
import InterviewFeedback from './superadmin/InterviewFeedback';
import UsersManagement from './superadmin/UsersManagement';
import SubAdminOverview from './subadmin/SubAdminOverview';
import PermissionDenied from './subadmin/SubAdminPermissionDenied';

const SubAdminDashboard = () => {
  const { hasPermission } = useAuth();

  const guard = (permission, element) => {
    if (!permission) {
      return element;
    }

    return hasPermission(permission) ? element : <PermissionDenied requiredPermission={permission} />;
  };

  return (
    <Routes>
      <Route index element={<SubAdminOverview />} />
      <Route path="forms/*" element={guard('forms.manage', <FormsManagement />)} />
      <Route path="submissions/*" element={guard('forms.manage', <FormSubmissions />)} />
      <Route path="candidates/*" element={guard('candidates.manage', <CandidateManagement />)} />
      <Route path="tests/*" element={guard('tests.manage', <TestsManagement />)} />
      <Route path="test-results/*" element={guard('tests.manage', <TestResults />)} />
      <Route path="interviews/*" element={guard('interviews.manage', <InterviewsManagement />)} />
      <Route path="interview-feedback/*" element={guard('interviews.manage', <InterviewFeedback />)} />
      <Route path="users/*" element={guard('users.manage', <UsersManagement />)} />
      <Route path="*" element={<Navigate to="/sub-admin" replace />} />
    </Routes>
  );
};

export default SubAdminDashboard;

