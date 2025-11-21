import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Card, Button, Alert, Modal } from 'react-bootstrap';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaCheck, FaBars, FaTimes } from 'react-icons/fa';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const TestContainer = styled.div`
  min-height: 100vh;
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.6s ease-out;
  
  @media (max-width: 768px) {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile */
  }
`;

const TestCard = styled(Card)`
  border-radius: 0;
  box-shadow: none;
  border: none;
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.8s ease-out;
  overflow: hidden;
`;

const TestHeader = styled.div`
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  flex-shrink: 0;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    flex-wrap: nowrap;
    align-items: center;
  }
`;

const TestTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.3;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    gap: 0.75rem;
  }
`;

const TimerBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    gap: 0.4rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
  }
`;

const CircularProgress = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
  }
  
  @media (max-width: 480px) {
    width: 45px;
    height: 45px;
  }
`;

const CircularProgressSvg = styled.svg`
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`;

const CircularProgressText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  
  @media (max-width: 480px) {
    font-size: 0.65rem;
  }
`;

const TestBody = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 120px);
  
  @media (max-width: 768px) {
    flex-direction: column;
    height: calc(100vh - 140px);
    height: calc(100dvh - 140px);
  }
`;

const QuestionSidebar = styled.div`
  width: 280px;
  min-width: 280px;
  background: #f8fafc;
  border-right: 2px solid #e2e8f0;
  padding: 1.5rem;
  overflow-y: auto;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    background: rgba(248, 250, 252, 0.98);
    backdrop-filter: blur(10px);
    border-right: none;
    border-bottom: none;
    max-height: none;
    padding: 1rem;
    overflow-y: auto;
  }
`;

const QuestionToggleButton = styled.button`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    font-size: 1.2rem;
    transition: all 0.3s ease;
    flex-shrink: 0;
    margin-right: 0.75rem;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }
`;

const QuestionModalOverlay = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    backdrop-filter: blur(4px);
  }
`;

const QuestionModalHeader = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    margin-bottom: 1rem;
    
    h6 {
      margin: 0;
      font-weight: 700;
    }
    
    button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }
    }
  }
`;

const QuestionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }
`;

const QuestionContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const QuestionCard = styled(Card)`
  margin-bottom: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  flex: 1;

  &:hover {
    border-color: #0ea5e9;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
  }
`;

const QuestionNumber = styled.div`
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 12px 12px 0 0;
  font-weight: 700;
  font-size: 0.9rem;
`;

const QuestionText = styled.div`
  padding: 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
`;

const OptionButton = styled.button.attrs(() => ({
  type: 'button'
}))`
  width: 100%;
  padding: 1rem;
  margin-bottom: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  text-align: left;
  font-size: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    border-color: #0ea5e9;
    background: #f0f9ff;
    transform: translateX(4px);
  }

  &.selected {
    border-color: #0ea5e9;
    background: #dbeafe;
    color: #1e40af;
  }
`;

const SubmitButton = styled(Button)`
  padding: 0.85rem 1.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 12px;

  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
`;

const SuccessCard = styled.div`
  background: white;
  border-radius: 24px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  animation: ${fadeIn} 0.8s ease-out;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    border-radius: 16px;
  }
`;

const SuccessIcon = styled.div`
  width: 120px;
  height: 120px;
  margin: 0 auto 2rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
  animation: ${fadeIn} 0.6s ease-out 0.2s both;
  
  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
    margin-bottom: 1.5rem;
  }
  
  svg {
    font-size: 4rem;
    color: white;
    
    @media (max-width: 768px) {
      font-size: 3rem;
    }
  }
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const SuccessMessage = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #fbbf24;
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 2rem;
  text-align: left;
  
  @media (max-width: 768px) {
    padding: 1.25rem;
    margin-top: 1.5rem;
  }
`;

const InfoTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  color: #b45309;
  
  li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
    line-height: 1.6;
    
    &:before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
      font-size: 1.1rem;
    }
  }
