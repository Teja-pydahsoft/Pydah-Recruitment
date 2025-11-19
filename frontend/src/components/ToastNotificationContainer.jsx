import React from 'react';
import styled from 'styled-components';
import ToastNotification from './ToastNotification';

const Container = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  pointer-events: none;
`;

const ToastNotificationContainer = ({ toast, onClose }) => {
  if (!toast || !toast.message) return null;

  return (
    <Container>
      <ToastNotification
        type={toast.type}
        message={toast.message}
        onClose={onClose}
        autoClose={true}
        duration={3000}
      />
    </Container>
  );
};

export default ToastNotificationContainer;

