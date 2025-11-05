import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaCalendarAlt, FaClipboardCheck, FaChartBar, FaClock, FaCheckCircle, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

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

const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
  padding: 2rem 0;
`;

const DashboardWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  animation: ${fadeInUp} 0.6s ease-out;
`;

const DashboardTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ea580c, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const DashboardSubtitle = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const StatsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  animation: ${slideInLeft} 0.6s ease-out both;

  ${props => props.error && `
    border-color: #fecaca;
    background: #fef2f2;
  `}
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${props => props.error ? '#dc2626' : '#ea580c'};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

const MainCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const MainCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #ea580c, #f97316);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  }

  animation: ${fadeInUp} 0.6s ease-out both;
`;

const CardIcon = styled.div`
  font-size: 3rem;
  color: #ea580c;
  margin-bottom: 1.5rem;
  opacity: 0.8;
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
`;

const CardDescription = styled.p`
  color: #64748b;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #ea580c, #f97316);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const UpcomingInterviews = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
  animation: ${fadeInUp} 0.6s ease-out 0.6s both;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const InterviewItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 0;
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f8fafc;
    margin: 0 -2rem;
    padding-left: 2rem;
    padding-right: 2rem;
    border-radius: 8px;
  }

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const InterviewInfo = styled.div`
  flex: 1;
`;

const InterviewTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const InterviewDetails = styled.p`
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
`;

