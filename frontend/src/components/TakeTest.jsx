import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Container, Card, Button, Alert, Modal, ProgressBar } from 'react-bootstrap';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const TestContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 2rem 0;
  animation: ${fadeIn} 0.6s ease-out;
`;

const TestCard = styled(Card)`
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  animation: ${fadeIn} 0.8s ease-out;
`;

const TestHeader = styled.div`
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  padding: 2rem;
  border-radius: 20px 20px 0 0;
  text-align: center;
`;

const TestTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
`;

const TimerBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  margin-top: 1rem;
`;

const QuestionCard = styled(Card)`
  margin-bottom: 1.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;

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

const TakeTest = () => {
  const { testLink } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
      fetchedTest.questions.forEach((q) => {
        initialAnswers[q._id] = null;
        initialStartTimes[q._id] = Date.now();
      });
      setAnswers(initialAnswers);
      setQuestionStartTimes(initialStartTimes);
      setTestStartTime(Date.now());
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
    setCurrentQuestionIndex(index);
    const questionId = test.questions[index]._id;
    setQuestionStartTimes(prev => ({
      ...prev,
      [questionId]: prev[questionId] || Date.now()
    }));
  }, [test]);

  const goToNextQuestion = useCallback(() => {
    if (!test) return;
    setCurrentQuestionIndex(prev => {
      const nextIndex = Math.min(prev + 1, test.questions.length - 1);
      if (nextIndex !== prev) {
        const questionId = test.questions[nextIndex]._id;
        setQuestionStartTimes(prevTimes => ({
          ...prevTimes,
          [questionId]: prevTimes[questionId] || Date.now()
        }));
      }
      return nextIndex;
    });
  }, [test]);

  const goToPreviousQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  }, []);

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
        const startTime = questionStartTimes[questionId] || testStartTime;
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        
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
    setShowSubmitModal(true);
    setTimeout(() => {
      handleSubmit();
    }, 2000);
  }, [handleSubmit]);

  useEffect(() => {
    if (test && test.duration && !submitted && !alreadyCompleted) {
      const durationInSeconds = Math.max(Number(test.duration) * 60, 0);
      setTimeRemaining(durationInSeconds);
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [test, submitted, handleAutoSubmit, alreadyCompleted]);

  if (loading) {
    return <LoadingSpinner message="Loading test..." />;
  }

  if (error && !test) {
    return (
      <TestContainer>
        <Container>
          <TestCard>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
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
        </Container>
      </TestContainer>
    );
  }

  if (alreadyCompleted) {
    return (
      <TestContainer>
        <Container>
          <TestCard>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
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
        </Container>
      </TestContainer>
    );
  }

  if (submitted) {
    return (
      <TestContainer>
        <Container>
          <TestCard>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <FaCheckCircle style={{ fontSize: '4rem', color: '#10b981', marginBottom: '1.5rem' }} />
              <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>Test Submitted Successfully!</h2>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                Your test has been submitted. You will receive the results via email.
              </p>
              <Button variant="primary" onClick={() => navigate('/candidate')}>
                Back to Dashboard
              </Button>
            </div>
          </TestCard>
        </Container>
      </TestContainer>
    );
  }

  const hasQuestions = Array.isArray(test.questions) && test.questions.length > 0;

  if (test && !hasQuestions) {
    return (
      <TestContainer>
        <Container>
          <TestCard>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <FaExclamationTriangle style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '1.5rem' }} />
              <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Questions Available</h2>
              <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                This assessment does not contain any questions yet. Please contact the administrator.
              </p>
            </div>
          </TestCard>
        </Container>
      </TestContainer>
    );
  }

  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const totalQuestions = test.questions.length;
  const progress = (answeredCount / totalQuestions) * 100;
  const currentQuestion = test.questions[currentQuestionIndex] || test.questions[0];

  return (
    <TestContainer>
      <Container>
        <TestCard>
          <TestHeader>
            <TestTitle>{test.title}</TestTitle>
            {test.description && <p style={{ opacity: 0.9 }}>{test.description}</p>}
            {candidateDetails && (
              <p style={{ opacity: 0.85, marginTop: '0.75rem', fontWeight: 600 }}>
                Candidate: {candidateDetails.name || candidateDetails.email || '—'}
              </p>
            )}
            <TimerBadge>
              <FaClock />
              Time Remaining: {formatTime(timeRemaining)}
            </TimerBadge>
          </TestHeader>

          <Card.Body style={{ padding: '2rem' }}>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Progress: {answeredCount}/{totalQuestions} questions answered</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <ProgressBar now={progress} variant="primary" style={{ height: '8px' }} />
            </div>

            {test.instructions && (
              <Alert variant="info" style={{ marginBottom: '2rem' }}>
                <strong>Instructions:</strong> {test.instructions}
              </Alert>
            )}

            <div className="d-flex flex-column flex-lg-row gap-4">
              <div style={{ minWidth: '220px' }}>
                <h6 style={{ color: '#1e293b', marginBottom: '1rem', fontWeight: 700 }}>Questions</h6>
                <div className="d-flex flex-wrap gap-2">
                  {test.questions.map((question, index) => {
                    const isCurrent = index === currentQuestionIndex;
                    const isAnswered = answers[question._id] !== null;
                    return (
                      <Button
                        key={question._id}
                        variant={isCurrent ? 'primary' : isAnswered ? 'success' : 'outline-secondary'}
                        size="sm"
                        style={{ width: '48px', height: '42px', fontWeight: 600 }}
                        onClick={() => goToQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div style={{ flex: 1 }}>
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

                <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
                  <Button variant="outline-primary" onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0}>
                    Previous
                  </Button>
                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={goToNextQuestion} disabled={currentQuestionIndex === totalQuestions - 1}>
                      Next
                    </Button>
                    <SubmitButton
                      onClick={() => setShowSubmitModal(true)}
                      disabled={submitting || answeredCount === 0}
                    >
                      {submitting ? 'Submitting...' : 'Submit Test'}
                    </SubmitButton>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
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
      </Container>
    </TestContainer>
  );
};

export default TakeTest;

