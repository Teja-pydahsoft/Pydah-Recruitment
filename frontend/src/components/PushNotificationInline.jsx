/**
 * Push Notification Inline Component
 * 
 * Compact inline version of push notification status for header placement
 */

import React, { useState, useEffect } from 'react';
import { FaBell, FaCheckCircle, FaBellSlash } from 'react-icons/fa';
import pushNotificationService from '../services/pushNotificationService';
import styled from 'styled-components';

const NotificationStatus = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  background: ${props => {
    if (props.$status === 'enabled') return 'rgba(16, 185, 129, 0.1)';
    if (props.$status === 'disabled') return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(37, 99, 235, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.$status === 'enabled') return 'rgba(16, 185, 129, 0.3)';
    if (props.$status === 'disabled') return 'rgba(245, 158, 11, 0.3)';
    return 'rgba(37, 99, 235, 0.3)';
  }};
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  
  &:hover {
    ${props => props.$clickable ? `
      background: ${props.$status === 'enabled' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)'};
      transform: translateY(-1px);
    ` : ''}
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const StatusContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const StatusTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => {
    if (props.$status === 'enabled') return '#047857';
    if (props.$status === 'disabled') return '#b45309';
    return '#1d4ed8';
  }};
  white-space: nowrap;
`;

const StatusSubtitle = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
`;

const NotificationButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:enabled {
    background: #1d4ed8;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PushNotificationInline = ({ user, onSubscriptionChange }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      setLoading(true);
      
      const supported = pushNotificationService.isSupported();
      setIsSupported(supported);
      
      if (!supported) {
        setLoading(false);
        return;
      }
      
      const result = await pushNotificationService.initialize();
      
      if (result.supported) {
        setPermission(result.permission || 'default');
        setIsSubscribed(result.subscribed || false);
      }
    } catch (error) {
      console.error('[PushNotificationInline] Error initializing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      await pushNotificationService.subscribe();
      setIsSubscribed(true);
      setPermission('granted');
      if (onSubscriptionChange) {
        onSubscriptionChange(true);
      }
    } catch (error) {
      console.error('[PushNotificationInline] Error subscribing:', error);
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setSubscribing(true);
      await pushNotificationService.unsubscribe();
      setIsSubscribed(false);
      if (onSubscriptionChange) {
        onSubscriptionChange(false);
      }
    } catch (error) {
      console.error('[PushNotificationInline] Error unsubscribing:', error);
    } finally {
      setSubscribing(false);
    }
  };

  if (loading || !isSupported) {
    return null;
  }

  // Permission denied - show disabled status
  if (permission === 'denied') {
    return (
      <NotificationStatus $status="disabled" title="Notifications disabled in browser settings">
        <FaBellSlash size={16} color="#b45309" />
        <StatusContent>
          <StatusTitle $status="disabled">Notifications Disabled</StatusTitle>
          <StatusSubtitle>Update browser settings to enable</StatusSubtitle>
        </StatusContent>
      </NotificationStatus>
    );
  }

  // Already subscribed - show enabled status with disable option
  if (isSubscribed && permission === 'granted') {
    return (
      <NotificationStatus 
        $status="enabled" 
        $clickable
        onClick={handleUnsubscribe}
        title="Click to disable push notifications"
      >
        <FaCheckCircle size={16} color="#047857" />
        <StatusContent>
          <StatusTitle $status="enabled">Push Notifications Enabled</StatusTitle>
          <StatusSubtitle>You will receive notifications about new applications and updates.</StatusSubtitle>
        </StatusContent>
      </NotificationStatus>
    );
  }

  // Not subscribed - show enable button
  return (
    <NotificationButton
      onClick={handleSubscribe}
      disabled={subscribing || permission === 'denied'}
      title="Enable push notifications for new applications"
    >
      <FaBell size={14} />
      {subscribing ? 'Enabling...' : 'Enable Notifications'}
    </NotificationButton>
  );
};

export default PushNotificationInline;

