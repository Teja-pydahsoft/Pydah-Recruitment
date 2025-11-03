import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FaUsers,
  FaFileAlt,
  FaCalendarCheck,
  FaClipboardList,
  FaClock
} from 'react-icons/fa';
import LoadingSpinner from '../LoadingSpinner';
import api from '../../services/api';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const OverviewContainer = styled.div`
  padding: 2rem 0;
  animation: ${fadeInUp} 0.6s ease-out;
`;

const OverviewWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatsCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return 'linear-gradient(90deg, #2563eb, #3b82f6)';
        case 'success': return 'linear-gradient(90deg, #10b981, #059669)';
        case 'info': return 'linear-gradient(90deg, #06b6d4, #0891b2)';
        case 'warning': return 'linear-gradient(90deg, #f59e0b, #d97706)';
        case 'danger': return 'linear-gradient(90deg, #ef4444, #dc2626)';
        default: return 'linear-gradient(90deg, #6b7280, #4b5563)';
      }
    }};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  animation: ${fadeInUp} 0.6s ease-out both;
`;

const StatsIcon = styled.div`
  font-size: 2rem;
  color: ${props => {
    switch (props.$variant) {
      case 'primary': return '#2563eb';
      case 'success': return '#10b981';
      case 'info': return '#06b6d4';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  margin-bottom: 1rem;
  opacity: 0.8;
`;

const StatsNumber = styled.span`
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.5rem;
`;

const StatsLabel = styled.span`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch data from multiple endpoints
        const [formsRes, candidatesRes, testsRes, interviewsRes] = await Promise.all([
          api.get('/forms'),
          api.get('/candidates'),
          api.get('/tests'),
          api.get('/interviews')
        ]);

        const forms = formsRes.data.forms || [];
        const candidates = candidatesRes.data.candidates || [];
        const tests = testsRes.data.tests || [];
        const interviews = interviewsRes.data.interviews || [];

        // Calculate stats
        const activeForms = forms.filter(form => form.isActive !== false).length;
        const pendingCandidates = candidates.filter(candidate => candidate.status === 'pending').length;

        setStats({
          totalForms: activeForms,
          totalCandidates: candidates.length,
          totalTests: tests.length,
          totalInterviews: interviews.length,
          pendingApprovals: pendingCandidates
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Fallback to mock data if API fails
        setStats({
          totalForms: 0,
          totalCandidates: 0,
          totalTests: 0,
          totalInterviews: 0,
          pendingApprovals: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <OverviewContainer>
      <OverviewWrapper>
        {/* Dashboard Header */}

        {/* Quick Stats */}
        <StatsGrid>
          <StatsCard $variant="primary" style={{ animationDelay: '0.1s' }}>
            <StatsIcon $variant="primary">
              <FaFileAlt />
            </StatsIcon>
            <StatsNumber>{stats.totalForms}</StatsNumber>
            <StatsLabel>Active Forms</StatsLabel>
          </StatsCard>
          <StatsCard $variant="success" style={{ animationDelay: '0.2s' }}>
            <StatsIcon $variant="success">
              <FaUsers />
            </StatsIcon>
            <StatsNumber>{stats.totalCandidates}</StatsNumber>
            <StatsLabel>Total Candidates</StatsLabel>
          </StatsCard>
          <StatsCard $variant="info" style={{ animationDelay: '0.3s' }}>
            <StatsIcon $variant="info">
              <FaClipboardList />
            </StatsIcon>
            <StatsNumber>{stats.totalTests}</StatsNumber>
            <StatsLabel>Active Tests</StatsLabel>
          </StatsCard>
          <StatsCard $variant="warning" style={{ animationDelay: '0.4s' }}>
            <StatsIcon $variant="warning">
              <FaCalendarCheck />
            </StatsIcon>
            <StatsNumber>{stats.totalInterviews}</StatsNumber>
            <StatsLabel>Interviews</StatsLabel>
          </StatsCard>
          <StatsCard $variant="danger" style={{ animationDelay: '0.5s' }}>
            <StatsIcon $variant="danger">
              <FaClock />
            </StatsIcon>
            <StatsNumber>{stats.pendingApprovals}</StatsNumber>
            <StatsLabel>Pending Approvals</StatsLabel>
          </StatsCard>
        </StatsGrid>

        {/* Enhanced workflow content removed */}
      </OverviewWrapper>
    </OverviewContainer>
  );
};

export default DashboardOverview;
