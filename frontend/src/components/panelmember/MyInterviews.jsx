import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Badge } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaRedo, FaVideo, FaBriefcase, FaBuilding, FaClipboardCheck, FaArrowRight, FaChevronDown, FaChevronUp, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
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

const InterviewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 480px) {
    gap: 1rem;
    margin-top: 1rem;
  }
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

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const InterviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const InterviewTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
  }
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

  @media (max-width: 768px) {
    font-size: 0.85rem;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
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

const ActionButton = styled.button`
  background: ${props => {
    if (props.submitted) return '#10b981';
    return props.variant === 'primary' ? '#ea580c' : '#3b82f6';
  }};
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
  margin-top: 1rem;
  width: 100%;
  justify-content: center;
  font-size: 0.95rem;

  &:hover {
    background: ${props => {
      if (props.submitted) return '#059669';
      return props.variant === 'primary' ? '#dc2626' : '#2563eb';
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
  }

  @media (max-width: 480px) {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
`;

const FeedbackHistorySection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const FeedbackHistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: ${props => props.expanded ? '1rem' : '0'};
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
  }
`;

const FeedbackHistoryTitle = styled.div`
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FeedbackHistoryContent = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 0.5rem;
`;

const FeedbackItem = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #10b981;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FeedbackItemLabel = styled.div`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const FeedbackItemValue = styled.div`
  color: #6b7280;
  font-size: 0.95rem;
`;

const RatingDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

const StarIcon = styled.span`
  color: ${props => props.filled ? '#fbbf24' : '#d1d5db'};
  font-size: 1rem;
`;

