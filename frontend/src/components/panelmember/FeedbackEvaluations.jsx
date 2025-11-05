import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaClipboardCheck, FaUser, FaCalendarAlt, FaExclamationTriangle, FaRedo, FaCheckCircle, FaClock } from 'react-icons/fa';
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

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
`;

const FeedbackCard = styled.div`
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
      if (props.status === 'submitted') return 'linear-gradient(90deg, #10b981, #059669)';
      if (props.status === 'pending') return 'linear-gradient(90deg, #f59e0b, #d97706)';
      return 'linear-gradient(90deg, #6b7280, #4b5563)';
    }};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`;

const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const FeedbackTitle = styled.h3`
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
    if (props.status === 'submitted') return '#dcfce7';
    if (props.status === 'pending') return '#fef3c7';
    return '#e5e7eb';
  }};
  color: ${props => {
    if (props.status === 'submitted') return '#166534';
    if (props.status === 'pending') return '#92400e';
    return '#374151';
  }};
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const FeedbackDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

const FeedbackEvaluations = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch interviews assigned to this panel member
      const interviewsResponse = await api.get('/interviews');
      const assignedInterviews = interviewsResponse.data.interviews || [];
      
      // Fetch feedback data for these interviews
      const feedbackData = [];
      for (const interview of assignedInterviews) {
        if (interview.candidates && interview.candidates.length > 0) {
          for (const candidateEntry of interview.candidates) {
            if (candidateEntry.candidate) {
              const candidate = candidateEntry.candidate;
              const hasFeedback = candidate.interviewFeedback?.some(
                f => f.interview?._id === interview._id && f.panelMember?._id
              );
              
              feedbackData.push({
                interviewId: interview._id,
                interviewTitle: interview.title,
                candidateId: candidate._id,
                candidateName: candidate.name || candidate.user?.name || 'Unknown',
                formTitle: interview.form?.title || 'N/A',
                scheduledAt: candidateEntry.scheduledDate || interview.createdAt,
                status: hasFeedback ? 'submitted' : 'pending',
                feedback: candidate.interviewFeedback?.find(
                  f => f.interview?._id === interview._id
                )
              });
            }
          }
        }
      }
      
      setFeedback(feedbackData);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.response?.data?.message || 'Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Container>
        <Wrapper>
          <Header>
            <Title>Feedback & Evaluations</Title>
            <Subtitle>Submit and manage interview feedback</Subtitle>
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
          <Title>Feedback & Evaluations</Title>
          <Subtitle>Submit and manage interview feedback</Subtitle>
        </Header>

        {error && (
          <ErrorState>
            <ErrorMessage>
              <FaExclamationTriangle />
              {error}
            </ErrorMessage>
            <RetryButton onClick={fetchFeedback}>
              <FaRedo />
              Retry
            </RetryButton>
          </ErrorState>
        )}

        {feedback.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <FaClipboardCheck />
            </EmptyIcon>
            <EmptyTitle>No Feedback Required</EmptyTitle>
            <EmptyText>You don't have any interviews pending feedback at the moment.</EmptyText>
          </EmptyState>
        ) : (
          <FeedbackList>
            {feedback.map((item, index) => (
              <FeedbackCard key={`${item.interviewId}-${item.candidateId}-${index}`} status={item.status}>
                <FeedbackHeader>
                  <FeedbackTitle>{item.interviewTitle}</FeedbackTitle>
                  <StatusBadge status={item.status}>
                    {item.status === 'submitted' ? (
                      <>
                        <FaCheckCircle /> Submitted
                      </>
                    ) : (
                      <>
                        <FaClock /> Pending
                      </>
                    )}
                  </StatusBadge>
                </FeedbackHeader>

                <FeedbackDetails>
                  <DetailItem>
                    <DetailIcon>
                      <FaUser />
                    </DetailIcon>
                    <span><strong>Candidate:</strong> {item.candidateName}</span>
                  </DetailItem>
                  <DetailItem>
                    <DetailIcon>
                      <FaClipboardCheck />
                    </DetailIcon>
                    <span><strong>Position:</strong> {item.formTitle}</span>
                  </DetailItem>
                  <DetailItem>
                    <DetailIcon>
                      <FaCalendarAlt />
                    </DetailIcon>
                    <span><strong>Scheduled:</strong> {formatDate(item.scheduledAt)}</span>
                  </DetailItem>
                </FeedbackDetails>
              </FeedbackCard>
            ))}
          </FeedbackList>
        )}
      </Wrapper>
    </Container>
  );
};

export default FeedbackEvaluations;

