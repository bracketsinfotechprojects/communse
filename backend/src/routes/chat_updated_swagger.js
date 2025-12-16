const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const eventChatService = require('../services/eventChatService');
const firebaseCommunityChatService = require('../services/firebaseCommunityChatService');

// Validation rules (same as before)
const createChatRoomValidation = [
  body('type')
    .isIn(['private', 'community', 'event'])
    .withMessage('Room type must be private, community, or event'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim(),
  body('communityId')
    .optional()
    .isMongoId()
    .withMessage('Valid community ID is required'),
  body('eventId')
    .optional()
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('participants')
    .optional()
    .isArray()
    .withMessage('Participants must be an array'),
  body('participants.*')
    .optional()
    .isMongoId()
    .withMessage('Each participant must have a valid user ID')
];

const sendMessageValidation = [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
    .trim(),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video'])
    .withMessage('Invalid message type'),
  body('replyTo')
    .optional()
    .isString()
    .withMessage('ReplyTo must be a valid message ID')
];

const addReactionValidation = [
  body('emoji')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
    .trim(),
  body('roomId')
    .isMongoId()
    .withMessage('Valid room ID is required')
];

const markAsReadValidation = [
  body('roomId')
    .isMongoId()
    .withMessage('Valid room ID is required')
];

const updateStatusValidation = [
  body('isOnline')
    .isBoolean()
    .withMessage('isOnline must be a boolean')
];

const editMessageValidation = [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
    .trim(),
  body('roomId')
    .isMongoId()
    .withMessage('Valid room ID is required')
];

const deleteMessageValidation = [
  body('roomId')
    .isMongoId()
    .withMessage('Valid room ID is required')
];

const roomIdValidation = [
  param('roomId')
    .isMongoId()
    .withMessage('Valid room ID is required')
];

const messageIdValidation = [
  param('messageId')
    .isString()
    .withMessage('Valid message ID is required')
];

const eventIdValidation = [
  param('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required')
];

const communityIdValidation = [
  param('communityId')
    .isMongoId()
    .withMessage('Valid community ID is required')
];

// =============================================================================
// FIREBASE CHAT ROUTES - WITH UPDATED SWAGGER DOCUMENTATION
// =============================================================================

/**
 * @swagger
 * /api/chat/rooms:
 *   post:
 *     summary: Create a new chat room
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [private, community, event]
 *               name:
 *                 type: string
 *                 description: Room name (required for group chats)
 *               description:
 *                 type: string
 *               communityId:
 *                 type: string
 *                 description: Community ID (required for community/event type)
 *               eventId:
 *                 type: string
 *                 description: Event ID (required for event type)
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to add as participants
 *     responses:
 *       201:
 *         description: Chat room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                     firebaseRoomData:
 *                       type: object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/rooms', auth, createChatRoomValidation, validateRequest, async (req, res) => {
  // ... existing implementation
});

/**
 * @swagger
 * /api/chat/rooms/user:
 *   get:
 *     summary: Get all chat rooms for the current user
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User chat rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Room ID
 *                       name:
 *                         type: string
 *                         description: Room name
 *                       type:
 *                         type: string
 *                         enum: [private, community, event]
 *                       category:
 *                         type: string
 *                         description: Room category
 *                       description:
 *                         type: string
 *                         description: Room description
 *                       communityId:
 *                         type: string
 *                         description: Associated community ID
 *                       participantCount:
 *                         type: integer
 *                         description: Number of participants
 *                       lastMessage:
 *                         type: string
 *                         description: Last message content
 *                       lastMessageBy:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       lastActivity:
 *                         type: string
 *                         format: date-time
 *                       messageCount:
 *                         type: integer
 *                       isPrivate:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/rooms/user', auth, async (req, res) => {
  // ... existing implementation
});

/**
 * @swagger
 * /api/chat/rooms/{roomId}/messages:
 *   get:
 *     summary: Get messages from a chat room
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of messages to skip
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Message ID
 *                       content:
 *                         type: string
 *                         description: Message content
 *                       messageType:
 *                         type: string
 *                         enum: [text, image, file, audio, video]
 *                       sender:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Sender user ID
 *                           name:
 *                             type: string
 *                             description: Sender name
 *                           avatar:
 *                             type: string
 *                             description: Sender avatar URL
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       replyTo:
 *                         type: string
 *                         description: ID of message being replied to
 *                       reactions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             userId:
 *                               type: string
 *                             emoji:
 *                               type: string
 *                       isEdited:
 *                         type: boolean
 *                       isDeleted:
 *                         type: boolean
 *                       readBy:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Array of user IDs who have read the message
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat room not found
 */
router.get('/rooms/:roomId/messages', auth, roomIdValidation, validateRequest, async (req, res) => {
  // ... existing implementation
});

/**
 * @swagger
 * /api/chat/rooms/{roomId}/messages:
 *   post:
 *     summary: Send a message in a chat room
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, audio, video]
 *                 default: text
 *                 description: Type of message
 *               replyTo:
 *                 type: string
 *                 description: ID of message being replied to
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       description: Unique message ID
 *                     content:
 *                       type: string
 *                       description: Message content
 *                     messageType:
 *                       type: string
 *                       enum: [text, image, file, audio, video]
 *                     sender:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Sender user ID
 *                         name:
 *                           type: string
 *                           description: Sender name
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     chatRoomId:
 *                       type: string
 *                       description: Chat room ID
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat room not found
 */
router.post('/rooms/:roomId/messages', auth, roomIdValidation, sendMessageValidation, validateRequest, async (req, res) => {
  // ... existing implementation
});

/**
 * @swagger
 * /api/chat/users/events:
 *   get:
 *     summary: Get user's event chat rooms
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User event chats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roomId:
 *                         type: string
 *                         description: Chat room ID
 *                       eventId:
 *                         type: string
 *                         description: Event ID
 *                       eventTitle:
 *                         type: string
 *                         description: Event title
 *                       eventStatus:
 *                         type: string
 *                         description: Event status
 *                       eventStartTime:
 *                         type: string
 *                         format: date-time
 *                       eventEndTime:
 *                         type: string
 *                         format: date-time
 *                       createdBy:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       lastActivity:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/users/events', auth, async (req, res) => {
  // ... existing implementation
});

// =============================================================================
// MESSAGE REACTIONS AND MANAGEMENT - WITH UPDATED SWAGGER
// =============================================================================

/**
 * @swagger
 * /api/chat/messages/{messageId}/reactions:
 *   post:
 *     summary: Add reaction to a message
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *               - roomId
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Reaction emoji
 *               roomId:
 *                 type: string
 *                 description: Room ID where message belongs
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       emoji:
 *                         type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message or room not found
 */
router.post('/messages/:messageId/reactions', auth, messageIdValidation, addReactionValidation, validateRequest, async (req, res) => {
  // ... existing implementation
});

/**
 * @swagger
 * /api/chat/messages/{messageId}/read:
 *   post:
 *     summary: Mark message as read
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: Room ID where message belongs
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message or room not found
 */
router.post('/messages/:messageId/read', auth, messageIdValidation, markAsReadValidation, validateRequest, async (req, res) => {
  // ... existing implementation
});

/**
 * @swagger
 * /api/chat/status:
 *   put:
 *     summary: Update user online status
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isOnline
 *             properties:
 *               isOnline:
 *                 type: boolean
 *                 description: User online status
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.put('/status', auth, updateStatusValidation, validateRequest, async (req, res) => {
  // ... existing implementation
});

module.exports = router;