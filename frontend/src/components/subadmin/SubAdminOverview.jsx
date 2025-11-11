import React, { useMemo } from 'react';
import styled from 'styled-components';
import DashboardOverview from '../superadmin/DashboardOverview';
import { useAuth } from '../../contexts/AuthContext';

const PageWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2.5vw, 2.5rem);
`;

const WelcomeCard = styled.div`
  background: white;
  border-radius: 18px;
  padding: clamp(1.75rem, 2.5vw, 2.75rem);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const Title = styled.h2`
  margin: 0;
  color: #0f172a;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #475569;
  font-size: clamp(1rem, 1.6vw, 1.05rem);
  max-width: 720px;
  line-height: 1.6;
`;

const ModuleBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.5rem;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  letter-spacing: 0.02em;
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
    label: 'Panel & Access'
  }
];

const SubAdminOverview = () => {
  const { user, hasPermission } = useAuth();

  const accessibleModules = useMemo(
    () => moduleConfig.filter((module) => hasPermission(module.permission)),
    [hasPermission]
  );

  if (accessibleModules.length === 0) {
    return (
      <EmptyState>
        No modules are currently assigned to your sub admin profile. Please contact a super admin to grant the
        necessary permissions so you can view recruitment intelligence here.
      </EmptyState>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Sub Admin';

  return (
    <PageWrapper>
      <WelcomeCard>
        <Title>Welcome back, {firstName} 👋</Title>
        <Subtitle>
          Here&apos;s a live snapshot of the recruitment activities you oversee. Use the quick stats to stay ahead
          of form responses, candidate progress, tests, and interviews without jumping between modules.
        </Subtitle>
        <ModuleBadges>
          {accessibleModules.map((module) => (
            <Badge key={module.permission}>{module.label}</Badge>
          ))}
        </ModuleBadges>
      </WelcomeCard>

      <DashboardOverview />
    </PageWrapper>
  );
};

export default SubAdminOverview;

