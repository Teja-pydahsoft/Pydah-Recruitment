import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Card, Button, Alert, Modal } from 'react-bootstrap';
import { FaKeyboard, FaClock, FaCheckCircle, FaRedo, FaTrophy } from 'react-icons/fa';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
`;

// Main Container
const TestContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.6s ease-out;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const TestWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  animation: ${fadeIn} 0.8s ease-out;
`;

// Header Section
const HeaderCard = styled(Card)`
  border: none;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  margin-bottom: 2rem;
  background: white;
  overflow: hidden;
`;

const HeaderContent = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    flex-direction: column;
    text-align: center;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    
    @media (max-width: 768px) {
      font-size: 1.5rem;
    }
  }
  
  svg {
    font-size: 2.5rem;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const StatsPanel = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
    width: 100%;
  }
`;

const StatBox = styled.div`
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  text-align: center;
  min-width: 100px;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    min-width: 80px;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Main Test Card
const TestCard = styled(Card)`
  border: none;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  background: white;
  overflow: hidden;
`;

const TestBody = styled(Card.Body)`
  padding: 3rem;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

// Duration Selection
const DurationSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const DurationTitle = styled.h3`
  color: #1e293b;
  margin-bottom: 1.5rem;
  font-weight: 700;
  font-size: 1.5rem;
`;

const DurationButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const DurationButton = styled(Button)`
  min-width: 180px;
  padding: 1.25rem 2rem;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 12px;
  border: 3px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  &:hover::before {
    width: 300px;
    height: 300px;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
  
  &.active {
    border-color: #667eea;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    animation: ${glow} 2s ease-in-out infinite;
  }
`;

// Typing Area
const TypingArea = styled.div`
  margin-bottom: 2rem;
`;

const ParagraphContainer = styled.div`
  background: #f8fafc;
  border: 3px solid #e2e8f0;
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  position: relative;
  min-height: 250px;
  font-size: 1.5rem;
  line-height: 2.2;
  color: #64748b;
  overflow: hidden;
  transition: border-color 0.3s ease;
  
  &.active {
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    padding: 2rem 1.5rem;
    line-height: 2;
    min-height: 200px;
  }
`;

const CharacterSpan = styled.span`
  position: relative;
  transition: all 0.1s ease;
  
  ${props => props.$isCorrect === true && css`
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
    padding: 2px 0;
    border-radius: 3px;
  `}
  
  ${props => props.$isCorrect === false && css`
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
    padding: 2px 0;
    border-radius: 3px;
    text-decoration: underline;
    animation: ${slideIn} 0.2s ease;
  `}
  
  ${props => props.$isCurrent && css`
    background: #06b6d4;
    color: white;
    padding: 2px 4px;
    border-radius: 4px;
    animation: ${pulse} 1s ease-in-out infinite;
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
  `}
  
  ${props => props.$isPending && css`
    color: #94a3b8;
  `}
`;

const HiddenTextarea = styled.textarea`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 2.5rem;
  font-size: 1.5rem;
  line-height: 2.2;
  border: none;
  background: transparent;
  color: transparent;
  caret-color: #06b6d4;
  resize: none;
  font-family: inherit;
  z-index: 10;
  overflow: hidden;
  
  &:focus {
    outline: none;
  }
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    padding: 2rem 1.5rem;
    line-height: 2;
  }
`;

// Action Buttons
const ActionSection = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
`;

const ActionButton = styled(Button)`
  min-width: 150px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 12px;
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

// Timer Display
const TimerDisplay = styled.div`
  font-size: 3rem;
  font-weight: 900;
  color: ${props => {
    if (props.$timeLeft <= 10) return '#ef4444';
    if (props.$timeLeft <= 30) return '#f59e0b';
    return '#ffffff';
  }};
  text-align: center;
  font-variant-numeric: tabular-nums;
  ${props => props.$timeLeft <= 10 && css`
    animation: ${pulse} 1s ease-in-out infinite;
  `}
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

// Results Modal
const ResultsModal = styled(Modal)`
  .modal-content {
    border: none;
    border-radius: 20px;
    overflow: hidden;
  }
`;

