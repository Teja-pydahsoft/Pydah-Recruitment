/**
 * Service Worker for Web Push Notifications
 * 
 * This service worker runs in the background and handles:
 * - Push notification events (when notifications are received)
 * - Notification click events (when user clicks on a notification)
 * - Background sync and other background tasks
 * 
 * Service workers must be in the public folder to be accessible at the root URL
 */

// Service worker version - increment this to force update
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `pydah-recruitment-${CACHE_VERSION}`;

// Install event - runs when service worker is first installed
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing service worker...', CACHE_VERSION);
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - runs when service worker becomes active
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating service worker...', CACHE_VERSION);
  
  // Claim all clients immediately
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[Service Worker] Service worker activated and claimed clients');
    })
  );
});

/**
 * Push event - triggered when a push notification is received
 * This happens even when the browser/application is closed
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'default',
    requireInteraction: false,
    data: {}
  };
  
  // Parse notification data from the push event
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image || undefined,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        timestamp: data.timestamp || Date.now()
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
      // Try to get text data as fallback
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  // Determine notification type for styling
  const notificationType = notificationData.data?.type || 'default';
  
  // Style notifications based on type
  const getNotificationStyle = (type) => {
    const styles = {
      'new_application': {
        icon: notificationData.icon || '/pydah-logo.png',
        badge: notificationData.badge || '/pydah-logo.png',
        color: '#10b981', // Green for new applications
        vibrate: [200, 100, 200]
      },
      'test_completed': {
        icon: notificationData.icon || '/pydah-logo.png',
        badge: notificationData.badge || '/pydah-logo.png',
        color: '#3b82f6', // Blue for test completions
        vibrate: [100, 50, 100, 50, 100]
      },
      'default': {
        icon: notificationData.icon || '/pydah-logo.png',
        badge: notificationData.badge || '/pydah-logo.png',
        color: '#6366f1', // Indigo for default
        vibrate: [200, 100, 200]
      }
    };
    return styles[type] || styles['default'];
  };
  
  const style = getNotificationStyle(notificationType);
  
  // Show the notification with enhanced styling
  const notificationOptions = {
    body: notificationData.body,
    icon: style.icon,
    badge: style.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction || false,
    data: notificationData.data,
    timestamp: notificationData.timestamp,
    vibrate: style.vibrate,
    // Add color for notification (supported in some browsers)
    color: style.color,
    // Add sound (if supported)
    silent: false,
    // Rich notification actions with styled buttons
    actions: [
      {
        action: 'view',
        title: '📋 View Details',
        icon: style.icon
      },
      {
        action: 'dismiss',
        title: '✕ Dismiss',
        icon: style.icon
      }
    ],
    // Add renotify for same tag (replace previous notification)
    renotify: true,
    // Show notification even if app is in foreground
    showTrigger: null
  };
  
  // Add image if provided
  if (notificationData.image) {
    notificationOptions.image = notificationData.image;
  }
  
  // Wait until notification is shown
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log('[Service Worker] Notification shown:', notificationData.title);
      })
      .catch((error) => {
        console.error('[Service Worker] Error showing notification:', error);
      })
  );
});

/**
 * Notification click event - triggered when user clicks on a notification
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);
  
  // Close the notification
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'dismiss' || event.action === 'close') {
    // User clicked dismiss/close, do nothing
    console.log('[Service Worker] Notification dismissed by user');
    return;
  }
  
  // Default action (clicking notification body) or 'view' action - navigate to the URL
  const urlToOpen = event.notification.data?.url || '/';
  console.log('[Service Worker] Opening URL:', urlToOpen);
  
  event.waitUntil(
    // Check if there's already a window/tab open with the target URL
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's a window with the target URL already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          // Focus the existing window
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Notification close event - triggered when user closes a notification
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
  // You can track analytics here if needed
});

/**
 * Message event - handles messages from the main application
 * This allows the app to communicate with the service worker
 */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Send response back to the client
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({
      success: true,
      message: 'Service worker received message'
    });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});

