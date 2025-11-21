/**
 * Push Notifications Routes
 * 
 * Handles Web Push subscription management:
 * - Subscribe: Save a new push subscription
 * - Unsubscribe: Remove a push subscription
 * - Get public key: Retrieve VAPID public key for frontend
 */

const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const { getPublicKey } = require('../config/pushNotifications');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/push/public-key
 * Get the public VAPID key for frontend subscription
 * This endpoint is public (no authentication required) as the public key is safe to expose
 */
router.get('/public-key', (req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('❌ [PUSH] Error getting public key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve public key'
    });
  }
});

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 * Requires authentication - user must be logged in
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    
    // Validate subscription object
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }
    
    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Missing subscription keys'
      });
    }
    
    // Check if subscription already exists
    const existing = await PushSubscription.findByEndpoint(subscription.endpoint);
    
    if (existing) {
      // Update existing subscription (reactivate if needed)
      existing.user = req.user._id;
      existing.keys = {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      };
      existing.userAgent = userAgent || req.headers['user-agent'] || '';
      existing.isActive = true;
      existing.failedAttempts = 0; // Reset failed attempts
      await existing.save();
      
      console.log(`✅ [PUSH] Updated existing subscription for user: ${req.user.email}`);
      
      return res.json({
        success: true,
        message: 'Subscription updated successfully',
        subscriptionId: existing._id
      });
    }
    
    // Create new subscription
    const pushSubscription = new PushSubscription({
      user: req.user._id,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      userAgent: userAgent || req.headers['user-agent'] || ''
    });
    
    await pushSubscription.save();
    
    console.log(`✅ [PUSH] New subscription created for user: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Subscription created successfully',
      subscriptionId: pushSubscription._id
    });
  } catch (error) {
    console.error('❌ [PUSH] Error subscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription'
    });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 * Requires authentication
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required'
      });
    }
    
    // Find and deactivate subscription
    const subscription = await PushSubscription.findByEndpoint(endpoint);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Verify ownership (user can only unsubscribe their own subscriptions)
    if (subscription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Deactivate subscription
    await PushSubscription.deactivateByEndpoint(endpoint);
    
    console.log(`✅ [PUSH] Subscription unsubscribed for user: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Unsubscribed successfully'
    });
  } catch (error) {
    console.error('❌ [PUSH] Error unsubscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe'
    });
  }
});

/**
 * GET /api/push/subscriptions
 * Get all active subscriptions for the current user
 * Requires authentication
 */
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await PushSubscription.findActiveByUser(req.user._id);
    
    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        endpoint: sub.endpoint,
        userAgent: sub.userAgent,
        createdAt: sub.createdAt,
        lastNotificationSent: sub.lastNotificationSent
      }))
    });
  } catch (error) {
    console.error('❌ [PUSH] Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
});

module.exports = router;

