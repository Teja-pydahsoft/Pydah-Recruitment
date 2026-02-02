import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChartBar, FaChartLine, FaChartPie, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import api from '../../services/api';
import SkeletonLoader from '../SkeletonLoader';

const Container = styled.div`
  padding: 2rem 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.75rem 0;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0;
  }
`;

const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0 0.5rem;
    max-width: 100%;
  }

  @media (max-width: 480px) {
    padding: 0 0.5rem;
    max-width: 100%;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ea580c, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0 0.5rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
    padding: 0;
  }
`;

const ErrorState = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  border: 1px solid #fecaca;
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const RetryButton = styled.button`
  background: #ea580c;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #dc2626;
    transform: translateY(-2px);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }
`;

const StatsCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
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
        case 'primary': return 'linear-gradient(90deg, #3b82f6, #2563eb)';
        case 'success': return 'linear-gradient(90deg, #10b981, #059669)';
        case 'warning': return 'linear-gradient(90deg, #f59e0b, #d97706)';
        case 'info': return 'linear-gradient(90deg, #06b6d4, #0891b2)';
        default: return 'linear-gradient(90deg, #6b7280, #4b5563)';
      }
    }};
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const StatsIcon = styled.div`
  font-size: 2.5rem;
  color: ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#06b6d4';
      default: return '#6b7280';
    }
  }};
  margin-bottom: 1rem;
  opacity: 0.8;

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
  }
`;

const StatsLabel = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.75rem;
    letter-spacing: 0.3px;
  }

  @media (max-width: 480px) {
    font-size: 0.7rem;
    letter-spacing: 0.25px;
  }
`;

const StatsValue = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }
`;

const StatsChange = styled.div`
  font-size: 0.875rem;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const EmptyText = styled.p`
  color: #64748b;
  font-size: 1rem;
`;

const ReportsAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/interviews/panel-member/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Wrapper>
          <Header>
            <Title>Reports & Analytics</Title>
            <Subtitle>View comprehensive interview reports and performance statistics</Subtitle>
          </Header>
          <SkeletonLoader loading={true} variant="dashboard" />
        </Wrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Wrapper>
        <Header>
          <Title>Reports & Analytics</Title>
          <Subtitle>View comprehensive interview reports and performance statistics</Subtitle>
        </Header>

        {error && (
          <ErrorState>
            <ErrorMessage>
              <FaExclamationTriangle />
              {error}
            </ErrorMessage>
            <RetryButton onClick={fetchStats}>
              <FaRedo />
              Retry
            </RetryButton>
          </ErrorState>
        )}

        {!stats ? (
          <EmptyState>
            <EmptyIcon>
              <FaChartBar />
            </EmptyIcon>
            <EmptyTitle>No Data Available</EmptyTitle>
            <EmptyText>No analytics data available at the moment.</EmptyText>
          </EmptyState>
        ) : (
          <StatsGrid>
            <StatsCard $variant="primary">
              <StatsIcon $variant="primary">
                <FaChartBar />
              </StatsIcon>
              <StatsLabel>Total Interviews</StatsLabel>
              <StatsValue>{stats.totalInterviews || 0}</StatsValue>
              <StatsChange positive>All time</StatsChange>
            </StatsCard>

            <StatsCard $variant="info">
              <StatsIcon $variant="info">
                <FaChartLine />
              </StatsIcon>
              <StatsLabel>This Week</StatsLabel>
              <StatsValue>{stats.interviewsThisWeek || 0}</StatsValue>
              <StatsChange positive>Active period</StatsChange>
            </StatsCard>

            <StatsCard $variant="success">
              <StatsIcon $variant="success">
                <FaChartPie />
              </StatsIcon>
              <StatsLabel>Feedback Given</StatsLabel>
              <StatsValue>{stats.feedbackGiven || 0}</StatsValue>
              <StatsChange positive>Completed</StatsChange>
            </StatsCard>

            <StatsCard $variant="warning">
              <StatsIcon $variant="warning">
                <FaChartBar />
              </StatsIcon>
              <StatsLabel>Completion Rate</StatsLabel>
              <StatsValue>{stats.completionRate || 0}%</StatsValue>
              <StatsChange positive={stats.completionRate >= 80}>
                {stats.completionRate >= 80 ? 'Excellent' : 'Good'}
              </StatsChange>
            </StatsCard>
          </StatsGrid>
        )}
      </Wrapper>
    </Container>
  );
};

export default ReportsAnalytics;

