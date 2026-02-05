import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaClipboardCheck, FaUser, FaCalendarAlt, FaExclamationTriangle, FaRedo, FaCheckCircle, FaClock, FaStar } from 'react-icons/fa';
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

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    gap: 1rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 480px) {
    gap: 0.75rem;
    margin-top: 1rem;
  }
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

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
`;

const FeedbackTitle = styled.h3`
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

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    gap: 0.5rem;
  }
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #64748b;
  font-size: 0.95rem;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const DetailIcon = styled.span`
  color: #06b6d4;
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    max-width: 95%;
    max-height: 95vh;
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;

  @media (max-width: 768px) {
    padding: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    color: #1e293b;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1.25rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 0.4rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.65rem;
    min-height: 90px;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 0.6rem;
    min-height: 80px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.65rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 0.6rem;
  }
`;

const RatingContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const StarButton = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  color: ${props => props.filled ? '#fbbf24' : '#d1d5db'};
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  &:has(input[type="radio"]:checked) {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  &:has(input[type="radio"]:checked) span {
    color: #3b82f6;
    font-weight: 600;
  }

  input[type="radio"] {
    margin: 0;
    cursor: pointer;
  }

  span {
    user-select: none;
  }
`;

const SubmitButton = styled.button`
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
    width: 100%;
    justify-content: center;
  }
`;

const CancelButton = styled.button`
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-right: 1rem;

  &:hover {
    background: #4b5563;
  }

  @media (max-width: 768px) {
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
    margin-right: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
    margin-right: 0;
    width: 100%;
    justify-content: center;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
    flex-direction: column-reverse;
    width: 100%;
  }
