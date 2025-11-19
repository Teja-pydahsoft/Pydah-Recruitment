import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaTimesCircle } from 'react-icons/fa';

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const progressBar = keyframes`
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
`;

const ToastWrapper = styled.div`
  pointer-events: auto;
  animation: ${props => props.$isExiting ? slideOut : slideIn} 0.3s ease-out;
  animation-fill-mode: forwards;
`;

const Toast = styled.div`
  background: ${props => {
    switch (props.$variant) {
      case 'success':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'danger':
        return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'warning':
        return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'info':
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      default:
        return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
  }};
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.3), 0 10px 15px -6px rgba(0, 0, 0, 0.15);
  }
`;

const IconWrapper = styled.div`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  padding: 4px;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Message = styled.div`
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  word-wrap: break-word;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.4);
  animation: ${progressBar} 3s linear forwards;
  border-radius: 0 0 12px 12px;
`;

const ToastNotification = ({ type, message, onClose, autoClose = true, duration = 3000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!autoClose || !message) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, autoClose, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Match animation duration
  };

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle size={16} />;
      case 'danger':
        return <FaTimesCircle size={16} />;
      case 'warning':
        return <FaExclamationTriangle size={16} />;
      case 'info':
        return <FaInfoCircle size={16} />;
      default:
        return <FaInfoCircle size={16} />;
    }
  };

  return (
    <ToastWrapper $isExiting={isExiting}>
      <Toast $variant={type || 'info'}>
        <IconWrapper>{getIcon()}</IconWrapper>
        <Content>
          <Message>{message}</Message>
        </Content>
        <CloseButton onClick={handleClose} aria-label="Close">
          <FaTimes size={12} />
        </CloseButton>
        {autoClose && <ProgressBar />}
      </Toast>
    </ToastWrapper>
  );
};

export default ToastNotification;

