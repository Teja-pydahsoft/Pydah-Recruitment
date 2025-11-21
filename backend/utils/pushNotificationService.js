/**
 * Push Notification Service
 * 
 * This service handles sending push notifications to subscribed users.
 * It manages subscription storage, notification formatting, and error handling.
 */

const PushSubscription = require('../models/PushSubscription');
const { webpush } = require('../config/pushNotifications');

/**
 * Send a push notification to a single subscription
 * @param {Object} subscription - Push subscription object with endpoint and keys
 * @param {Object} payload - Notification payload (title, body, icon, etc.)
 * @returns {Promise<Object>} Result object with success status
 */
async function sendNotificationToSubscription(subscription, payload) {
  try {
    // Ensure payload is a string (web-push requires JSON string)
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Log notification attempt (helpful for production debugging)
    console.log(`📤 [PUSH] Attempting to send notification to: ${subscription.endpoint.substring(0, 50)}...`);
    console.log(`📤 [PUSH] Payload:`, JSON.stringify(payload, null, 2));
    
    // Send the notification
    await webpush.sendNotification(subscription, payloadString);
    
    // Mark as successfully sent
    await PushSubscription.markNotificationSent(subscription.endpoint);
    
    console.log(`✅ [PUSH] Notification sent successfully to: ${subscription.endpoint.substring(0, 50)}...`);
    
    return {
      success: true,
      endpoint: subscription.endpoint
    };
  } catch (error) {
    console.error('❌ [PUSH] Failed to send notification:', error.message);
    console.error('❌ [PUSH] Error details:', {
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      body: error.body,
      endpoint: subscription.endpoint ? subscription.endpoint.substring(0, 50) : 'N/A'
    });
    
    // Handle specific error cases
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription is no longer valid (user unsubscribed or expired)
      console.log('⚠️  [PUSH] Subscription expired or invalid, deactivating:', subscription.endpoint);
      await PushSubscription.deactivateByEndpoint(subscription.endpoint);
      return {
        success: false,
        error: 'Subscription expired',
        endpoint: subscription.endpoint
      };
    }
    
    // Handle VAPID credentials mismatch (403 error)
    if (error.statusCode === 403 && error.body && error.body.includes('VAPID')) {
      console.error('❌ [PUSH] VAPID credentials mismatch!');
      console.error('❌ [PUSH] The subscription was created with different VAPID keys.');
      console.error('❌ [PUSH] Solution: User needs to unsubscribe and re-subscribe to get new keys.');
      console.error('❌ [PUSH] This usually happens when VAPID keys were regenerated after subscription was created.');
      
      // Deactivate the subscription so user can re-subscribe
      await PushSubscription.deactivateByEndpoint(subscription.endpoint);
      return {
        success: false,
        error: 'VAPID credentials mismatch - subscription needs to be renewed',
        endpoint: subscription.endpoint
      };
    }
    
    // Increment failed attempts
    await PushSubscription.incrementFailedAttempts(subscription.endpoint);
    
    // Deactivate after too many failures
    const subscriptionDoc = await PushSubscription.findByEndpoint(subscription.endpoint);
    if (subscriptionDoc && subscriptionDoc.failedAttempts >= 3) {
      console.log('⚠️  [PUSH] Too many failed attempts, deactivating subscription:', subscription.endpoint);
      await PushSubscription.deactivateByEndpoint(subscription.endpoint);
    }
    
    return {
      success: false,
      error: error.message,
      endpoint: subscription.endpoint
    };
  }
}

/**
 * Send push notification to all active subscriptions for a user
 * @param {String} userId - User ID
 * @param {Object} notificationData - Notification data (title, body, icon, url, etc.)
 * @returns {Promise<Object>} Result object with success count and failures
 */
