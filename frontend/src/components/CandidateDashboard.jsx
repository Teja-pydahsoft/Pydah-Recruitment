import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FaFileAlt, FaClipboardCheck, FaCalendarAlt, FaUser, FaChartLine } from 'react-icons/fa';

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

const ProgressSection = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
  animation: ${fadeInUp} 0.6s ease-out 0.8s both;
`;

const ProgressTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ProgressItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }
`;

const ProgressLabel = styled.span`
  font-weight: 600;
  color: #374151;
`;

const ProgressValue = styled.span`
  font-weight: 700;
  color: #2563eb;
`;

const CandidateDashboard = () => {
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
                Your application is being reviewed. Check your progress below and stay updated with the latest notifications.
              </WelcomeMessage>
            </WelcomeText>
          </WelcomeContent>
        </WelcomeCard>

        <CardsGrid>
          <DashboardCard style={{ animationDelay: '0.1s' }}>
            <CardIcon>
              <FaFileAlt />
            </CardIcon>
            <CardTitle>My Applications</CardTitle>
            <CardDescription>
              View your submitted applications and their current status in the recruitment process.
            </CardDescription>
            <StatusBadge>2 Active</StatusBadge>
          </DashboardCard>

          <DashboardCard style={{ animationDelay: '0.2s' }}>
            <CardIcon>
              <FaClipboardCheck />
            </CardIcon>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Check your test scores, performance analytics, and detailed feedback.
            </CardDescription>
            <StatusBadge>3 Completed</StatusBadge>
          </DashboardCard>

          <DashboardCard style={{ animationDelay: '0.3s' }}>
            <CardIcon>
              <FaCalendarAlt />
            </CardIcon>
            <CardTitle>Interview Schedule</CardTitle>
            <CardDescription>
              View your upcoming interview details, preparation materials, and schedules.
            </CardDescription>
            <StatusBadge>1 Scheduled</StatusBadge>
          </DashboardCard>
        </CardsGrid>

        <ProgressSection>
          <ProgressTitle>
            <FaChartLine />
            Application Progress
          </ProgressTitle>
          <ProgressItem>
            <ProgressLabel>Profile Completion</ProgressLabel>
            <ProgressValue>95%</ProgressValue>
          </ProgressItem>
          <ProgressItem>
            <ProgressLabel>Tests Completed</ProgressLabel>
            <ProgressValue>3/3</ProgressValue>
          </ProgressItem>
          <ProgressItem>
            <ProgressLabel>Interviews Scheduled</ProgressLabel>
            <ProgressValue>1</ProgressValue>
          </ProgressItem>
          <ProgressItem>
            <ProgressLabel>Overall Progress</ProgressLabel>
            <ProgressValue>78%</ProgressValue>
          </ProgressItem>
        </ProgressSection>
      </DashboardWrapper>
    </DashboardContainer>
  );
};

export default CandidateDashboard;