const ResultsHeader = styled(Modal.Header)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 2rem;
  text-align: center;
  
  h2 {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
`;

const ResultsBody = styled(Modal.Body)`
  padding: 3rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ResultCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
`;

const ResultLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ResultValue = styled.div`
  font-size: 2.5rem;
  font-weight: 900;
  color: #1e293b;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ResultSubtext = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 0.5rem;
`;

// Instructions
const InstructionsCard = styled(Card)`
  border: none;
  border-radius: 16px;
  background: #f8fafc;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const InstructionsHeader = styled(Card.Header)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1.5rem;
  font-weight: 700;
  font-size: 1.25rem;
  border-radius: 16px 16px 0 0;
`;

const InstructionsBody = styled(Card.Body)`
  padding: 2rem;
  line-height: 1.8;
  color: #475569;
  
  ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.75rem;
    }
  }
`;

/**
 * TypingTest Component
 * Modern Typing Master-style typing test interface
 */
const TypingTest = () => {
  const { testLink } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const candidateId = searchParams.get('candidate');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingTest, setTypingTest] = useState(null);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [duration, setDuration] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [backspaceCount, setBackspaceCount] = useState(0);

  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch typing test data
  useEffect(() => {
    const fetchTypingTest = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/typing-test/take/${testLink}${candidateId ? `?candidate=${candidateId}` : ''}`);
        setTypingTest(response.data.typingTest);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load typing test');
        console.error('Typing test fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (testLink) {
      fetchTypingTest();
    }
  }, [testLink, candidateId]);

  // Calculate statistics
  const calculateStats = useCallback(() => {
    if (!typingTest || !userInput) {
      return {
        wpm: 0,
        accuracy: 0,
        totalErrors: 0,
        totalCharacters: 0,
        correctCharacters: 0
      };
    }

    const originalText = typingTest.typingParagraph;
    const typedText = userInput;
    
    let correctCharacters = 0;
    let totalErrors = 0;
    const minLength = Math.min(originalText.length, typedText.length);

    // Compare character by character
    for (let i = 0; i < minLength; i++) {
      if (originalText[i] === typedText[i]) {
        correctCharacters++;
      } else {
        totalErrors++;
      }
    }

    // Count extra characters as errors
    if (typedText.length > originalText.length) {
      totalErrors += typedText.length - originalText.length;
    }

    const totalCharacters = typedText.length;
    const accuracy = totalCharacters > 0 
      ? Math.round((correctCharacters / totalCharacters) * 100) 
      : 0;

    // Calculate WPM: (correct characters / 5) / (time elapsed in minutes)
    const timeElapsed = duration ? (duration * 60 - timeLeft) : 0;
    const timeInMinutes = timeElapsed / 60;
    const wordsTyped = correctCharacters / 5; // Average word length is 5 characters
    const wpm = timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;

    return {
      wpm,
      accuracy,
      totalErrors,
      totalCharacters,
      correctCharacters,
      backspaceCount
    };
  }, [typingTest, userInput, duration, timeLeft, backspaceCount]);

  // Handle test completion
  const handleTestComplete = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const stats = calculateStats();
    setResults(stats);
    setTestCompleted(true);
    setTestStarted(false);
    setShowResults(true);

    // Submit results to backend
    if (candidateId) {
      try {
        setSubmitting(true);
        await api.post(`/typing-test/${typingTest._id}/submit`, {
          candidateId,
          ...stats,
          backspaceCount,
          timeTaken: duration * 60 - timeLeft,
          duration
        });
      } catch (err) {
        console.error('Test submission error:', err);
        setError('Failed to submit results. Please contact support.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [typingTest, candidateId, duration, timeLeft, calculateStats, backspaceCount]);

  // Timer countdown
  useEffect(() => {
    if (testStarted && timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTestComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [testStarted, timeLeft, handleTestComplete]);

  // Handle test start
  const handleStartTest = async (selectedDuration) => {
    if (!candidateId) {
      setError('Candidate ID is required');
      return;
    }

    try {
      // Mark test as started on backend
      await api.post(`/typing-test/${typingTest._id}/start`, {
        candidateId,
        duration: selectedDuration
      });

      setDuration(selectedDuration);
      setTimeLeft(selectedDuration * 60); // Convert to seconds
      setTestStarted(true);
      setUserInput('');
      startTimeRef.current = Date.now();

      // Focus textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start test');
      console.error('Test start error:', err);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    if (!testStarted || testCompleted) return;

    const value = e.target.value;
    setUserInput(value);

    // Auto-submit if user completes the paragraph
    if (typingTest && value.length >= typingTest.typingParagraph.length) {
      handleTestComplete();
    }
  };

  // Handle keydown to track backspace
  const handleKeyDown = (e) => {
    if (!testStarted || testCompleted) return;

    // Track backspace key
    if (e.key === 'Backspace' || e.keyCode === 8) {
      setBackspaceCount(prev => prev + 1);
    }
  };

  // Handle restart
  const handleRestart = () => {
    setTestStarted(false);
    setTestCompleted(false);
    setUserInput('');
    setTimeLeft(null);
    setDuration(null);
    setResults(null);
    setShowResults(false);
    setBackspaceCount(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Render paragraph with character highlighting
  const renderParagraph = () => {
    if (!typingTest) return null;

    const originalText = typingTest.typingParagraph;
    const typedText = userInput;
    const characters = [];

    for (let i = 0; i < originalText.length; i++) {
      const isTyped = i < typedText.length;
      const isCorrect = isTyped && originalText[i] === typedText[i];
      const isCurrent = i === typedText.length;
      const isPending = i > typedText.length;

      characters.push(
        <CharacterSpan
          key={i}
          $isCorrect={isTyped ? isCorrect : null}
          $isCurrent={isCurrent}
          $isPending={isPending}
        >
          {originalText[i] === ' ' ? '\u00A0' : originalText[i]}
        </CharacterSpan>
      );
    }

    return characters;
  };

  // Get live stats
  const liveStats = calculateStats();

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <TestContainer>
        <LoadingSpinner />
      </TestContainer>
    );
  }

  if (error && !typingTest) {
    return (
      <TestContainer>
        <TestWrapper>
          <HeaderCard>
            <TestBody>
              <Alert variant="danger">{error}</Alert>
              <ActionSection>
                <ActionButton variant="primary" onClick={() => navigate(-1)}>
                  Go Back
                </ActionButton>
              </ActionSection>
            </TestBody>
          </HeaderCard>
        </TestWrapper>
      </TestContainer>
    );
  }

  if (!typingTest) {
    return (
      <TestContainer>
        <TestWrapper>
          <HeaderCard>
            <TestBody>
              <Alert variant="warning">Typing test not found</Alert>
            </TestBody>
          </HeaderCard>
        </TestWrapper>
      </TestContainer>
    );
  }

  return (
    <TestContainer>
      <TestWrapper>
        {/* Header with Stats */}
        <HeaderCard>
          <HeaderContent>
            <HeaderTitle>
              <FaKeyboard />
              <h1>{typingTest.title}</h1>
            </HeaderTitle>
            {testStarted && (
              <StatsPanel>
                <StatBox>
                  <StatLabel>WPM</StatLabel>
                  <StatValue>{liveStats.wpm}</StatValue>
                </StatBox>
                <StatBox>
                  <StatLabel>Accuracy</StatLabel>
                  <StatValue>{liveStats.accuracy}%</StatValue>
                </StatBox>
                <StatBox>
                  <StatLabel>Errors</StatLabel>
                  <StatValue>{liveStats.totalErrors}</StatValue>
                </StatBox>
                <StatBox>
                  <StatLabel>
                    <FaClock style={{ marginRight: '0.5rem' }} />
                    Time Left
                  </StatLabel>
                  <TimerDisplay $timeLeft={timeLeft}>
                    {formatTime(timeLeft)}
                  </TimerDisplay>
                </StatBox>
              </StatsPanel>
            )}
          </HeaderContent>
        </HeaderCard>

        {/* Main Test Card */}
        <TestCard>
          <TestBody>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
                {error}
              </Alert>
            )}

            {!testStarted && !testCompleted && (
              <>
                <InstructionsCard>
                  <InstructionsHeader>Instructions</InstructionsHeader>
                  <InstructionsBody>
                    <p>{typingTest.instructions}</p>
                    <ul>
                      <li>Select your preferred test duration (1 or 2 minutes)</li>
                      <li>Type the paragraph as accurately and quickly as possible</li>
                      <li>Your typing speed (WPM) and accuracy will be calculated in real-time</li>
                      <li>Correct characters will be highlighted in green, errors in red</li>
                      <li>The test will automatically end when time runs out</li>
                    </ul>
                  </InstructionsBody>
                </InstructionsCard>

                <DurationSection>
                  <DurationTitle>Select Test Duration</DurationTitle>
                  <DurationButtons>
                    {typingTest.durationOptions.map((dur) => (
                      <DurationButton
                        key={dur}
                        variant={duration === dur ? 'primary' : 'outline-primary'}
                        size="lg"
                        onClick={() => handleStartTest(dur)}
                        disabled={!candidateId}
                        className={duration === dur ? 'active' : ''}
                      >
                        {dur} Minute{dur > 1 ? 's' : ''}
                      </DurationButton>
                    ))}
                  </DurationButtons>
                </DurationSection>

                {!candidateId && (
                  <Alert variant="warning" className="text-center">
                    Candidate ID is required to take this test. Please access this test through the provided link.
                  </Alert>
                )}
              </>
            )}

            {testStarted && !testCompleted && (
              <TypingArea>
                <ParagraphContainer className="active">
                  {renderParagraph()}
                  <HiddenTextarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Start typing here..."
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    disabled={testCompleted}
                  />
                </ParagraphContainer>
                <ActionSection>
                  <ActionButton variant="danger" onClick={handleRestart}>
                    <FaRedo /> Restart
                  </ActionButton>
                </ActionSection>
              </TypingArea>
            )}
          </TestBody>
        </TestCard>

        {/* Results Modal */}
        <ResultsModal show={showResults} onHide={() => {}} centered size="lg" backdrop="static">
          <ResultsHeader>
            <h2>
              <FaTrophy /> Test Completed!
            </h2>
          </ResultsHeader>
          <ResultsBody>
            {results && (
              <>
                <ResultsGrid>
                  <ResultCard>
                    <ResultLabel>Words Per Minute</ResultLabel>
                    <ResultValue>{results.wpm}</ResultValue>
                    <ResultSubtext>WPM</ResultSubtext>
                  </ResultCard>
                  <ResultCard>
                    <ResultLabel>Accuracy</ResultLabel>
                    <ResultValue>{results.accuracy}%</ResultValue>
                    <ResultSubtext>
                      {results.accuracy >= 90 ? 'Excellent!' : 
                       results.accuracy >= 70 ? 'Good!' : 
                       'Keep practicing!'}
                    </ResultSubtext>
                  </ResultCard>
                  <ResultCard>
                    <ResultLabel>Total Errors</ResultLabel>
                    <ResultValue>{results.totalErrors}</ResultValue>
                    <ResultSubtext>Characters</ResultSubtext>
                  </ResultCard>
                  <ResultCard>
                    <ResultLabel>Time Taken</ResultLabel>
                    <ResultValue>{duration * 60 - timeLeft}s</ResultValue>
                    <ResultSubtext>Out of {duration * 60}s</ResultSubtext>
                  </ResultCard>
                </ResultsGrid>
                <ActionSection>
                  <ActionButton variant="primary" size="lg" onClick={() => navigate('/candidate')}>
                    <FaCheckCircle /> Go to Dashboard
                  </ActionButton>
                  <ActionButton variant="outline-primary" size="lg" onClick={handleRestart}>
                    <FaRedo /> Try Again
                  </ActionButton>
                </ActionSection>
                {submitting && (
                  <Alert variant="info" className="mt-3 text-center">
                    Submitting results...
                  </Alert>
                )}
              </>
            )}
          </ResultsBody>
        </ResultsModal>
      </TestWrapper>
    </TestContainer>
  );
};

export default TypingTest;
