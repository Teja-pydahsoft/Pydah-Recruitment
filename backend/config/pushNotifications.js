/**
 * Web Push Notifications Configuration
 * 
 * This module handles VAPID key generation and configuration for Web Push Notifications.
 * VAPID (Voluntary Application Server Identification) keys are used to identify
 * the server to push services and ensure secure communication.
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Path to store VAPID keys
const VAPID_KEYS_PATH = path.join(__dirname, 'vapid-keys.json');

/**
 * Generate new VAPID keys
 * These keys are used to identify your server to push services
 * @returns {Object} Object containing publicKey and privateKey
 */
function generateVAPIDKeys() {
  const vapidKeys = webpush.generateVAPIDKeys();
  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey
  };
}

/**
 * Load VAPID keys from file or generate new ones if they don't exist
 * @returns {Object} Object containing publicKey and privateKey
 */
function getVAPIDKeys() {
  try {
    // Try to load existing keys
    if (fs.existsSync(VAPID_KEYS_PATH)) {
      const keysData = fs.readFileSync(VAPID_KEYS_PATH, 'utf8');
      const keys = JSON.parse(keysData);
      
      // Validate keys exist
      if (keys.publicKey && keys.privateKey) {
        console.log('✅ Loaded existing VAPID keys');
        return keys;
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not load VAPID keys, generating new ones:', error.message);
  }

  // Generate new keys if they don't exist or are invalid
  console.log('🔑 Generating new VAPID keys...');
  const newKeys = generateVAPIDKeys();
  
  // Save keys to file
  try {
    fs.writeFileSync(VAPID_KEYS_PATH, JSON.stringify(newKeys, null, 2), 'utf8');
    console.log('✅ VAPID keys generated and saved to:', VAPID_KEYS_PATH);
  } catch (error) {
    console.error('❌ Failed to save VAPID keys:', error.message);
    throw error;
  }

  return newKeys;
}

/**
 * Initialize VAPID keys and configure web-push
 * This should be called when the server starts
 */
function initializePushNotifications() {
  try {
    const keys = getVAPIDKeys();
    
    // Get contact information from environment or use default
    const contactEmail = process.env.PUSH_NOTIFICATION_CONTACT_EMAIL || 
                        process.env.ADMIN_EMAIL || 
                        'admin@example.com';
    
    // Set VAPID details for web-push
    webpush.setVapidDetails(
      `mailto:${contactEmail}`, // Contact email for the application
      keys.publicKey,            // Public VAPID key
      keys.privateKey            // Private VAPID key
    );
    
    console.log('✅ Web Push Notifications initialized');
    console.log('📧 Contact email:', contactEmail);
    console.log('🔑 Public key:', keys.publicKey.substring(0, 20) + '...');
    
    return keys;
  } catch (error) {
    console.error('❌ Failed to initialize push notifications:', error);
    throw error;
  }
}

/**
 * Get the public VAPID key (used by frontend to subscribe)
 * @returns {String} Public VAPID key
 */
function getPublicKey() {
  const keys = getVAPIDKeys();
  return keys.publicKey;
}

module.exports = {
  initializePushNotifications,
  getPublicKey,
  getVAPIDKeys,
  generateVAPIDKeys,
  webpush // Export webpush for sending notifications
};

