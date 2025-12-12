const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const eventChatService = require('../services/eventChatService');
const firebaseCommunityChatService = require('../services/firebaseCommunityChatService');

// Validation rules
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
// FIREBASE CHAT ROUTES
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
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/rooms', auth, createChatRoomValidation, validateRequest, async (req, res) => {
  try {
    const roomData = req.body;
    const createdBy = req.user.userId;

    let result;
    if (roomData.type === 'event' && roomData.eventId) {
      // Create event chat room
      const Event = require('../models/Event');
      const event = await Event.findById(roomData.eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      result = await eventChatService.createEventChatRoom(event);
    } else {
      // Create general chat room
      result = await firebaseCommunityChatService.createChatRoom({
        ...roomData,
        createdBy
      });
    }

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/chat/rooms/community/{communityId}:
 *   get:
 *     summary: Get all chat rooms for a community
 *     tags: [Firebase Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter rooms by category
 *     responses:
 *       200:
 *         description: Community chat rooms retrieved successfully
 *       400:
 *         description: Invalid community ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 */
router.get('/rooms/community/:communityId', auth, communityIdValidation, validateRequest, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { category } = req.query;

    const rooms = await firebaseCommunityChatService.getCommunityRooms(communityId, category);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Get community rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
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
 *       401:
 *         description: Unauthorized
 */
router.get('/rooms/user', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const rooms = await firebaseCommunityChatService.getUserChatRooms(userId);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/chat/rooms/{roomId}:
 *   get:
 *     summary: Get chat room details
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
 *     responses:
 *       200:
 *         description: Chat room details retrieved successfully
 *       400:
 *         description: Invalid room ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat room not found
 */
router.get('/rooms/:roomId', auth, roomIdValidation, validateRequest, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await firebaseCommunityChatService.getChatRoom(roomId);

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(404).json({
      success: false,
      message: 'Chat room not found',
      error: error.message
    });
  }
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
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat room not found
 */
router.get('/rooms/:roomId/messages', auth, roomIdValidation, validateRequest, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await firebaseCommunityChatService.getMessages(roomId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
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
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, audio, video]
 *                 default: text
 *               replyTo:
 *                 type: string
 *                 description: ID of message being replied to
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat room not found
 */
router.post('/rooms/:roomId/messages', auth, roomIdValidation, sendMessageValidation, validateRequest, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text', replyTo = null } = req.body;
    const senderId = req.user.userId;

    // Get sender info
    const User = require('../models/User');
    const sender = await User.findById(senderId, 'firstName lastName email');
    
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Unknown User';
    const senderEmail = sender.email || '';

    const messageData = {
      chatRoomId: roomId,
      senderId: senderId,
      content: content,
      messageType: messageType,
      replyTo: replyTo,
      senderName: senderName,
      senderEmail: senderEmail
    };

    const result = await firebaseCommunityChatService.sendMessage(messageData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =============================================================================
// EVENT CHAT ROUTES
// =============================================================================

/**
 * @swagger
 * /api/events/{eventId}/chat/room:
 *   get:
 *     summary: Get event chat room information
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event chat info retrieved successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only event attendees can access chat
 *       404:
 *         description: Event not found
 */
/**
 * @swagger
 * /api/events/{eventId}/chat/messages:
 *   get:
 *     summary: Get messages from event chat room
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
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
 *         description: Event messages retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only event attendees can access chat
 *       404:
 *         description: Event or chat room not found
 */
/**
 * @swagger
 * /api/events/{eventId}/chat/messages:
 *   post:
 *     summary: Send message in event chat room
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
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
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, audio, video]
 *                 default: text
 *               replyTo:
 *                 type: string
 *                 description: ID of message being replied to
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only event attendees can send messages
 *       404:
 *         description: Event or chat room not found
 */
/**
 * @swagger
 * /api/events/{eventId}/chat/join:
 *   post:
 *     summary: Add user to event chat room when they join the event
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: User added to event chat successfully
 *       400:
 *         description: Invalid event ID or user not attending
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event or chat room not found
 */
/**
 * @swagger
 * /api/events/{eventId}/chat/leave:
 *   post:
 *     summary: Remove user from event chat room when they leave the event
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: User removed from event chat successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 */
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
 *       401:
 *         description: Unauthorized
 */
router.get('/users/events', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const eventChats = await eventChatService.getUserEventChats(userId);

    res.json({
      success: true,
      data: eventChats
    });
  } catch (error) {
    console.error('Get user event chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =============================================================================
// MESSAGE REACTIONS AND MANAGEMENT
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
 *               roomId:
 *                 type: string
 *                 description: Room ID where message belongs
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message or room not found
 */
router.post('/messages/:messageId/reactions', auth, messageIdValidation, addReactionValidation, validateRequest, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, roomId } = req.body;
    const userId = req.user.userId;

    const reactions = await firebaseCommunityChatService.addReaction(roomId, messageId, userId, emoji);

    res.json({
      success: true,
      data: reactions
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
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
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message or room not found
 */
router.post('/messages/:messageId/read', auth, messageIdValidation, markAsReadValidation, validateRequest, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { roomId } = req.body;
    const userId = req.user.userId;

    await firebaseCommunityChatService.markMessageAsRead(roomId, messageId, userId);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   put:
 *     summary: Edit a message
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
 *               - content
 *               - roomId
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *               roomId:
 *                 type: string
 *                 description: Room ID where message belongs
 *     responses:
 *       200:
 *         description: Message edited successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only sender can edit message
 *       404:
 *         description: Message or room not found
 */
router.put('/messages/:messageId', auth, messageIdValidation, editMessageValidation, validateRequest, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, roomId } = req.body;
    const userId = req.user.userId;

    await firebaseCommunityChatService.editMessage(roomId, messageId, userId, content);

    res.json({
      success: true,
      message: 'Message edited successfully'
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
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
 *         description: Message deleted successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only sender can delete message
 *       404:
 *         description: Message or room not found
 */
router.delete('/messages/:messageId', auth, messageIdValidation, deleteMessageValidation, validateRequest, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { roomId } = req.body;
    const userId = req.user.userId;

    await firebaseCommunityChatService.deleteMessage(roomId, messageId, userId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =============================================================================
// USER PRESENCE
// =============================================================================

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
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.put('/status', auth, updateStatusValidation, validateRequest, async (req, res) => {
  try {
    const { isOnline } = req.body;
    const userId = req.user.userId;

    await firebaseCommunityChatService.updateUserOnlineStatus(userId, isOnline);

    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;