const InterviewTime = styled.div`
  color: ${props => props.completed ? '#10b981' : '#ea580c'};
  font-weight: 600;
  font-size: 0.9rem;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;

  &.upcoming {
    background: #dbeafe;
    color: #1d4ed8;
  }

  &.completed {
    background: #dcfce7;
    color: #166534;
  }

  &.pending {
    background: #fef3c7;
    color: #92400e;
    animation: ${pulse} 2s infinite;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;

  h4 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const DashboardOverview = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    upcomingInterviews: [],
    loading: true,
    error: null
  });

  const fetchDashboardData = async () => {
    setDashboardData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Fetch dashboard statistics
      const statsResponse = await api.get('/interviews/panel-member/stats');
      
      // Fetch upcoming interviews
      const interviewsResponse = await api.get('/interviews/panel-member/upcoming');
      
      setDashboardData({
        stats: statsResponse.data,
        upcomingInterviews: interviewsResponse.data.interviews || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to load dashboard data. Please try again.'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRetry = () => {
    fetchDashboardData();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getStatusClass = (interview) => {
    const now = new Date();
    const interviewDate = new Date(interview.scheduledAt);
    
    if (interview.status === 'completed') {
      return 'completed';
    } else if (interviewDate <= now && interview.status !== 'completed') {
      return 'pending';
    } else {
      return 'upcoming';
    }
  };

  if (dashboardData.loading) {
    return (
      <DashboardContainer>
        <DashboardWrapper>
          <HeaderSection>
            <DashboardTitle>Panel Member Dashboard</DashboardTitle>
            <DashboardSubtitle>
              Manage your assigned interviews, provide feedback, and track your evaluation progress.
            </DashboardSubtitle>
          </HeaderSection>
          <LoadingSpinner />
        </DashboardWrapper>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardWrapper>
        <HeaderSection>
          <DashboardTitle>Panel Member Dashboard</DashboardTitle>
          <DashboardSubtitle>
            Manage your assigned interviews, provide feedback, and track your evaluation progress.
          </DashboardSubtitle>
        </HeaderSection>

        {dashboardData.error && (
          <ErrorState>
            <ErrorMessage>
              <FaExclamationTriangle />
              {dashboardData.error}
            </ErrorMessage>
            <RetryButton onClick={handleRetry}>
              <FaRedo />
              Retry
            </RetryButton>
          </ErrorState>
        )}

        <StatsOverview>
          <StatCard style={{ animationDelay: '0.1s' }} error={!!dashboardData.error}>
            <StatNumber error={!!dashboardData.error}>
              {dashboardData.stats?.totalInterviews || 0}
            </StatNumber>
            <StatLabel>Total Interviews</StatLabel>
          </StatCard>
          <StatCard style={{ animationDelay: '0.2s' }} error={!!dashboardData.error}>
            <StatNumber error={!!dashboardData.error}>
              {dashboardData.stats?.interviewsThisWeek || 0}
            </StatNumber>
            <StatLabel>This Week</StatLabel>
          </StatCard>
          <StatCard style={{ animationDelay: '0.3s' }} error={!!dashboardData.error}>
            <StatNumber error={!!dashboardData.error}>
              {dashboardData.stats?.feedbackGiven || 0}
            </StatNumber>
            <StatLabel>Feedback Given</StatLabel>
          </StatCard>
          <StatCard style={{ animationDelay: '0.4s' }} error={!!dashboardData.error}>
            <StatNumber error={!!dashboardData.error}>
              {dashboardData.stats?.completionRate || 0}%
            </StatNumber>
            <StatLabel>Completion Rate</StatLabel>
          </StatCard>
        </StatsOverview>

        <MainCardsGrid>
          <MainCard style={{ animationDelay: '0.2s' }} onClick={() => navigate('/panel-member/interviews')}>
            <CardIcon>
              <FaCalendarAlt />
            </CardIcon>
            <CardTitle>My Interviews</CardTitle>
            <CardDescription>
              View and manage your assigned interview schedules. Access candidate profiles and prepare for upcoming sessions.
            </CardDescription>
            <ActionButton onClick={(e) => { e.stopPropagation(); navigate('/panel-member/interviews'); }}>
              <FaCalendarAlt />
              View Schedule
            </ActionButton>
          </MainCard>

          <MainCard style={{ animationDelay: '0.4s' }} onClick={() => navigate('/panel-member/feedback')}>
            <CardIcon>
              <FaClipboardCheck />
            </CardIcon>
            <CardTitle>Feedback & Evaluation</CardTitle>
            <CardDescription>
              Submit detailed evaluation feedback for completed interviews. Help candidates improve and make informed hiring decisions.
            </CardDescription>
            <ActionButton onClick={(e) => { e.stopPropagation(); navigate('/panel-member/feedback'); }}>
              <FaClipboardCheck />
              Submit Feedback
            </ActionButton>
          </MainCard>

          <MainCard style={{ animationDelay: '0.6s' }} onClick={() => navigate('/panel-member/reports')}>
            <CardIcon>
              <FaChartBar />
            </CardIcon>
            <CardTitle>Reports & Analytics</CardTitle>
            <CardDescription>
              View comprehensive interview reports, performance statistics, and recruitment analytics for your panel activities.
            </CardDescription>
            <ActionButton onClick={(e) => { e.stopPropagation(); navigate('/panel-member/reports'); }}>
              <FaChartBar />
              View Reports
            </ActionButton>
          </MainCard>
        </MainCardsGrid>

        <UpcomingInterviews>
          <SectionTitle>
            <FaClock />
            Upcoming Interviews
          </SectionTitle>

          {dashboardData.upcomingInterviews.length === 0 ? (
            <EmptyState>
              <h4>No upcoming interviews</h4>
              <p>You don't have any interviews scheduled at the moment.</p>
            </EmptyState>
          ) : (
            dashboardData.upcomingInterviews.map((interview, index) => (
              <InterviewItem key={interview._id} style={{ animationDelay: `${0.8 + index * 0.1}s` }}>
                <InterviewInfo>
                  <InterviewTitle>{interview.title}</InterviewTitle>
                  <InterviewDetails>
                    Candidate: {interview.candidate?.name || 'Unknown'} • Position: {interview.form?.title || 'N/A'}
                  </InterviewDetails>
                </InterviewInfo>
                <InterviewTime completed={interview.status === 'completed'}>
                  {interview.status === 'completed' ? 'Completed' : formatDate(interview.scheduledAt)}
                </InterviewTime>
                <StatusIndicator className={getStatusClass(interview)}>
                  {interview.status === 'completed' ? (
                    <>
                      <FaCheckCircle />
                      Completed
                    </>
                  ) : getStatusClass(interview) === 'pending' ? (
                    <>
                      <FaClock />
                      Pending
                    </>
                  ) : (
                    <>
                      <FaCalendarAlt />
                      Upcoming
                    </>
                  )}
                </StatusIndicator>
              </InterviewItem>
            ))
          )}
        </UpcomingInterviews>
      </DashboardWrapper>
    </DashboardContainer>
  );
};

export default DashboardOverview;