const MyInterviews = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFeedback, setExpandedFeedback] = useState({});

  useEffect(() => {
    fetchInterviews();
    
    // Refresh when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInterviews();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Utility function to format date/time in IST (12-hour format)
  const formatISTDateTime = (dateString, timeString = '') => {
    if (!dateString) return 'Not scheduled';
    
    try {
      // Create date object and convert to IST
      const date = new Date(dateString);
      
      // Format date in IST (DD/MM/YYYY format)
      const dateOptions = { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit'
      };
      
      const formattedDate = date.toLocaleDateString('en-IN', dateOptions);
      // en-IN format is already DD/MM/YYYY, but let's ensure it
      const dateParts = formattedDate.split('/');
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const formattedDateStr = `${day}/${month}/${year}`;
      
      if (timeString) {
        // Parse time string (HH:MM format)
        const [hours, minutes] = timeString.split(':');
        if (hours && minutes) {
          const hour24 = parseInt(hours, 10);
          const min = minutes.padStart(2, '0');
          
          // Convert to 12-hour format
          const hour12 = hour24 % 12 || 12;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          
          // Format: HH:MM AM/PM IST
          const time12hr = `${hour12.toString().padStart(2, '0')}:${min} ${ampm} IST`;
          return `${formattedDateStr} ${time12hr}`;
        }
      }
      
      return formattedDateStr;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const formatDate = (dateString, timeString = '') => {
    if (!dateString) return 'Not scheduled';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Convert to IST for comparison
      const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      
      const isToday = istDate.toDateString() === istNow.toDateString();
      const isTomorrow = istDate.toDateString() === new Date(istNow.getTime() + 24 * 60 * 60 * 1000).toDateString();

      // Format time in 12-hour IST format
      let timeDisplay = '';
      if (timeString) {
        const [hours, minutes] = timeString.split(':');
        if (hours && minutes) {
          const hour24 = parseInt(hours, 10);
          const min = minutes.padStart(2, '0');
          const hour12 = hour24 % 12 || 12;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          timeDisplay = ` ${hour12.toString().padStart(2, '0')}:${min} ${ampm} IST`;
        }
      } else {
        // Use time from date object in IST
        const timeOptions = {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        };
        timeDisplay = ` ${date.toLocaleTimeString('en-IN', timeOptions)} IST`;
      }

      if (isToday) {
        return `Today,${timeDisplay}`;
      } else if (isTomorrow) {
        return `Tomorrow,${timeDisplay}`;
      } else {
        // Format date in IST (DD/MM/YYYY format)
        const dateOptions = { 
          timeZone: 'Asia/Kolkata',
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit'
        };
        const formattedDate = date.toLocaleDateString('en-IN', dateOptions);
        const dateParts = formattedDate.split('/');
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        return `${day}/${month}/${year}${timeDisplay}`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
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

  const toggleFeedbackHistory = (interviewId) => {
    setExpandedFeedback(prev => ({
      ...prev,
      [interviewId]: !prev[interviewId]
    }));
  };

  const formatFeedbackDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getRecommendationLabel = (recommendation) => {
    const labels = {
      'strong_reject': 'Strong Reject',
      'reject': 'Reject',
      'neutral': 'Neutral',
      'accept': 'Accept',
      'strong_accept': 'Strong Accept'
    };
    return labels[recommendation] || recommendation;
  };

  if (loading) {
    return (
      <Container>
        <Wrapper>
          <Header>
            <Title>My Interviews</Title>
            <Subtitle>View and manage your assigned interview schedules</Subtitle>
          </Header>
          <SkeletonLoader loading={true} variant="table" rows={6} columns="repeat(5, 1fr)" />
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
                      <div style={{ flex: 1 }}>
                        <div><strong>Candidate:</strong> {interview.candidate?.user?.name || interview.candidate?.name || 'Unknown'}</div>
                        {interview.candidate?.candidateNumber && (
                          <Badge bg="secondary" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                            {interview.candidate.candidateNumber}
                          </Badge>
                        )}
                      </div>
                    </DetailRow>
                    <DetailRow>
                      <DetailIcon>
                        <FaBriefcase />
                      </DetailIcon>
                      <span><strong>Job Role:</strong> {interview.candidate?.form?.position || interview.form?.position || 'N/A'}</span>
                    </DetailRow>
                    <DetailRow>
                      <DetailIcon>
                        <FaBuilding />
                      </DetailIcon>
                      <span><strong>Department:</strong> {interview.candidate?.form?.department || interview.form?.department || 'N/A'}</span>
                    </DetailRow>
                    <DetailRow>
                      <DetailIcon>
                        <FaCalendarAlt />
                      </DetailIcon>
                      <span><strong>Position Applied:</strong> {interview.form?.title || 'N/A'}</span>
                    </DetailRow>
                    <DetailRow>
                      <DetailIcon>
                        <FaClock />
                      </DetailIcon>
                      <div style={{ flex: 1 }}>
                        <div><strong>Scheduled:</strong> {
                          interview.scheduledDate && interview.scheduledTime 
                            ? formatISTDateTime(interview.scheduledDate, interview.scheduledTime)
                            : interview.scheduledAt 
                              ? formatDate(interview.scheduledAt)
                              : 'Not scheduled'
                        }</div>
                        {interview.duration && (
                          <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Duration: {interview.duration} minutes
                          </div>
                        )}
                      </div>
                    </DetailRow>
                    {interview.meetingLink && (
                      <DetailRow>
                        <DetailIcon>
                          <FaVideo />
                        </DetailIcon>
                        <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
                          Join Meeting
                        </a>
                      </DetailRow>
                    )}
                    {interview.notes && (
                      <DetailRow>
                        <div style={{ flex: 1, padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem', color: '#374151' }}>
                          <strong>Notes:</strong> {interview.notes}
                        </div>
                      </DetailRow>
                    )}
                  </InterviewDetails>
                  
                  {/* Action Buttons and Feedback Status */}
                  {/* Feedback form is available all the time once assigned - no time restrictions */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                    {interview.submittedFeedback ? (
                        <>
                          <ActionButton
                            submitted
                            onClick={() => {
                              navigate('/panel-member/feedback', {
                                state: {
                                  interviewId: interview._id,
                                  candidateId: interview.candidate?._id || interview.candidateId
                                }
                              });
                            }}
                          >
                            <FaCheckCircle />
                            Feedback Submitted
                            <FaArrowRight style={{ marginLeft: 'auto' }} />
                          </ActionButton>
                          
                          {/* Feedback History */}
                          <FeedbackHistorySection>
                            <FeedbackHistoryHeader
                              expanded={expandedFeedback[interview._id]}
                              onClick={() => toggleFeedbackHistory(interview._id)}
                            >
                              <FeedbackHistoryTitle>
                                <FaClipboardCheck />
                                Submitted Feedback
                                {interview.submittedFeedback.submittedAt && (
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 'normal' }}>
                                    ({formatFeedbackDate(interview.submittedFeedback.submittedAt)})
                                  </span>
                                )}
                              </FeedbackHistoryTitle>
                              {expandedFeedback[interview._id] ? <FaChevronUp /> : <FaChevronDown />}
                            </FeedbackHistoryHeader>
                            
                            {expandedFeedback[interview._id] && interview.submittedFeedback && (
                              <FeedbackHistoryContent>
                                {interview.submittedFeedback.questionAnswers && interview.submittedFeedback.questionAnswers.length > 0 ? (
                                  // Custom feedback form answers
                                  interview.submittedFeedback.questionAnswers.map((qa, idx) => (
                                    <FeedbackItem key={idx}>
                                      <FeedbackItemLabel>{qa.question}</FeedbackItemLabel>
                                      <FeedbackItemValue>
                                        {qa.type === 'rating' ? (
                                          <RatingDisplay>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <StarIcon key={star} filled={star <= qa.answer}>
                                                <FaStar />
                                              </StarIcon>
                                            ))}
                                            <span style={{ marginLeft: '0.5rem', color: '#374151' }}>
                                              ({qa.answer}/5)
                                            </span>
                                          </RatingDisplay>
                                        ) : qa.type === 'yes_no' ? (
                                          <Badge bg={qa.answer === 'yes' ? 'success' : 'danger'}>
                                            {qa.answer === 'yes' ? 'Yes' : 'No'}
                                          </Badge>
                                        ) : (
                                          qa.answer || 'N/A'
                                        )}
                                      </FeedbackItemValue>
                                    </FeedbackItem>
                                  ))
                                ) : (
                                  // Default feedback form
                                  <>
                                    {interview.submittedFeedback.ratings && (
                                      <>
                                        {interview.submittedFeedback.ratings.technicalSkills && (
                                          <FeedbackItem>
                                            <FeedbackItemLabel>Technical Skills</FeedbackItemLabel>
                                            <FeedbackItemValue>
                                              <RatingDisplay>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <StarIcon key={star} filled={star <= interview.submittedFeedback.ratings.technicalSkills}>
                                                    <FaStar />
                                                  </StarIcon>
                                                ))}
                                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>
                                                  ({interview.submittedFeedback.ratings.technicalSkills}/5)
                                                </span>
                                              </RatingDisplay>
                                            </FeedbackItemValue>
                                          </FeedbackItem>
                                        )}
                                        {interview.submittedFeedback.ratings.communication && (
                                          <FeedbackItem>
                                            <FeedbackItemLabel>Communication</FeedbackItemLabel>
                                            <FeedbackItemValue>
                                              <RatingDisplay>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <StarIcon key={star} filled={star <= interview.submittedFeedback.ratings.communication}>
                                                    <FaStar />
                                                  </StarIcon>
                                                ))}
                                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>
                                                  ({interview.submittedFeedback.ratings.communication}/5)
                                                </span>
                                              </RatingDisplay>
                                            </FeedbackItemValue>
                                          </FeedbackItem>
                                        )}
                                        {interview.submittedFeedback.ratings.problemSolving && (
                                          <FeedbackItem>
                                            <FeedbackItemLabel>Problem Solving</FeedbackItemLabel>
                                            <FeedbackItemValue>
                                              <RatingDisplay>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <StarIcon key={star} filled={star <= interview.submittedFeedback.ratings.problemSolving}>
                                                    <FaStar />
                                                  </StarIcon>
                                                ))}
                                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>
                                                  ({interview.submittedFeedback.ratings.problemSolving}/5)
                                                </span>
                                              </RatingDisplay>
                                            </FeedbackItemValue>
                                          </FeedbackItem>
                                        )}
                                        {interview.submittedFeedback.ratings.overallRating && (
                                          <FeedbackItem>
                                            <FeedbackItemLabel>Overall Rating</FeedbackItemLabel>
                                            <FeedbackItemValue>
                                              <RatingDisplay>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <StarIcon key={star} filled={star <= interview.submittedFeedback.ratings.overallRating}>
                                                    <FaStar />
                                                  </StarIcon>
                                                ))}
                                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>
                                                  ({interview.submittedFeedback.ratings.overallRating}/5)
                                                </span>
                                              </RatingDisplay>
                                            </FeedbackItemValue>
                                          </FeedbackItem>
                                        )}
                                      </>
                                    )}
                                    {interview.submittedFeedback.comments && (
                                      <FeedbackItem>
                                        <FeedbackItemLabel>Comments</FeedbackItemLabel>
                                        <FeedbackItemValue>{interview.submittedFeedback.comments}</FeedbackItemValue>
                                      </FeedbackItem>
                                    )}
                                    {interview.submittedFeedback.recommendation && (
                                      <FeedbackItem>
                                        <FeedbackItemLabel>Recommendation</FeedbackItemLabel>
                                        <FeedbackItemValue>
                                          <Badge bg={
                                            interview.submittedFeedback.recommendation === 'strong_accept' ? 'success' :
                                            interview.submittedFeedback.recommendation === 'accept' ? 'info' :
                                            interview.submittedFeedback.recommendation === 'reject' ? 'warning' :
                                            interview.submittedFeedback.recommendation === 'strong_reject' ? 'danger' : 'secondary'
                                          }>
                                            {getRecommendationLabel(interview.submittedFeedback.recommendation)}
                                          </Badge>
                                        </FeedbackItemValue>
                                      </FeedbackItem>
                                    )}
                                  </>
                                )}
                              </FeedbackHistoryContent>
                            )}
                          </FeedbackHistorySection>
                        </>
                      ) : (
                        <ActionButton
                          variant="primary"
                          onClick={() => {
                            navigate('/panel-member/feedback', {
                              state: {
                                interviewId: interview._id,
                                candidateId: interview.candidate?._id || interview.candidateId,
                                feedbackForm: interview.feedbackForm
                              }
                            });
                          }}
                        >
                          <FaClipboardCheck />
                          Submit Feedback
                          <FaArrowRight style={{ marginLeft: 'auto' }} />
                        </ActionButton>
                      )}
                    </div>
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

