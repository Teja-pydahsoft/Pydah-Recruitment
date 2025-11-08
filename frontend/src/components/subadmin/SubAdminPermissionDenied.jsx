import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Wrapper = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 3rem 2rem;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(248, 113, 113, 0.25);
  text-align: center;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
`;

const Title = styled.h3`
  color: #b91c1c;
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const Description = styled.p`
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(239, 68, 68, 0.4);
  }
`;

const permissionLabels = {
  'forms.manage': 'Forms & Submissions',
  'candidates.manage': 'Candidate Lifecycle',
  'tests.manage': 'Tests & Assessments',
  'interviews.manage': 'Interviews & Feedback',
  'users.manage': 'Panel & Access Management'
};

const SubAdminPermissionDenied = ({ requiredPermission }) => {
  const displayName = permissionLabels[requiredPermission] || requiredPermission;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Wrapper>
        <Title>Permission Required</Title>
        <Description>
          This area is not part of your delegated responsibilities yet. If you believe you need access to{' '}
          <strong>{displayName}</strong>, please coordinate with a super admin to update your permissions.
        </Description>
        <BackLink to="/sub-admin">Return to Sub Admin Dashboard</BackLink>
      </Wrapper>
    </div>
  );
};

export default SubAdminPermissionDenied;

