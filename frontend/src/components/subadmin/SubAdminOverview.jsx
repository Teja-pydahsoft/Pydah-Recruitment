import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaFileAlt, FaUsers, FaClipboardList, FaCalendarAlt, FaUserShield } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Title = styled.h2`
  margin: 0;
  color: #1e293b;
  font-size: 2rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 1rem;
  max-width: 720px;
`;

const ModulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
`;

const ModuleCard = styled.button`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  color: inherit;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  }
`;

const ModuleIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  font-size: 1.5rem;
`;

const ModuleTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.2rem;
  font-weight: 600;
`;

const ModuleDescription = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.6;
`;

const EmptyState = styled.div`
  background: rgba(248, 113, 113, 0.08);
  border: 1px dashed rgba(248, 113, 113, 0.4);
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  color: #991b1b;
  font-weight: 500;
`;

const moduleConfig = [
  {
    key: 'forms.manage',
    title: 'Forms & Submissions',
    description:
      'Create recruitment forms, manage workflows, and review incoming submissions before approval.',
    icon: FaFileAlt,
    route: '/sub-admin/forms'
  },
  {
    key: 'candidates.manage',
    title: 'Candidate Lifecycle',
    description:
      'Review applications, update candidate statuses, and prepare candidates for next steps.',
    icon: FaUsers,
    route: '/sub-admin/candidates'
  },
  {
    key: 'tests.manage',
    title: 'Assessments & Tests',
    description:
      'Configure assessments, schedule tests, monitor performance, and release results.',
    icon: FaClipboardList,
    route: '/sub-admin/tests'
  },
  {
    key: 'interviews.manage',
    title: 'Interviews & Feedback',
    description:
      'Plan interviews, coordinate panel members, and review structured feedback in one view.',
    icon: FaCalendarAlt,
    route: '/sub-admin/interviews'
  },
  {
    key: 'users.manage',
    title: 'Panel & Access',
    description:
      'Onboard panel members, configure access, and ensure the right reviewers are assigned.',
    icon: FaUserShield,
    route: '/sub-admin/users'
  }
];

const SubAdminOverview = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const availableModules = moduleConfig.filter(module => hasPermission(module.key));

  return (
    <Container>
      <Header>
        <Title>Welcome back, {user?.name?.split(' ')[0] || 'Sub Admin'} 👋</Title>
        <Subtitle>
          Manage the recruitment workflow entrusted to you. Pick a module to get started or return to this
          overview anytime for a quick summary of your delegated responsibilities.
        </Subtitle>
      </Header>

      {availableModules.length > 0 ? (
        <ModulesGrid>
          {availableModules.map(module => (
            <ModuleCard key={module.key} onClick={() => navigate(module.route)}>
              <ModuleIcon>
                <module.icon />
              </ModuleIcon>
              <ModuleTitle>{module.title}</ModuleTitle>
              <ModuleDescription>{module.description}</ModuleDescription>
            </ModuleCard>
          ))}
        </ModulesGrid>
      ) : (
        <EmptyState>
          No modules are currently assigned to your sub admin profile. Please contact a super admin to grant
          permissions.
        </EmptyState>
      )}
    </Container>
  );
};

export default SubAdminOverview;

