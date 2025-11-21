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
    
    // Send the notification
    await webpush.sendNotification(subscription, payloadString);
    
    // Mark as successfully sent
    await PushSubscription.markNotificationSent(subscription.endpoint);
    
    return {
      success: true,
      endpoint: subscription.endpoint
    };
  } catch (error) {
    console.error('❌ [PUSH] Failed to send notification:', error.message);
    
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
    
    // Prepare notification payload
    const payload = {
      title: notificationData.title || 'New Notification',
      body: notificationData.body || '',
      icon: notificationData.icon || '/logo192.png',
      badge: notificationData.badge || '/logo192.png',
      image: notificationData.image || undefined,
      data: {
        url: notificationData.url || '/',
        ...notificationData.data
      },
      requireInteraction: notificationData.requireInteraction || false,
      tag: notificationData.tag || 'default',
      timestamp: Date.now()
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
    const superAdmins = await User.find({ role: 'superadmin' }).select('_id');
    const superAdminIds = superAdmins.map(admin => admin._id.toString());
    
    if (superAdminIds.length === 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
        message: 'No super admins found'
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

