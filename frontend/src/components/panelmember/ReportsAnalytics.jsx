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
  background: linear-gradient(135deg, #06b6d4, #22d3ee);
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
  background: #06b6d4;
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

const MobileActiveBar = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.4rem 0.8rem;
    background: ${props => (props.$active ? '#0f172a' : '#ffffff')};
    color: ${props => (props.$active ? '#ffffff' : '#64748b')};
    border-radius: 9999px;
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid ${props => (props.$active ? '#1e293b' : '#e2e8f0')};
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    min-height: 32px;
    text-align: center;
    width: 100%;

    .active-title {
      font-weight: 700;
      color: ${props => (props.$active ? '#38bdf8' : '#0f172a')};
    }

    .active-meta {
      opacity: 0.85;
      font-size: 0.72rem;
      color: ${props => (props.$active ? '#cbd5e1' : '#94a3b8')};
    }
  }
`;

const StatsTooltip = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: absolute;
    bottom: calc(100% + 8px);
    ${props => {
      if (props.$position === 'left') return 'left: 0;';
      if (props.$position === 'right') return 'right: 0; left: auto;';
      return 'left: 50%; transform: translateX(-50%);';
    }}
    background: #0f172a;
    color: #ffffff;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
    opacity: ${props => (props.$show ? 1 : 0)};
    visibility: ${props => (props.$show ? 'visible' : 'hidden')};
    pointer-events: none;
    transition: opacity 0.15s ease;
    z-index: 99999;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);

    &::after {
      content: '';
      position: absolute;
      top: 100%;
      ${props => {
        if (props.$position === 'left') return 'left: 28px;';
        if (props.$position === 'right') return 'right: 28px; left: auto;';
        return 'left: 50%; transform: translateX(-50%);';
      }}
      border: 5px solid transparent;
      border-top-color: #0f172a;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 0.35rem !important;
    margin-top: 1.25rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 0.25rem !important;
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
  overflow: visible;
  z-index: ${props => (props.$isHovered ? 50 : 1)};

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
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
    padding: 0.5rem 0.2rem;
    min-width: 0;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;

    ${props =>
      props.$isHovered &&
      `
      border-color: #0ea5e9 !important;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.4) !important;
      transform: translateY(-2px) !important;
    `}

    &::before {
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .stats-label, .stats-change {
      display: none !important;
    }

    &:hover .stats-tooltip-el,
    &:active .stats-tooltip-el,
    &:focus .stats-tooltip-el {
      opacity: 1 !important;
      visibility: visible !important;
    }
  }

  @media (max-width: 480px) {
    padding: 0.45rem 0.15rem;
    border-radius: 6px;

    &::before {
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }
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
    font-size: 1.15rem;
    margin-bottom: 0.15rem;
    display: flex;
    justify-content: center;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.1rem;
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
    font-size: 1.15rem;
    margin-bottom: 0;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0;
  }
`;

const StatsChange = styled.div`
  font-size: 0.875rem;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
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
  const [hoveredCard, setHoveredCard] = useState(null);
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
          <>
            {/* ── Mobile Active Stat Bar Indicator ────────────────────────── */}
            {(() => {
              const statsMap = {
                total: { label: 'Total Interviews', value: `${stats.totalInterviews || 0} all time` },
                week: { label: 'Interviews This Week', value: `${stats.interviewsThisWeek || 0} active period` },
                feedback: { label: 'Feedback Given', value: `${stats.feedbackGiven || 0} completed` },
                rate: { label: 'Completion Rate', value: `${stats.completionRate || 0}% rate` }
              };
              const activeItem = hoveredCard ? statsMap[hoveredCard] : null;
              return (
                <MobileActiveBar $active={!!activeItem}>
                  {activeItem ? (
                    <>
                      <span className="active-title">{activeItem.label}</span>
                      <span className="active-meta">• {activeItem.value}</span>
                    </>
                  ) : (
                    <span>Hover or tap any metric to see details</span>
                  )}
                </MobileActiveBar>
              );
            })()}

            <StatsGrid>
            <StatsCard
              $variant="primary"
              $isHovered={hoveredCard === 'total'}
              tabIndex={0}
              onMouseEnter={() => setHoveredCard('total')}
              onMouseLeave={() => setHoveredCard(null)}
              onTouchStart={() => setHoveredCard(prev => (prev === 'total' ? null : 'total'))}
            >
              <StatsTooltip
                className="stats-tooltip-el"
                $position="left"
                $show={hoveredCard === 'total'}
              >
                Total Interviews
              </StatsTooltip>
              <StatsIcon $variant="primary">
                <FaChartBar />
              </StatsIcon>
              <StatsLabel className="stats-label">Total Interviews</StatsLabel>
              <StatsValue>{stats.totalInterviews || 0}</StatsValue>
              <StatsChange className="stats-change" $positive>All time</StatsChange>
            </StatsCard>

            <StatsCard
              $variant="info"
              $isHovered={hoveredCard === 'week'}
              tabIndex={0}
              onMouseEnter={() => setHoveredCard('week')}
              onMouseLeave={() => setHoveredCard(null)}
              onTouchStart={() => setHoveredCard(prev => (prev === 'week' ? null : 'week'))}
            >
              <StatsTooltip
                className="stats-tooltip-el"
                $position="center"
                $show={hoveredCard === 'week'}
              >
                This Week
              </StatsTooltip>
              <StatsIcon $variant="info">
                <FaChartLine />
              </StatsIcon>
              <StatsLabel className="stats-label">This Week</StatsLabel>
              <StatsValue>{stats.interviewsThisWeek || 0}</StatsValue>
              <StatsChange className="stats-change" $positive>Active period</StatsChange>
            </StatsCard>

            <StatsCard
              $variant="success"
              $isHovered={hoveredCard === 'feedback'}
              tabIndex={0}
              onMouseEnter={() => setHoveredCard('feedback')}
              onMouseLeave={() => setHoveredCard(null)}
              onTouchStart={() => setHoveredCard(prev => (prev === 'feedback' ? null : 'feedback'))}
            >
              <StatsTooltip
                className="stats-tooltip-el"
                $position="center"
                $show={hoveredCard === 'feedback'}
              >
                Feedback Given
              </StatsTooltip>
              <StatsIcon $variant="success">
                <FaChartPie />
              </StatsIcon>
              <StatsLabel className="stats-label">Feedback Given</StatsLabel>
              <StatsValue>{stats.feedbackGiven || 0}</StatsValue>
              <StatsChange className="stats-change" $positive>Completed</StatsChange>
            </StatsCard>

            <StatsCard
              $variant="warning"
              $isHovered={hoveredCard === 'rate'}
              tabIndex={0}
              onMouseEnter={() => setHoveredCard('rate')}
              onMouseLeave={() => setHoveredCard(null)}
              onTouchStart={() => setHoveredCard(prev => (prev === 'rate' ? null : 'rate'))}
            >
              <StatsTooltip
                className="stats-tooltip-el"
                $position="right"
                $show={hoveredCard === 'rate'}
              >
                Completion Rate
              </StatsTooltip>
              <StatsIcon $variant="warning">
                <FaChartBar />
              </StatsIcon>
              <StatsLabel className="stats-label">Completion Rate</StatsLabel>
              <StatsValue>{stats.completionRate || 0}%</StatsValue>
              <StatsChange className="stats-change" $positive={stats.completionRate >= 80}>
                {stats.completionRate >= 80 ? 'Excellent' : 'Good'}
              </StatsChange>
            </StatsCard>
          </StatsGrid>
          </>
        )}
      </Wrapper>
    </Container>
  );
};

export default ReportsAnalytics;