`;

const TakeTest = () => {
  const { testLink } = useParams();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [questionStartTimes, setQuestionStartTimes] = useState({});
  const [testStartTime, setTestStartTime] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [testEndTime, setTestEndTime] = useState(null);
  const timerRef = useRef(null);
  const [showQuestionMenu, setShowQuestionMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowQuestionMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const candidateId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('candidate') || params.get('candidateId') || '';
  }, [location.search]);

  const fetchTest = useCallback(async () => {
    try {
      if (!candidateId) {
        setError('This test link is invalid. Please use the personalised link sent to you or contact the recruitment team.');
        setLoading(false);
        return;
      }

      const response = await api.get(`/tests/take/${testLink}`, {
        params: { candidateId }
      });

      const fetchedTest = response.data.test;
      setTest(fetchedTest);
      setCandidateDetails(fetchedTest.candidate || null);

      if (fetchedTest.assignmentStatus === 'completed') {
        setAlreadyCompleted(true);
        return;
      }

      // Initialize answers object and question start times
      const initialAnswers = {};
      const initialStartTimes = {};
      const startTime = Date.now();
      fetchedTest.questions.forEach((q) => {
        initialAnswers[q._id] = null;
        // Don't set start time for all questions - only set when user navigates to them
        initialStartTimes[q._id] = null;
      });
      // Set start time for the first question
      if (fetchedTest.questions.length > 0) {
        initialStartTimes[fetchedTest.questions[0]._id] = startTime;
      }
      setAnswers(initialAnswers);
      setQuestionStartTimes(initialStartTimes);
      setTestStartTime(startTime);
      const durationInSeconds = Math.max(Number(fetchedTest.duration) * 60, 0);
      setTestEndTime(startTime + (durationInSeconds * 1000));
      setCurrentQuestionIndex(0);
    } catch (error) {
      const message = error.response?.data?.message;
      setError(message || 'Test not found or you are not authorized to take this test.');
    } finally {
      setLoading(false);
    }
  }, [candidateId, testLink]);

  useEffect(() => {
    if (testLink) {
      fetchTest();
    }
  }, [testLink, fetchTest]);

  const handleAnswerSelect = (questionId, answer) => {
    // Calculate time taken for previous answer if exists
    // Update answers first
    const updatedAnswers = {
      ...answers,
      [questionId]: answer
    };
    setAnswers(updatedAnswers);
    if (test) {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < test.questions.length) {
        const nextQuestionId = test.questions[nextIndex]._id;
        setQuestionStartTimes(prev => ({
          ...prev,
          [nextQuestionId]: prev[nextQuestionId] || Date.now()
        }));
      }
    }
  };

  const goToQuestion = useCallback((index) => {
    if (!test || index < 0 || index >= test.questions.length) return;
    const questionId = test.questions[index]._id;
    // Always update start time when navigating to a question
    setQuestionStartTimes(prev => ({
      ...prev,
      [questionId]: Date.now()
    }));
    setCurrentQuestionIndex(index);
  }, [test]);

  const goToNextQuestion = useCallback(() => {
    if (!test) return;
    setCurrentQuestionIndex(prev => {
      const nextIndex = Math.min(prev + 1, test.questions.length - 1);
      if (nextIndex !== prev) {
        const questionId = test.questions[nextIndex]._id;
        // Always update start time when navigating to next question
        setQuestionStartTimes(prevTimes => ({
          ...prevTimes,
          [questionId]: Date.now()
        }));
      }
      return nextIndex;
    });
  }, [test]);

  const goToPreviousQuestion = useCallback(() => {
    if (!test) return;
    setCurrentQuestionIndex(prev => {
      const prevIndex = Math.max(prev - 1, 0);
      if (prevIndex !== prev) {
        const questionId = test.questions[prevIndex]._id;
        // Always update start time when navigating to previous question
        setQuestionStartTimes(prevTimes => ({
          ...prevTimes,
          [questionId]: Date.now()
        }));
      }
      return prevIndex;
    });
  }, [test]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async () => {
    if (!test) {
      return;
    }

    if (!candidateId) {
      setError('Missing candidate identifier. Please reopen the test from your invitation email.');
      return;
    }

    if (alreadyCompleted) {
      setError('Our records indicate that you have already submitted this assessment.');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare answers with timestamps
      const answersArray = Object.entries(answers).map(([questionId, answer]) => {
        const startTime = questionStartTimes[questionId];
        // If start time is not set, use test start time as fallback
        const actualStartTime = startTime || testStartTime;
        const timeTaken = startTime ? Math.floor((Date.now() - actualStartTime) / 1000) : 0;
        
        return {
          questionId,
          answer: answer !== null ? answer : null,
          timeTaken: timeTaken,
          answeredAt: new Date().toISOString()
        };
      });

      await api.post(`/tests/${test._id}/submit`, {
        answers: answersArray,
        startedAt: testStartTime ? new Date(testStartTime).toISOString() : new Date().toISOString(),
        candidateId
      });
      setSubmitted(true);
      setShowSubmitModal(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, questionStartTimes, test, testStartTime, candidateId, alreadyCompleted]);

  const handleAutoSubmit = useCallback(() => {
    // Auto-submit immediately when time runs out
    if (!submitted && !alreadyCompleted) {
      handleSubmit();
    }
  }, [handleSubmit, submitted, alreadyCompleted]);

  // Background timer that works even when page is not active
  useEffect(() => {
    if (testEndTime && !submitted && !alreadyCompleted) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((testEndTime - now) / 1000));
        
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          // Time's up - auto submit
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleAutoSubmit();
        }
      };

      // Update immediately
      updateTimer();

      // Set up interval for updates
      timerRef.current = setInterval(updateTimer, 1000);

      // Listen for visibility changes to sync time when page becomes active
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          updateTimer();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Listen for focus to sync time when window regains focus
      const handleFocus = () => {
        updateTimer();
      };

      window.addEventListener('focus', handleFocus);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [testEndTime, submitted, alreadyCompleted, handleAutoSubmit]);

  if (loading) {
    return <LoadingSpinner message="Loading test..." />;
  }

  if (error && !test) {
    return (
      <TestContainer>
        <TestCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px' }}>
            <FaExclamationTriangle style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '1.5rem' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>Unable to load test</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1.1rem' }}>
              {error || 'We could not load this assessment right now. Please try again shortly.'}
            </p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => window.location.reload()}
              style={{ minWidth: '200px', fontWeight: '600' }}
            >
              Retry
            </Button>
          </div>
        </TestCard>
      </TestContainer>
    );
  }

  if (alreadyCompleted) {
    return (
      <TestContainer>
        <TestCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px' }}>
            <FaCheckCircle style={{ fontSize: '4rem', color: '#0ea5e9', marginBottom: '1.5rem' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>Assessment Already Submitted</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1.05rem' }}>
              Our records show that you have already submitted this assessment. If you believe this is an error, please contact the recruitment team.
            </p>
            <Button variant="primary" onClick={() => window.close()}>
              Close Window
            </Button>
          </div>
        </TestCard>
      </TestContainer>
    );
  }

  if (submitted) {
    return (
      <SuccessContainer>
        <SuccessCard>
          <SuccessIcon>
            <FaCheckCircle />
          </SuccessIcon>
          <SuccessTitle>Test Submitted Successfully!</SuccessTitle>
          <SuccessMessage>
            Your test has been submitted successfully. Our team will review your responses and you will receive the results via email shortly.
          </SuccessMessage>
          <InfoBox>
            <InfoTitle>
              <FaCheckCircle style={{ color: '#f59e0b', fontSize: '1.2rem' }} />
              What happens next?
            </InfoTitle>
            <InfoList>
              <li>Your test responses have been securely saved</li>
              <li>Our recruitment team will review your answers</li>
              <li>You will receive detailed results via email</li>
              <li>Please check your email inbox (and spam folder) for updates</li>
            </InfoList>
          </InfoBox>
        </SuccessCard>
      </SuccessContainer>
    );
  }

  const hasQuestions = Array.isArray(test.questions) && test.questions.length > 0;

  if (test && !hasQuestions) {
    return (
      <TestContainer>
        <TestCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px' }}>
            <FaExclamationTriangle style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '1.5rem' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Questions Available</h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
              This assessment does not contain any questions yet. Please contact the administrator.
            </p>
          </div>
        </TestCard>
      </TestContainer>
    );
  }

  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const totalQuestions = test.questions.length;
  const progress = (answeredCount / totalQuestions) * 100;
  const currentQuestion = test.questions[currentQuestionIndex] || test.questions[0];

  // Calculate circular progress
  const circumference = 2 * Math.PI * 25; // radius = 25
  const offset = circumference - (progress / 100) * circumference;

  return (
    <TestContainer>
      <TestCard>
        <TestHeader>
          <QuestionToggleButton 
            onClick={() => setShowQuestionMenu(!showQuestionMenu)}
            aria-label="Toggle question menu"
          >
            {showQuestionMenu ? <FaTimes /> : <FaBars />}
          </QuestionToggleButton>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TestTitle>
                {test.title}
              </TestTitle>
              {candidateDetails && (
                <div style={{ opacity: 0.9, fontSize: '0.85rem', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {candidateDetails.name || candidateDetails.email || '—'}
                </div>
              )}
            </div>
          </div>
          <HeaderInfo>
            <CircularProgress>
              <CircularProgressSvg viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="4"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </CircularProgressSvg>
              <CircularProgressText>
                {Math.round(progress)}%
              </CircularProgressText>
            </CircularProgress>
            <TimerBadge>
              <FaClock />
              {formatTime(timeRemaining)}
            </TimerBadge>
          </HeaderInfo>
        </TestHeader>

        <TestBody>
          <QuestionModalOverlay 
            $isOpen={showQuestionMenu} 
            onClick={() => setShowQuestionMenu(false)}
          />
          <QuestionSidebar $isOpen={showQuestionMenu}>
            <QuestionModalHeader>
              <h6>Questions ({answeredCount}/{totalQuestions})</h6>
              <button onClick={() => setShowQuestionMenu(false)} aria-label="Close">
                <FaTimes />
              </button>
            </QuestionModalHeader>
            {!isMobile && (
              <h6 style={{ color: '#1e293b', marginBottom: '1rem', fontWeight: 700, fontSize: '0.9rem' }}>
                Questions ({answeredCount}/{totalQuestions})
              </h6>
            )}
            <QuestionGrid>
              {test.questions.map((question, index) => {
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = answers[question._id] !== null;
                return (
                  <Button
                    key={question._id}
                    variant={isCurrent ? 'primary' : isAnswered ? 'success' : 'outline-secondary'}
                    size="sm"
                    style={{ 
                      width: '100%', 
                      aspectRatio: '1',
                      fontWeight: 600,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => {
                      goToQuestion(index);
                      if (isMobile) {
                        setShowQuestionMenu(false);
                      }
                    }}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </QuestionGrid>
          </QuestionSidebar>

          <QuestionContent>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')} style={{ marginBottom: '1rem' }}>
                {error}
              </Alert>
            )}

            {test.instructions && (
              <Alert variant="info" style={{ marginBottom: '1.5rem' }}>
                <strong>Instructions:</strong> {test.instructions}
              </Alert>
            )}

            <QuestionCard key={currentQuestion._id}>
              <QuestionNumber>
                Question {currentQuestionIndex + 1} of {totalQuestions} ({currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''})
              </QuestionNumber>
              <QuestionText>{currentQuestion.questionText}</QuestionText>
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                {currentQuestion.options.map((option, optIndex) => (
                  <OptionButton
                    key={optIndex}
                    className={answers[currentQuestion._id] === optIndex ? 'selected' : ''}
                    onClick={() => handleAnswerSelect(currentQuestion._id, optIndex)}
                  >
                    {answers[currentQuestion._id] === optIndex && <FaCheck className="me-2" />}
                    {option}
                  </OptionButton>
                ))}
              </div>
            </QuestionCard>

            <div className="d-flex justify-content-between align-items-center gap-2 mt-auto pt-3" style={{ flexWrap: 'wrap' }}>
              <Button 
                variant="outline-primary" 
                onClick={goToPreviousQuestion} 
                disabled={currentQuestionIndex === 0}
                style={{ minWidth: '100px' }}
              >
                Previous
              </Button>
              <div className="d-flex gap-2" style={{ flexWrap: 'wrap' }}>
                <Button 
                  variant="primary" 
                  onClick={goToNextQuestion} 
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  style={{ minWidth: '100px' }}
                >
                  Next
                </Button>
                <SubmitButton
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitting || answeredCount === 0}
                  style={{ minWidth: '120px' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </SubmitButton>
              </div>
            </div>
          </QuestionContent>
        </TestBody>
      </TestCard>

        {/* Submit Confirmation Modal */}
        <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Submission</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>You have answered {answeredCount} out of {totalQuestions} questions.</p>
            <p>Are you sure you want to submit your test? This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Yes, Submit Test'}
            </Button>
          </Modal.Footer>
        </Modal>
    </TestContainer>
  );
};

export default TakeTest;

