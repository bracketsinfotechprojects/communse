const { body, validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * @swagger
 * /fcm-token:
 *   post:
 *     summary: Register FCM token for push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM token from Firebase
 *               platform:
 *                 type: string
 *                 enum: [web, android, ios]
 *                 description: Device platform
 *               deviceId:
 *                 type: string
 *                 description: Optional device identifier
 *     responses:
 *       200:
 *         description: FCM token registered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const registerFcmToken = [
  body('token').notEmpty().withMessage('FCM token is required'),
  body('platform').isIn(['web', 'android', 'ios']).withMessage('Platform must be web, android, or ios'),
  body('deviceId').optional().trim().isLength({ max: 100 }).withMessage('Device ID cannot exceed 100 characters'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, platform, deviceId } = req.body;
      const userId = req.user.userId;

      // Find user and add FCM token
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.addFcmToken(token, platform, deviceId);

      res.json({
        success: true,
        message: 'FCM token registered successfully',
        data: {
          platform,
          deviceId,
          registeredAt: new Date()
        }
      });

    } catch (error) {
      console.error('Register FCM token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
];

/**
 * @swagger
 * /fcm-token:
 *   delete:
 *     summary: Remove FCM token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM token to remove
 *     responses:
 *       200:
 *         description: FCM token removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const removeFcmToken = [
  body('token').notEmpty().withMessage('FCM token is required'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const userId = req.user.userId;

      // Find user and remove FCM token
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.removeFcmToken(token);

      res.json({
        success: true,
        message: 'FCM token removed successfully'
      });

    } catch (error) {
      console.error('Remove FCM token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
];

/**
 * @swagger
 * /notification-settings:
 *   get:
 *     summary: Get user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('notificationSettings fcmTokens');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        notificationSettings: user.notificationSettings,
        activeTokens: user.fcmTokens.filter(token => token.isActive).length,
        totalTokens: user.fcmTokens.length
      }
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /notification-settings:
 *   put:
 *     summary: Update user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               communityUpdates:
 *                 type: boolean
 *                 description: Receive notifications for community updates
 *               eventUpdates:
 *                 type: boolean
 *                 description: Receive notifications for event updates
 *               nearbyCommunities:
 *                 type: boolean
 *                 description: Receive notifications for new communities nearby
 *               nearbyEvents:
 *                 type: boolean
 *                 description: Receive notifications for new events nearby
 *               radius:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Notification radius in kilometers
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const updateNotificationSettings = [
  body('communityUpdates').optional().isBoolean().withMessage('communityUpdates must be a boolean'),
  body('eventUpdates').optional().isBoolean().withMessage('eventUpdates must be a boolean'),
  body('nearbyCommunities').optional().isBoolean().withMessage('nearbyCommunities must be a boolean'),
  body('nearbyEvents').optional().isBoolean().withMessage('nearbyEvents must be a boolean'),
  body('radius').optional().isInt({ min: 1, max: 100 }).withMessage('Radius must be between 1 and 100 km'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const settings = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.updateNotificationSettings(settings);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          notificationSettings: user.notificationSettings
        }
      });

    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
];

/**
 * @swagger
 * /fcm-tokens:
 *   get:
 *     summary: Get user's FCM tokens
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FCM tokens retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const getFcmTokens = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('fcmTokens');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove sensitive token information from response
    const tokens = user.fcmTokens.map(token => ({
      platform: token.platform,
      deviceId: token.deviceId,
      isActive: token.isActive,
      registeredAt: token.registeredAt,
      lastUsed: token.lastUsed
    }));

    res.json({
      success: true,
      data: {
        tokens,
        activeCount: tokens.filter(t => t.isActive).length,
        totalCount: tokens.length
      }
    });

  } catch (error) {
    console.error('Get FCM tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  registerFcmToken,
  removeFcmToken,
  getNotificationSettings,
  updateNotificationSettings,
  getFcmTokens
};