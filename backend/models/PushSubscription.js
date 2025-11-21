/**
 * PushSubscription Model
 * 
 * Stores Web Push subscription information for users.
 * Each subscription represents a unique browser/device that has granted
 * permission to receive push notifications.
 */

const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  // User who owns this subscription
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Push subscription endpoint (unique identifier from browser)
  endpoint: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Encryption keys for secure push messages
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  
  // User agent information (browser/device info)
  userAgent: {
    type: String,
    default: ''
  },
  
  // Whether this subscription is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Last time a notification was successfully sent to this subscription
  lastNotificationSent: {
    type: Date,
    default: null
  },
  
  // Number of failed attempts to send notifications
  failedAttempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for efficient queries
pushSubscriptionSchema.index({ user: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });

/**
 * Find all active subscriptions for a user
 * @param {String} userId - User ID
 * @returns {Promise<Array>} Array of active subscriptions
 */
pushSubscriptionSchema.statics.findActiveByUser = function(userId) {
  return this.find({ user: userId, isActive: true });
};

/**
 * Find subscription by endpoint
 * @param {String} endpoint - Subscription endpoint
 * @returns {Promise<Object|null>} Subscription or null
 */
pushSubscriptionSchema.statics.findByEndpoint = function(endpoint) {
  return this.findOne({ endpoint });
};

/**
 * Deactivate a subscription (soft delete)
 * @param {String} endpoint - Subscription endpoint
 * @returns {Promise<Object|null>} Updated subscription or null
 */
pushSubscriptionSchema.statics.deactivateByEndpoint = function(endpoint) {
  return this.findOneAndUpdate(
    { endpoint },
    { isActive: false },
    { new: true }
  );
};

/**
 * Mark notification as successfully sent
 * @param {String} endpoint - Subscription endpoint
 * @returns {Promise<Object|null>} Updated subscription or null
 */
pushSubscriptionSchema.statics.markNotificationSent = function(endpoint) {
  return this.findOneAndUpdate(
    { endpoint },
    { 
      lastNotificationSent: new Date(),
      failedAttempts: 0 // Reset failed attempts on success
    },
    { new: true }
  );
};

/**
 * Increment failed attempts counter
 * @param {String} endpoint - Subscription endpoint
 * @returns {Promise<Object|null>} Updated subscription or null
 */
pushSubscriptionSchema.statics.incrementFailedAttempts = function(endpoint) {
  return this.findOneAndUpdate(
    { endpoint },
    { 
      $inc: { failedAttempts: 1 }
    },
    { new: true }
  );
};

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);

