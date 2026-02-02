import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaFileAlt, FaClipboardCheck, FaCalendarAlt, FaUser, FaPlay, FaCheckCircle, FaClock } from 'react-icons/fa';
import { Button, Badge, Card, Table, Alert } from 'react-bootstrap';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import SkeletonLoader, { TestCardSkeleton, CardGridSkeleton } from './SkeletonLoader';

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

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
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
  background: linear-gradient(135deg, #2563eb, #3b82f6);
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

const WelcomeCard = styled.div`
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.3);
  animation: ${fadeInUp} 0.6s ease-out 0.2s both;
`;

const WelcomeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const WelcomeIcon = styled.div`
  font-size: 3rem;
  opacity: 0.9;
`;

const WelcomeText = styled.div`
  flex: 1;
`;

const WelcomeTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const WelcomeMessage = styled.p`
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const DashboardCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #2563eb, #3b82f6);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  animation: ${slideIn} 0.6s ease-out both;
`;

const CardIcon = styled.div`
  font-size: 2.5rem;
  color: #2563eb;
  margin-bottom: 1rem;
  opacity: 0.8;
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
`;

const CardDescription = styled.p`
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 1rem;
`;

const TestCard = styled(Card)`
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const TestCardHeader = styled(Card.Header)`
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 2px solid #cbd5e1;
  padding: 1.25rem;
`;

const TestCardBody = styled(Card.Body)`
  padding: 1.5rem;
`;

const TestTitle = styled.h5`
  color: #1e293b;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const TestDescription = styled.p`
  color: #64748b;
  margin-bottom: 1rem;
  font-size: 0.95rem;
`;

const TestInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
`;

const TestInfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #475569;
  font-size: 0.9rem;
`;

const CandidateDashboard = () => {
  const [assignedTests, setAssignedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedTests();
  }, []);

  const fetchAssignedTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tests/assigned');
      setAssignedTests(response.data.tests || []);
      setError('');
    } catch (err) {
      console.error('Error fetching assigned tests:', err);
      setError(err.response?.data?.message || 'Failed to fetch assigned tests');
      setAssignedTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTest = (testLink) => {
    navigate(`/test/${testLink}`);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { bg: 'secondary', text: 'Pending', icon: <FaClock /> },
      invited: { bg: 'info', text: 'Invited', icon: <FaClock /> },
      completed: { bg: 'success', text: 'Completed', icon: <FaCheckCircle /> },
      passed: { bg: 'success', text: 'Passed', icon: <FaCheckCircle /> },
      failed: { bg: 'danger', text: 'Failed', icon: <FaCheckCircle /> }
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge bg={variant.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        {variant.icon}
        {variant.text}
      </Badge>
    );
  };

  const pendingTests = assignedTests.filter(t => t.status === 'pending' || t.status === 'invited');
  const completedTests = assignedTests.filter(t => t.status === 'completed' || t.status === 'passed' || t.status === 'failed');

  return (
    <DashboardContainer>
      <DashboardWrapper>
        <HeaderSection>
          <DashboardTitle>Candidate Dashboard</DashboardTitle>
          <DashboardSubtitle>
            Track your application progress, view test results, and manage your recruitment journey.
          </DashboardSubtitle>
        </HeaderSection>

        <WelcomeCard>
          <WelcomeContent>
            <WelcomeIcon>
              <FaUser />
            </WelcomeIcon>
            <WelcomeText>
              <WelcomeTitle>Welcome back!</WelcomeTitle>
              <WelcomeMessage>
                {pendingTests.length > 0 
                  ? `You have ${pendingTests.length} test(s) assigned. Complete them to progress in your application.`
                  : 'Your application is being reviewed. Check your progress below and stay updated with the latest notifications.'}
              </WelcomeMessage>
            </WelcomeText>
          </WelcomeContent>
        </WelcomeCard>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            <TestCardSkeleton count={2} />
            <div className="mb-4">
              <SkeletonLoader loading={true} variant="table" rows={3} columns="repeat(5, 1fr)" />
            </div>
            <CardGridSkeleton count={3} />
          </>
        ) : (
          <>
            {/* Pending Tests Section */}
            {pendingTests.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-3" style={{ color: '#1e293b', fontWeight: '700' }}>
                  <FaClock className="me-2" />
                  Assigned Tests ({pendingTests.length})
                </h3>
                {pendingTests.map((test) => (
                  <TestCard key={test._id}>
                    <TestCardHeader>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <TestTitle>{test.title}</TestTitle>
                          {test.form && (
                            <Badge bg="light" text="dark" className="me-2">
                              {test.form.position} - {test.form.department}
                            </Badge>
                          )}
                          {getStatusBadge(test.status)}
                        </div>
                      </div>
                    </TestCardHeader>
                    <TestCardBody>
                      {test.description && (
                        <TestDescription>{test.description}</TestDescription>
                      )}
                      <TestInfo>
                        <TestInfoItem>
                          <FaClock /> Duration: {test.duration} minutes
                        </TestInfoItem>
                        {test.scheduledDate && (
                          <TestInfoItem>
                            <FaCalendarAlt /> Scheduled: {new Date(test.scheduledDate).toLocaleDateString()}
                            {test.scheduledTime && ` at ${test.scheduledTime}`}
                          </TestInfoItem>
                        )}
                      </TestInfo>
                      {test.instructions && (
                        <div className="mb-3">
                          <strong>Instructions:</strong>
                          <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                            {test.instructions}
                          </p>
                        </div>
                      )}
                      <Button
                        variant="primary"
                        onClick={() => handleTakeTest(test.testLink)}
                        className="mt-2"
                      >
                        <FaPlay className="me-2" />
                        Take Test
                      </Button>
                    </TestCardBody>
                  </TestCard>
                ))}
              </div>
            )}

            {/* Completed Tests Section */}
            {completedTests.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-3" style={{ color: '#1e293b', fontWeight: '700' }}>
                  <FaCheckCircle className="me-2" />
                  Completed Tests ({completedTests.length})
                </h3>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Test Title</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Completed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTests.map((test) => (
                      <tr key={test._id}>
                        <td>{test.title}</td>
                        <td>{getStatusBadge(test.status)}</td>
                        <td>{test.score !== undefined ? `${test.score} / ${test.totalScore || 'N/A'}` : 'N/A'}</td>
                        <td>{test.percentage !== undefined ? `${test.percentage.toFixed(1)}%` : 'N/A'}</td>
                        <td>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* No Tests Message */}
            {assignedTests.length === 0 && !loading && (
              <Alert variant="info" className="text-center py-4">
                <FaClipboardCheck size={48} className="mb-3" style={{ color: '#3b82f6' }} />
                <h5>No Tests Assigned</h5>
                <p className="mb-0">
                  You don't have any tests assigned yet. Tests will appear here once they are assigned to you by the administrator.
                </p>
              </Alert>
            )}

            <CardsGrid>
              <DashboardCard style={{ animationDelay: '0.1s' }}>
                <CardIcon>
                  <FaFileAlt />
                </CardIcon>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>
                  View your submitted applications and their current status in the recruitment process.
                </CardDescription>
                <StatusBadge>1 Active</StatusBadge>
              </DashboardCard>

              <DashboardCard style={{ animationDelay: '0.2s' }}>
                <CardIcon>
                  <FaClipboardCheck />
                </CardIcon>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Check your test scores, performance analytics, and detailed feedback.
                </CardDescription>
                <StatusBadge>{completedTests.length} Completed</StatusBadge>
              </DashboardCard>

              <DashboardCard style={{ animationDelay: '0.3s' }}>
                <CardIcon>
                  <FaCalendarAlt />
                </CardIcon>
                <CardTitle>Interview Schedule</CardTitle>
                <CardDescription>
                  View your upcoming interview details, preparation materials, and schedules.
                </CardDescription>
                <StatusBadge>0 Scheduled</StatusBadge>
              </DashboardCard>
            </CardsGrid>
          </>
        )}
      </DashboardWrapper>
    </DashboardContainer>
  );
};

export default CandidateDashboard;
