import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FaSpinner } from 'react-icons/fa';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  animation: ${fadeIn} 0.3s ease-in-out;
`;

const LoadingWrapper = styled.div`
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const SpinnerIcon = styled(FaSpinner)`
  font-size: 2.5rem;
  color: #2563eb;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingText = styled.p`
  color: #64748b;
  font-weight: 500;
  font-size: 1rem;
  margin: 0;
  letter-spacing: 0.025em;
`;

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <LoadingContainer>
      <LoadingWrapper>
        <SpinnerIcon />
        <LoadingText>{message}</LoadingText>
      </LoadingWrapper>
    </LoadingContainer>
  );
};

export default LoadingSpinner;
