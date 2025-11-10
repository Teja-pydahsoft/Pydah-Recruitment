const express = require('express');
const NotificationSettings = require('../models/NotificationSettings');
const { ensureSMSConfigured } = require('../config/sms');
const { authenticateToken, requireSuperAdminOrPermission } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/notifications',
  authenticateToken,
  requireSuperAdminOrPermission('settings.manage'),
  async (req, res) => {
    try {
      const settings = await NotificationSettings.getGlobalSettings();
      res.json({
        settings,
        capabilities: {
          sms: ensureSMSConfigured(),
          whatsapp: Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID && process.env.WHATSAPP_ACCESS_TOKEN),
        },
      });
    } catch (error) {
      console.error('Notification settings fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch notification settings' });
    }
  },
);

router.put(
  '/notifications',
  authenticateToken,
  requireSuperAdminOrPermission('settings.manage'),
  async (req, res) => {
    try {
      const { candidate = {} } = req.body || {};

      const updated = await NotificationSettings.updateGlobalSettings(candidate, req.user?._id);
      res.json({
        settings: updated,
        capabilities: {
          sms: ensureSMSConfigured(),
          whatsapp: Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID && process.env.WHATSAPP_ACCESS_TOKEN),
        },
      });
    } catch (error) {
      console.error('Notification settings update error:', error);
      res.status(500).json({ message: 'Failed to update notification settings' });
    }
  },
);

module.exports = router;

