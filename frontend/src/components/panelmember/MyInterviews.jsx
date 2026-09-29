import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Badge, Table } from 'react-bootstrap';
import { FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaRedo, FaClipboardCheck, FaArrowRight } from 'react-icons/fa';
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
    if (props.$submitted) return '#10b981';
    return props.$variant === 'primary' ? '#06b6d4' : '#3b82f6';
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
      if (props.$submitted) return '#059669';
      return props.$variant === 'primary' ? '#dc2626' : '#2563eb';
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



const MyInterviews = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const rawInterviews = response.data.interviews || [];
      // Deduplicate interviews by unique ID + candidate ID to prevent duplicate records
      const seen = new Set();
      const uniqueInterviews = rawInterviews.filter((iv, idx) => {
        const candidateKey = iv.candidate?._id || iv.candidate?.candidateNumber || iv.candidateId || idx;
        const key = `${iv._id || 'iv'}_${candidateKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setInterviews(uniqueInterviews);
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
          <div className="table-responsive bg-white rounded shadow-sm border p-2">
            <Table hover className="align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Job Role & Dept</th>
                  <th className="py-3 px-3">Interview Title</th>
                  <th className="py-3 px-3">Scheduled (IST)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((interview, index) => {
                  const status = getStatus(interview);
                  const candidateName = interview.candidate?.user?.name || interview.candidate?.name || 'Unknown';
                  const candidateNo = interview.candidate?.candidateNumber;
                  const position = interview.candidate?.form?.position || interview.form?.position || 'N/A';
                  const department = interview.candidate?.form?.department || interview.form?.department || 'N/A';
                  const scheduledText = interview.scheduledDate && interview.scheduledTime 
                    ? formatISTDateTime(interview.scheduledDate, interview.scheduledTime)
                    : interview.scheduledAt 
                      ? formatDate(interview.scheduledAt)
                      : 'Not scheduled';

                  const candidateKey = interview.candidate?._id || interview.candidateId || interview.candidate?.candidateNumber || index;
                  const rowKey = `interview_${interview._id || 'item'}_${candidateKey}_${index}`;

                  return (
                    <tr key={rowKey}>
                      <td className="px-3" data-label="Candidate">
                        <div className="fw-semibold text-dark">{candidateName}</div>
                        {candidateNo && <Badge bg="secondary" className="small mt-1">{candidateNo}</Badge>}
                      </td>
                      <td className="px-3" data-label="Job Role & Dept">
                        <div className="fw-medium text-dark">{position}</div>
                        <div className="text-muted small">{department}</div>
                      </td>
                      <td className="px-3" data-label="Interview Title">
                        <div className="fw-medium text-dark">{interview.title}</div>
                      </td>
                      <td className="px-3" data-label="Scheduled (IST)">
                        <div className="small fw-semibold">{scheduledText}</div>
                        {interview.duration && <div className="text-muted small">Duration: {interview.duration} mins</div>}
                        {interview.meetingLink && (
                          <div className="mt-1">
                            <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="small text-primary fw-bold">
                              Join Meeting
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-3" data-label="Status">
                        <Badge bg={status === 'completed' ? 'success' : status === 'pending' ? 'warning' : 'info'}>
                          {status === 'completed' ? 'Completed' : status === 'pending' ? 'Pending' : 'Upcoming'}
                        </Badge>
                      </td>
                      <td className="px-3 text-end" data-label="Action">
                        {interview.submittedFeedback ? (
                          <ActionButton
                            $submitted={true}
                            onClick={() => {
                              navigate('/panel-member/feedback', {
                                state: {
                                  interviewId: interview._id,
                                  candidateId: interview.candidate?._id || interview.candidateId
                                }
                              });
                            }}
                          >
                            <FaCheckCircle style={{ marginRight: '6px' }} />
                            Feedback Submitted
                            <FaArrowRight style={{ marginLeft: '6px' }} />
                          </ActionButton>
                        ) : (
                          <ActionButton
                            $variant="primary"
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
                            <FaClipboardCheck style={{ marginRight: '6px' }} />
                            Submit Feedback
                            <FaArrowRight style={{ marginLeft: '6px' }} />
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Wrapper>
    </Container>
  );
};

export default MyInterviews;

