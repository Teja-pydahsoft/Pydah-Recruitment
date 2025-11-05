import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaCalendarAlt, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaRedo, FaVideo } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const Container = styled.div`
  padding: 2rem 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
`;

const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
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
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
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

const InterviewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
`;

const InterviewCard = styled.div`
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
      if (props.status === 'completed') return 'linear-gradient(90deg, #10b981, #059669)';
      if (props.status === 'pending') return 'linear-gradient(90deg, #f59e0b, #d97706)';
      return 'linear-gradient(90deg, #3b82f6, #2563eb)';
    }};
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`;

const InterviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const InterviewTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const StatusBadge = styled.span`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${props => {
    if (props.status === 'completed') return '#dcfce7';
    if (props.status === 'pending') return '#fef3c7';
    return '#dbeafe';
  }};
  color: ${props => {
    if (props.status === 'completed') return '#166534';
    if (props.status === 'pending') return '#92400e';
    return '#1d4ed8';
  }};
`;

const InterviewDetails = styled.div`
  margin-top: 1.5rem;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #64748b;
  font-size: 0.95rem;
`;

const DetailIcon = styled.span`
  color: #ea580c;
  font-size: 1rem;
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

const MyInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/interviews/panel-member/upcoming');
      setInterviews(response.data.interviews || []);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
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
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getStatus = (interview) => {
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

  if (loading) {
    return (
      <Container>
        <Wrapper>
          <Header>
            <Title>My Interviews</Title>
            <Subtitle>View and manage your assigned interview schedules</Subtitle>
          </Header>
          <LoadingSpinner />
        </Wrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Wrapper>
        <Header>
          <Title>My Interviews</Title>
          <Subtitle>View and manage your assigned interview schedules</Subtitle>
        </Header>

        {error && (
          <ErrorState>
            <ErrorMessage>
              <FaExclamationTriangle />
              {error}
            </ErrorMessage>
            <RetryButton onClick={fetchInterviews}>
              <FaRedo />
              Retry
            </RetryButton>
          </ErrorState>
        )}

        {interviews.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <FaCalendarAlt />
            </EmptyIcon>
            <EmptyTitle>No Interviews Scheduled</EmptyTitle>
            <EmptyText>You don't have any interviews assigned at the moment.</EmptyText>
          </EmptyState>
        ) : (
          <InterviewsGrid>
            {interviews.map((interview) => {
              const status = getStatus(interview);
              return (
                <InterviewCard key={interview._id} status={status}>
                  <InterviewHeader>
                    <InterviewTitle>{interview.title}</InterviewTitle>
                    <StatusBadge status={status}>
                      {status === 'completed' ? (
                        <>
                          <FaCheckCircle /> Completed
                        </>
                      ) : status === 'pending' ? (
                        <>
                          <FaClock /> Pending
                        </>
                      ) : (
                        <>
                          <FaCalendarAlt /> Upcoming
                        </>
                      )}
                    </StatusBadge>
                  </InterviewHeader>

                  <InterviewDetails>
                    <DetailRow>
                      <DetailIcon>
                        <FaUser />
                      </DetailIcon>
                      <span><strong>Candidate:</strong> {interview.candidate?.name || 'Unknown'}</span>
                    </DetailRow>
                    <DetailRow>
                      <DetailIcon>
                        <FaCalendarAlt />
                      </DetailIcon>
                      <span><strong>Position:</strong> {interview.form?.title || 'N/A'}</span>
                    </DetailRow>
                    <DetailRow>
                      <DetailIcon>
                        <FaClock />
                      </DetailIcon>
                      <span><strong>Scheduled:</strong> {formatDate(interview.scheduledAt)}</span>
                    </DetailRow>
                    {interview.meetingLink && (
                      <DetailRow>
                        <DetailIcon>
                          <FaVideo />
                        </DetailIcon>
                        <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                          Join Meeting
                        </a>
                      </DetailRow>
                    )}
                  </InterviewDetails>
                </InterviewCard>
              );
            })}
          </InterviewsGrid>
        )}
      </Wrapper>
    </Container>
  );
};

export default MyInterviews;

