import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Container, Row, Col, Card, Button, Alert, Modal, ProgressBar } from 'react-bootstrap';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaCheck, FaSignInAlt } from 'react-icons/fa';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

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

const OptionButton = styled.button`
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
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 12px;
  margin-top: 2rem;

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
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token || !isAuthenticated) {
      setNeedsLogin(true);
      setLoading(false);
      setError('Please login first to access the test. Use the credentials provided in your email.');
      return;
    }

    if (testLink) {
      fetchTest();
    }
  }, [testLink, isAuthenticated]);

  useEffect(() => {
    if (test && test.duration && !submitted) {
      setTimeRemaining(test.duration * 60); // Convert minutes to seconds
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
  }, [test, submitted]);

  const fetchTest = async () => {
    try {
      const response = await api.get(`/tests/take/${testLink}`);
      setTest(response.data.test);
      // Initialize answers object
      const initialAnswers = {};
      response.data.test.questions.forEach((q) => {
        initialAnswers[q._id] = null;
      });
      setAnswers(initialAnswers);
    } catch (error) {
      setError(error.response?.data?.message || 'Test not found or you are not authorized to take this test.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAutoSubmit = () => {
    setShowSubmitModal(true);
    setTimeout(() => {
      handleSubmit();
    }, 2000);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer: answer !== null ? answer : -1
      }));

      await api.post(`/tests/${test._id}/submit`, { answers: answersArray });
      setSubmitted(true);
      setShowSubmitModal(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading test..." />;
  }

  if (needsLogin || (error && !test)) {
    return (
      <TestContainer>
        <Container>
          <TestCard>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <FaExclamationTriangle style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '1.5rem' }} />
              <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>Authentication Required</h2>
              <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1.1rem' }}>
                {error || 'Please login first to access the test. Use the credentials provided in your email notification.'}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => navigate('/login')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FaSignInAlt />
                  Go to Login Page
                </Button>
              </div>
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '12px', textAlign: 'left' }}>
                <h5 style={{ color: '#1e40af', marginBottom: '1rem' }}>Login Credentials:</h5>
                <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
                  <strong>Username:</strong> Your email or phone number (as provided in the email)
                </p>
                <p style={{ color: '#64748b' }}>
                  <strong>Password:</strong> Your email or phone number (as provided in the email)
                </p>
              </div>
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

  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const totalQuestions = test.questions.length;
  const progress = (answeredCount / totalQuestions) * 100;

  return (
    <TestContainer>
      <Container>
        <TestCard>
          <TestHeader>
            <TestTitle>{test.title}</TestTitle>
            {test.description && <p style={{ opacity: 0.9 }}>{test.description}</p>}
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

            {test.questions.map((question, index) => (
              <QuestionCard key={question._id}>
                <QuestionNumber>
                  Question {index + 1} of {totalQuestions} ({question.marks} mark{question.marks !== 1 ? 's' : ''})
                </QuestionNumber>
                <QuestionText>{question.questionText}</QuestionText>
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                  {question.options.map((option, optIndex) => (
                    <OptionButton
                      key={optIndex}
                      className={answers[question._id] === optIndex ? 'selected' : ''}
                      onClick={() => handleAnswerSelect(question._id, optIndex)}
                    >
                      {answers[question._id] === optIndex && <FaCheck className="me-2" />}
                      {option}
                    </OptionButton>
                  ))}
                </div>
              </QuestionCard>
            ))}

            <SubmitButton
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting || answeredCount === 0}
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </SubmitButton>
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

