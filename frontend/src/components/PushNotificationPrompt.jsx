/**
 * Push Notification Prompt Component
 * 
 * Displays a prompt to request push notification permission from users.
 * This component should be shown to authenticated users (especially super admins)
 * to enable them to receive notifications about new applications.
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { FaBell, FaBellSlash, FaCheckCircle } from 'react-icons/fa';
import pushNotificationService from '../services/pushNotificationService';

const PushNotificationPrompt = ({ user, onSubscriptionChange }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');

  // Initialize push notifications on component mount
  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      setLoading(true);
      
      // Check if supported
      const supported = pushNotificationService.isSupported();
      console.log('[PushNotificationPrompt] Push notifications supported:', supported);
      setIsSupported(supported);
      
      if (!supported) {
        console.log('[PushNotificationPrompt] Push notifications not supported in this browser');
        setLoading(false);
        return;
      }
      
      // Initialize and get status
      const result = await pushNotificationService.initialize();
      console.log('[PushNotificationPrompt] Initialization result:', result);
      
      if (result.supported) {
        setPermission(result.permission || 'default');
        setIsSubscribed(result.subscribed || false);
        console.log('[PushNotificationPrompt] Permission:', result.permission, 'Subscribed:', result.subscribed);
      }
    } catch (error) {
      console.error('[PushNotificationPrompt] Error initializing push notifications:', error);
      setMessage('Failed to initialize push notifications: ' + error.message);
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      setMessage(null);
      
      await pushNotificationService.subscribe();
      setIsSubscribed(true);
      setPermission('granted');
      setMessage('Successfully subscribed to push notifications!');
      setMessageType('success');
      
      if (onSubscriptionChange) {
        onSubscriptionChange(true);
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      setMessage(error.message || 'Failed to subscribe to push notifications');
      setMessageType('danger');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setSubscribing(true);
      setMessage(null);
      
      await pushNotificationService.unsubscribe();
      setIsSubscribed(false);
      setMessage('Successfully unsubscribed from push notifications');
      setMessageType('success');
      
      if (onSubscriptionChange) {
        onSubscriptionChange(false);
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setMessage(error.message || 'Failed to unsubscribe');
      setMessageType('danger');
    } finally {
      setSubscribing(false);
    }
  };

  // Don't show if not supported
  if (loading) {
    return (
      <Card className="mb-3">
        <Card.Body>
          <div className="text-center">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 mb-0">Checking push notification support...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (!isSupported) {
    return null; // Don't show anything if not supported
  }

  // Don't show if permission is denied (user explicitly denied)
  if (permission === 'denied') {
    return (
      <Card className="mb-3 border-warning">
        <Card.Body>
          <div className="d-flex align-items-center">
            <FaBellSlash className="text-warning me-2" size={20} />
            <div className="flex-grow-1">
              <Card.Title className="mb-1" style={{ fontSize: '1rem' }}>
                Push Notifications Disabled
              </Card.Title>
              <Card.Text className="mb-0" style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                You have denied notification permissions. To enable notifications, please update your browser settings.
              </Card.Text>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Show subscription status if already subscribed
  if (isSubscribed && permission === 'granted') {
    return (
      <Card className="mb-3 border-success">
        <Card.Body>
          {message && (
            <Alert variant={messageType} dismissible onClose={() => setMessage(null)}>
              {message}
            </Alert>
          )}
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <FaCheckCircle className="text-success me-2" size={20} />
              <div>
                <Card.Title className="mb-1" style={{ fontSize: '1rem' }}>
                  Push Notifications Enabled
                </Card.Title>
                <Card.Text className="mb-0" style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                  You will receive notifications about new applications and updates.
                </Card.Text>
              </div>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleUnsubscribe}
              disabled={subscribing}
            >
              {subscribing ? 'Unsubscribing...' : 'Disable'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Show prompt to subscribe
  return (
    <Card className="mb-3 border-primary">
      <Card.Body>
        {message && (
          <Alert variant={messageType} dismissible onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <FaBell className="text-primary me-2" size={20} />
            <div>
              <Card.Title className="mb-1" style={{ fontSize: '1rem' }}>
                Enable Push Notifications
              </Card.Title>
              <Card.Text className="mb-0" style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                Get instant notifications when new applications are submitted.
              </Card.Text>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubscribe}
            disabled={subscribing || permission === 'denied'}
          >
            {subscribing ? 'Enabling...' : 'Enable'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default PushNotificationPrompt;