`;

const FeedbackButton = styled.button`
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
  margin-top: 1rem;
  width: 100%;
  justify-content: center;

  &:hover {
    background: #dc2626;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

const FeedbackEvaluations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [cameFromMyInterviews, setCameFromMyInterviews] = useState(false);

  useEffect(() => {
    fetchFeedback();
    
    // Check if we came from MyInterviews with interviewId and candidateId
    if (location.state?.interviewId && location.state?.candidateId) {
      setCameFromMyInterviews(true);
      handleOpenFeedbackForm(
        location.state.interviewId, 
        location.state.candidateId,
        location.state.feedbackForm
      );
      // Clear the state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleOpenFeedbackForm = async (interviewId, candidateId, feedbackFormFromState = null) => {
    try {
      setShowFeedbackModal(true);
      setSubmitting(false);
      setError(null);
      
      // Normalize candidateId to string for comparison
      const candidateIdStr = candidateId?.toString();
      
      // Fetch interview details to get feedback form
      const interviewResponse = await api.get(`/interviews/${interviewId}`);
      const interview = interviewResponse.data.interview;
      
      if (!interview) {
        throw new Error('Interview not found');
      }
      
      setSelectedInterview(interview);
      
      // Find the candidate in the interview's candidates array
      let candidate = null;
      if (interview.candidates && interview.candidates.length > 0) {
        const candidateEntry = interview.candidates.find(c => {
          const cId = c.candidate?._id?.toString() || c.candidate?.toString() || c.candidate;
          return cId === candidateIdStr;
        });
        
        if (candidateEntry?.candidate) {
          candidate = candidateEntry.candidate;
        }
      }
      
      // If candidate not found in interview, try to fetch directly
      if (!candidate && candidateIdStr) {
        try {
          const candidateResponse = await api.get(`/candidates/${candidateIdStr}`);
          candidate = candidateResponse.data.candidate;
        } catch (candidateErr) {
          console.error('Error fetching candidate:', candidateErr);
          throw new Error('Candidate not found');
        }
      }
      
      if (!candidate) {
        throw new Error('Candidate not found for this interview');
      }
      
      setSelectedCandidate(candidate);
      
      // Use feedbackForm from state if provided, otherwise use interview's feedbackForm
      const feedbackFormToUse = feedbackFormFromState || interview.feedbackForm;
      
      // Set feedback form questions
      if (feedbackFormToUse?.questions && feedbackFormToUse.questions.length > 0) {
        // Add unique IDs to questions if they don't have them
        const questionsWithIds = feedbackFormToUse.questions.map((q, idx) => ({
          ...q,
          _id: q._id || `q_${idx}_${Date.now()}`,
          questionId: q._id?.toString() || q.question || `question_${idx}`
        }));
        
        setFeedbackForm(questionsWithIds);
        
        // Initialize form data
        const initialData = {};
        questionsWithIds.forEach(q => {
          const questionId = q._id?.toString() || q.question || q.questionId;
          if (q.type === 'rating') {
            initialData[questionId] = 0;
          } else if (q.type === 'yes_no') {
            initialData[questionId] = '';
          } else {
            initialData[questionId] = '';
          }
        });
        setFormData(initialData);
        
        // Debug: Log the feedback form structure
        console.log('📋 [FEEDBACK FORM] Questions loaded:', questionsWithIds.length);
        console.log('📋 [FEEDBACK FORM] Questions:', questionsWithIds);
        console.log('📋 [FEEDBACK FORM] Initial data:', initialData);
      } else {
        // Default form if no feedback form is configured
        console.log('⚠️ [FEEDBACK FORM] No questions found, using default form');
        setFeedbackForm([]);
        setFormData({
          comments: '',
          recommendation: 'neutral'
        });
      }
    } catch (err) {
      console.error('Error opening feedback form:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load feedback form');
      setShowFeedbackModal(false);
    }
  };

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

  const handleSubmitFeedback = async () => {
    if (!selectedInterview || !selectedCandidate) {
      setError('Interview or candidate information is missing');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get candidate ID - handle both object and string formats
      const candidateId = selectedCandidate._id?.toString() || selectedCandidate.toString() || selectedCandidate;
      
      if (!candidateId) {
        throw new Error('Candidate ID is missing');
      }

      // Prepare questionAnswers array
      const questionAnswers = [];
      if (feedbackForm && feedbackForm.length > 0) {
        feedbackForm.forEach(q => {
          const questionId = q._id?.toString() || q.question;
          const answer = formData[questionId];
          
          // Validate required questions
          if (q.required) {
            if (q.type === 'rating') {
              // For rating questions, 0 means not answered
              if (answer === null || answer === undefined || answer === '' || answer === 0) {
                throw new Error(`Required question "${q.question}" must be answered`);
              }
            } else if (answer === null || answer === undefined || answer === '') {
              throw new Error(`Required question "${q.question}" must be answered`);
            }
          }

          // Add answer to questionAnswers if it has a value
          // For ratings, only include if > 0
          // For other types, include if not empty
          if (q.type === 'rating') {
            if (answer !== null && answer !== undefined && answer !== '' && answer > 0) {
              questionAnswers.push({
                question: q.question,
                questionId: q._id?.toString(),
                answer: answer,
                type: q.type
              });
            }
          } else if (answer !== null && answer !== undefined && answer !== '') {
            questionAnswers.push({
              question: q.question,
              questionId: q._id?.toString(),
              answer: answer,
              type: q.type
            });
          }
        });
      }

      // Prepare submission data
      const submissionData = {
        candidateId: candidateId,
        questionAnswers: questionAnswers.length > 0 ? questionAnswers : undefined
      };

      // Add default fields if no custom form
      if (!feedbackForm || feedbackForm.length === 0) {
        submissionData.comments = formData.comments || '';
        submissionData.recommendation = formData.recommendation || 'neutral';
      }

      // Submit feedback
      await api.post(`/interviews/${selectedInterview._id}/feedback`, submissionData);

      // Close modal and refresh feedback list
      setShowFeedbackModal(false);
      setSelectedInterview(null);
      setSelectedCandidate(null);
      setFeedbackForm(null);
      setFormData({});
      
      // If user came from MyInterviews, navigate back there
      if (cameFromMyInterviews) {
        navigate('/panel-member/interviews');
      } else {
        await fetchFeedback();
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingChange = (questionId, rating) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: rating
    }));
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
          <SkeletonLoader loading={true} variant="list" count={5} />
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

                {item.status === 'pending' && (
                  <FeedbackButton onClick={() => handleOpenFeedbackForm(item.interviewId, item.candidateId)}>
                    <FaClipboardCheck />
                    Submit Feedback
                  </FeedbackButton>
                )}
              </FeedbackCard>
            ))}
          </FeedbackList>
        )}

        {/* Feedback Submission Modal */}
        {showFeedbackModal && selectedInterview && selectedCandidate && (
          <ModalOverlay onClick={() => !submitting && setShowFeedbackModal(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Submit Feedback</ModalTitle>
                <CloseButton onClick={() => !submitting && setShowFeedbackModal(false)}>
                  ×
                </CloseButton>
              </ModalHeader>

              <div style={{ padding: '1.5rem' }} className="modal-body-content">
                {error && (
                  <div style={{ 
                    background: '#fee2e2', 
                    color: '#dc2626', 
                    padding: '0.75rem', 
                    borderRadius: '6px', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}>
                    <FaExclamationTriangle />
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>
                    Interview: {selectedInterview.title}
                  </p>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '0.9rem' }}>
                    Candidate: {selectedCandidate.user?.name || selectedCandidate.name || 'Unknown'}
                  </p>
                </div>

                {feedbackForm && feedbackForm.length > 0 ? (
                  // Custom feedback form with questions
                  feedbackForm.map((question, index) => {
                    const questionId = question._id?.toString() || question.questionId || question.question || `q_${index}`;
                    const value = formData[questionId] || '';
                    const questionType = question.type?.toLowerCase() || '';
                    
                    // Debug: Log each question being rendered
                    console.log(`📝 [RENDER] Question ${index}:`, {
                      question: question.question,
                      type: question.type,
                      questionType,
                      questionId,
                      value,
                      hasRating: questionType === 'rating',
                      formDataKeys: Object.keys(formData)
                    });

                    return (
                      <FormGroup key={index}>
                        <Label>
                          {question.question || `Question ${index + 1}`}
                          {question.required && <span style={{ color: '#dc2626' }}> *</span>}
                        </Label>

                        {questionType === 'rating' && (
                          <RatingContainer>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <StarButton
                                key={rating}
                                type="button"
                                filled={value >= rating}
                                onClick={() => handleRatingChange(questionId, rating)}
                                disabled={submitting}
                              >
                                <FaStar />
                              </StarButton>
                            ))}
                            {value > 0 && (
                              <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                                ({value}/5)
                              </span>
                            )}
                          </RatingContainer>
                        )}

                        {questionType === 'yes_no' && (
                          <RadioGroup>
                            <RadioOption>
                              <input
                                type="radio"
                                name={questionId}
                                value="yes"
                                checked={value === 'yes'}
                                onChange={(e) => setFormData(prev => ({ ...prev, [questionId]: e.target.value }))}
                                disabled={submitting}
                              />
                              <span>Yes</span>
                            </RadioOption>
                            <RadioOption>
                              <input
                                type="radio"
                                name={questionId}
                                value="no"
                                checked={value === 'no'}
                                onChange={(e) => setFormData(prev => ({ ...prev, [questionId]: e.target.value }))}
                                disabled={submitting}
                              />
                              <span>No</span>
                            </RadioOption>
                          </RadioGroup>
                        )}

                        {questionType === 'text' && (
                          <TextArea
                            value={value}
                            onChange={(e) => setFormData(prev => ({ ...prev, [questionId]: e.target.value }))}
                            placeholder="Enter your feedback..."
                            disabled={submitting}
                            required={question.required}
                          />
                        )}
                      </FormGroup>
                    );
                  })
                ) : (
                  // Default feedback form (fallback if no questions)
                  <>
                    <div style={{ 
                      padding: '1rem', 
                      background: '#fef3c7', 
                      borderRadius: '6px', 
                      marginBottom: '1rem',
                      border: '1px solid #fbbf24'
                    }}>
                      <p style={{ margin: 0, color: '#92400e', fontWeight: '600' }}>
                        ⚠️ No feedback form questions found. Using default form.
                      </p>
                    </div>
                    <FormGroup>
                      <Label>Comments</Label>
                      <TextArea
                        value={formData.comments || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                        placeholder="Enter your feedback comments..."
                        disabled={submitting}
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Recommendation</Label>
                      <Select
                        value={formData.recommendation || 'neutral'}
                        onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
                        disabled={submitting}
                      >
                        <option value="strong_accept">Strong Accept</option>
                        <option value="accept">Accept</option>
                        <option value="neutral">Neutral</option>
                        <option value="reject">Reject</option>
                        <option value="strong_reject">Strong Reject</option>
                      </Select>
                    </FormGroup>
                  </>
                )}
              </div>

              <ModalActions>
                <CancelButton onClick={() => !submitting && setShowFeedbackModal(false)} disabled={submitting}>
                  Cancel
                </CancelButton>
                <SubmitButton onClick={handleSubmitFeedback} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </SubmitButton>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </Wrapper>
    </Container>
  );
};

export default FeedbackEvaluations;