async function sendNotificationToUser(userId, notificationData) {
  try {
    // Find all active subscriptions for the user
    const subscriptions = await PushSubscription.findActiveByUser(userId);
    
    if (subscriptions.length === 0) {
      console.log('ℹ️  [PUSH] No active subscriptions found for user:', userId);
      return {
        success: true,
        sent: 0,
        failed: 0,
        message: 'No active subscriptions'
      };
    }
    
    console.log(`📤 [PUSH] Sending notification to ${subscriptions.length} subscription(s) for user: ${userId}`);
    
    // Get frontend URL for absolute icon/badge URLs (required for production)
    // Handle case where FRONTEND_URL might be comma-separated (take first one)
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (frontendUrl.includes(',')) {
      frontendUrl = frontendUrl.split(',')[0].trim();
      console.warn('⚠️  [PUSH] FRONTEND_URL contains multiple values, using first:', frontendUrl);
    }
    
    // Helper to make URL absolute if it's relative
    const makeAbsoluteUrl = (url) => {
      if (!url) return undefined;
      // If already absolute, return as-is (but clean up any issues)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Check for malformed URLs (with commas or multiple URLs)
        if (url.includes(',') && (url.includes('http://') || url.includes('https://'))) {
          // Extract the first valid URL
          const urlMatch = url.match(/(https?:\/\/[^\s,]+)/);
          return urlMatch ? urlMatch[1] : url.split(',')[0].trim();
        }
        return url; // Already absolute
      }
      // Make relative URL absolute
      return `${frontendUrl}${url.startsWith('/') ? url : '/' + url}`;
    };
    
    // Prepare notification payload with enhanced styling
    // Use pydah-logo.png as the default logo (matching the favicon)
    const defaultIcon = `${frontendUrl}/pydah-logo.png`;
    const defaultBadge = `${frontendUrl}/pydah-logo.png`;
    
    // Determine notification type for styling
    const notificationType = notificationData.data?.type || 'default';
    
    // Enhanced notification payload with styling
    const payload = {
      title: notificationData.title || 'New Notification',
      body: notificationData.body || '',
      icon: makeAbsoluteUrl(notificationData.icon) || defaultIcon,
      badge: makeAbsoluteUrl(notificationData.badge) || defaultBadge,
      image: makeAbsoluteUrl(notificationData.image),
      data: {
        url: notificationData.url || `${frontendUrl}/`,
        type: notificationType,
        ...notificationData.data
      },
      // Styling options
      color: notificationData.color || (notificationType === 'new_application' ? '#10b981' : notificationType === 'test_completed' ? '#3b82f6' : '#6366f1'),
      requireInteraction: notificationData.requireInteraction || false,
      tag: notificationData.tag || 'default',
      timestamp: Date.now(),
      // Additional metadata for better styling
      priority: notificationData.priority || 'high',
      silent: false
    };
    
    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub => {
        const subscriptionObj = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        };
        return sendNotificationToSubscription(subscriptionObj, payload);
      })
    );
    
    // Count successes and failures
    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;
    
    console.log(`✅ [PUSH] Notification sent: ${sent} successful, ${failed} failed`);
    
    return {
      success: sent > 0,
      sent,
      failed,
      total: subscriptions.length
    };
  } catch (error) {
    console.error('❌ [PUSH] Error sending notification to user:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 0
    };
  }
}

/**
 * Send push notification to multiple users
 * @param {Array<String>} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Aggregate result
 */
async function sendNotificationToUsers(userIds, notificationData) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendNotificationToUser(userId, notificationData))
  );
  
  const totalSent = results
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + (r.value.sent || 0), 0);
  
  const totalFailed = results
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + (r.value.failed || 0), 0);
  
  return {
    success: totalSent > 0,
    sent: totalSent,
    failed: totalFailed,
    total: userIds.length
  };
}

/**
 * Send notification to all super admins
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Result object
 */
async function sendNotificationToSuperAdmins(notificationData) {
  try {
    const User = require('../models/User');
    // Use 'super_admin' (with underscore) as that's the actual role in the database
    const superAdmins = await User.find({ role: 'super_admin' }).select('_id email');
    const superAdminIds = superAdmins.map(admin => admin._id.toString());
    
    console.log(`🔍 [PUSH] Found ${superAdmins.length} super admin(s):`, superAdmins.map(a => a.email));
    
    if (superAdminIds.length === 0) {
      console.warn('⚠️  [PUSH] No super admins found in database');
      return {
        success: true,
        sent: 0,
        failed: 0,
        message: 'No super admins found'
      };
    }
    
    // Check for active subscriptions
    const PushSubscription = require('../models/PushSubscription');
    const allSubscriptions = await PushSubscription.find({ 
      user: { $in: superAdminIds }, 
      isActive: true 
    });
    
    console.log(`🔍 [PUSH] Found ${allSubscriptions.length} active subscription(s) for super admins`);
    
    if (allSubscriptions.length === 0) {
      console.warn('⚠️  [PUSH] No active push subscriptions found for super admins');
      return {
        success: true,
        sent: 0,
        failed: 0,
        message: 'No active subscriptions found'
      };
    }
    
    return await sendNotificationToUsers(superAdminIds, notificationData);
  } catch (error) {
    console.error('❌ [PUSH] Error sending notification to super admins:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 0
    };
  }
}

module.exports = {
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationToSuperAdmins,
  sendNotificationToSubscription
};

