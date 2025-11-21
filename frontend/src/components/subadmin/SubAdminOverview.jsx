import React from 'react';
import styled from 'styled-components';
import DashboardOverview from '../superadmin/DashboardOverview';
import { useAuth } from '../../contexts/AuthContext';

const PageWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2.5vw, 2.5rem);
`;

const EmptyState = styled.div`
  background: rgba(248, 113, 113, 0.08);
  border: 1px dashed rgba(248, 113, 113, 0.4);
  padding: clamp(2rem, 3vw, 2.75rem);
  border-radius: 18px;
  text-align: center;
  color: #991b1b;
  font-weight: 600;
  max-width: 760px;
  margin: 0 auto;
  line-height: 1.6;
`;

const moduleConfig = [
  {
    permission: 'forms.manage',
    label: 'Forms & Submissions'
  },
  {
    permission: 'candidates.manage',
    label: 'Candidate Lifecycle'
  },
  {
    permission: 'tests.manage',
    label: 'Assessments & Tests'
  },
  {
    permission: 'interviews.manage',
    label: 'Interviews & Feedback'
  },
  {
    permission: 'users.manage',
    label: 'User Management'
  },
  {
    permission: 'panel_members.manage',
    label: 'Panel Members'
  }
];

const SubAdminOverview = () => {
  const { hasPermission } = useAuth();

  const accessibleModules = moduleConfig.filter((module) => hasPermission(module.permission));

  if (accessibleModules.length === 0) {
    return (
      <EmptyState>
        No modules are currently assigned to your sub admin profile. Please contact a super admin to grant the
        necessary permissions so you can view recruitment intelligence here.
      </EmptyState>
    );
  }

  return (
    <PageWrapper>
      <DashboardOverview />
    </PageWrapper>
  );
};

export default SubAdminOverview;

