/**
 * Push Notification Service
 * 
 * Handles Web Push Notification subscription management in the frontend:
 * - Requesting browser permission
 * - Subscribing to push notifications
 * - Unsubscribing from push notifications
 * - Managing service worker registration
 */

import api from './api';

// Service worker registration
let serviceWorkerRegistration = null;
let publicVapidKey = null;

/**
 * Register the service worker
 * Service workers must be registered to handle push notifications
 * @returns {Promise<ServiceWorkerRegistration>} Service worker registration
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Register the service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('[Push] Service Worker registered:', registration.scope);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker ready');
      
      serviceWorkerRegistration = registration;
      return registration;
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Service Workers are not supported in this browser');
  }
}

/**
 * Get the public VAPID key from the server
 * This key is needed to create a push subscription
 * @returns {Promise<String>} Public VAPID key
 */
async function getPublicKey() {
  if (publicVapidKey) {
    return publicVapidKey;
  }
  
  try {
    const response = await api.get('/push/public-key');
    if (response.data.success && response.data.publicKey) {
      publicVapidKey = response.data.publicKey;
      return publicVapidKey;
    } else {
      throw new Error('Failed to get public key');
    }
  } catch (error) {
    console.error('[Push] Error getting public key:', error);
    throw error;
  }
}

/**
 * Convert VAPID key from base64 URL-safe to Uint8Array
 * @param {String} base64String - Base64 URL-safe string
 * @returns {Uint8Array} Converted array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 * @returns {Boolean} True if supported
 */
function isSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if user has granted notification permission
 * @returns {Promise<String>} Permission status ('granted', 'denied', 'default')
 */
async function getPermissionStatus() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  return Notification.permission;
}

/**
 * Request notification permission from the user
 * @returns {Promise<String>} Permission status
 */
async function requestPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser');
  }
  
  const permission = await Notification.requestPermission();
  console.log('[Push] Notification permission:', permission);
  return permission;
}

/**
 * Subscribe to push notifications
 * This creates a subscription and sends it to the server
 * @returns {Promise<Object>} Subscription object
 */
async function subscribe() {
  try {
    // Check if supported
    if (!isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }
    
    // Register service worker if not already registered
    if (!serviceWorkerRegistration) {
      serviceWorkerRegistration = await registerServiceWorker();
    }
    
    // Check permission
    let permission = await getPermissionStatus();
    if (permission === 'default') {
      permission = await requestPermission();
    }
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }
    
    // Get public key
    const publicKey = await getPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    
    // Subscribe to push notifications
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true, // Always show notifications to user
      applicationServerKey: applicationServerKey
    });
    
    // Convert subscription to JSON format
    const subscriptionJson = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
      }
    };
    
    // Send subscription to server
    const response = await api.post('/push/subscribe', {
      subscription: subscriptionJson,
      userAgent: navigator.userAgent
    });
    
    if (response.data.success) {
      console.log('[Push] Successfully subscribed to push notifications');
      return subscriptionJson;
    } else {
      throw new Error(response.data.message || 'Failed to subscribe');
    }
  } catch (error) {
    console.error('[Push] Error subscribing:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 * @param {String} endpoint - Subscription endpoint (optional, will find if not provided)
 * @returns {Promise<Boolean>} True if successful
 */
async function unsubscribe(endpoint = null) {
  try {
    // If endpoint not provided, get current subscription
    if (!endpoint) {
      if (!serviceWorkerRegistration) {
        serviceWorkerRegistration = await registerServiceWorker();
      }
      
      const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }
    }
    
    if (endpoint) {
      // Notify server
      await api.post('/push/unsubscribe', { endpoint });
      console.log('[Push] Successfully unsubscribed from push notifications');
    }
    
    return true;
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    throw error;
  }
}

/**
 * Check if user is currently subscribed
 * @returns {Promise<Boolean>} True if subscribed
 */
async function isSubscribed() {
  try {
    if (!serviceWorkerRegistration) {
      serviceWorkerRegistration = await registerServiceWorker();
    }
    
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[Push] Error checking subscription status:', error);
    return false;
  }
}

/**
 * Initialize push notifications
 * Registers service worker and checks subscription status
 * @returns {Promise<Object>} Initialization result
 */
async function initialize() {
  try {
    console.log('[Push] Initializing push notifications...');
    
    if (!isSupported()) {
      console.log('[Push] Push notifications not supported');
      return {
        supported: false,
        message: 'Push notifications are not supported in this browser'
      };
    }
    
    // Register service worker
    console.log('[Push] Registering service worker...');
    await registerServiceWorker();
    console.log('[Push] Service worker registered successfully');
    
    // Check subscription status
    const subscribed = await isSubscribed();
    const permission = await getPermissionStatus();
    
    console.log('[Push] Initialization complete - Subscribed:', subscribed, 'Permission:', permission);
    
    return {
      supported: true,
      subscribed,
      permission,
      serviceWorkerReady: true
    };
  } catch (error) {
    console.error('[Push] Error initializing push notifications:', error);
    return {
      supported: false,
      error: error.message
    };
  }
}

const pushNotificationService = {
  isSupported,
  getPermissionStatus,
  requestPermission,
  subscribe,
  unsubscribe,
  isSubscribed,
  initialize,
  registerServiceWorker
};

export default pushNotificationService;

