const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  registerFcmToken,
  removeFcmToken,
  getNotificationSettings,
  updateNotificationSettings,
  getFcmTokens
} = require('../controllers/notificationController');

// All routes require authentication
router.use(auth);

/**
 * @swagger
 * components:
 *   schemas:
 *     FCMToken:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: FCM token from Firebase
 *         platform:
 *           type: string
 *           enum: [web, android, ios]
 *           description: Device platform
 *         deviceId:
 *           type: string
 *           description: Optional device identifier
 * 
 *     NotificationSettings:
 *       type: object
 *       properties:
 *         communityUpdates:
 *           type: boolean
 *           description: Receive notifications for community updates
 *           default: true
 *         eventUpdates:
 *           type: boolean
 *           description: Receive notifications for event updates
 *           default: true
 *         nearbyCommunities:
 *           type: boolean
 *           description: Receive notifications for new communities nearby
 *           default: true
 *         nearbyEvents:
 *           type: boolean
 *           description: Receive notifications for new events nearby
 *           default: true
 *         radius:
 *           type: number
 *           description: Notification radius in kilometers
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 */

// FCM Token Management Routes
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
 *             $ref: '#/components/schemas/FCMToken'
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
router.post('/fcm-token', registerFcmToken);

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
router.delete('/fcm-token', removeFcmToken);

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
 *       500:
 *         description: Server error
 */
router.get('/fcm-tokens', getFcmTokens);

// Notification Settings Routes
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
 *       500:
 *         description: Server error
 */
router.get('/notification-settings', getNotificationSettings);

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
 *             $ref: '#/components/schemas/NotificationSettings'
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/notification-settings', updateNotificationSettings);

module.exports = router;