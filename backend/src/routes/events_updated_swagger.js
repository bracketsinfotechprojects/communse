const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const eventController = require('../controllers/eventController');
const eventChatService = require('../services/eventChatService');

// ... existing validation rules ...

// =============================================================================
// EVENT CHAT ROUTES - WITH UPDATED SWAGGER DOCUMENTATION
// =============================================================================

/**
 * @swagger
 * /api/events/{id}/chat:
 *   get:
 *     summary: Get event chat room information
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event chat info retrieved successfully
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
 *                     eventId:
 *                       type: string
 *                       description: Event ID
 *                     eventTitle:
 *                       type: string
 *                       description: Event title
 *                     chatRoomId:
 *                       type: string
 *                       description: Chat room ID
 *                     chatRoomCreated:
 *                       type: boolean
 *                       description: Whether chat room was created
 *                     participantCount:
 *                       type: integer
 *                       description: Number of participants
 *                     isEventActive:
 *                       type: boolean
 *                       description: Whether event is active
 *                     eventStatus:
 *                       type: string
 *                       description: Event status
 *                     createdBy:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only event attendees can access chat
 *       404:
 *         description: Event not found
 */
router.get('/:id/chat', auth, eventIdValidation, validateRequest, eventController.getEventChatInfo);

/**
 * @swagger
 * /api/events/{id}/chat/room:
 *   get:
 *     summary: Get event chat room information (alternative endpoint)
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event chat info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventChatInfo'
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only event attendees can access chat
 *       404:
 *         description: Event not found
 */
router.get('/:id/chat/room', auth, eventIdValidation, validateRequest, eventController.getEventChatInfo);

/**
 * @swagger
 * /api/events/{id}/chat/messages:
 *   get:
 *     summary: Get messages from event chat room
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                           name:
 *                             type: string
 *                           avatar:
 *                             type: string
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
 *       403:
 *         description: Only event attendees can access chat
 *       404:
 *         description: Event or chat room not found
 */
router.get('/:id/chat/messages', auth, eventIdValidation, validateRequest, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    const eventChatService = require('../services/eventChatService');

    const canAccess = await eventChatService.verifyEventChatPermission(eventId, userId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only event attendees can access chat'
      });
    }

    const messages = await eventChatService.getEventMessages(eventId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get event messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/events/{id}/chat/messages:
 *   post:
 *     summary: Send message in event chat room
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *       403:
 *         description can send messages
 *       404:
 *         description: Event or chat room not found
id/chat/m: Only event attendees */
router.post('/:essages', auth, eventIdValidation, [
  body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters').trim(),
  body('messageType').optional().isIn(['text', 'image', 'file', 'audio', 'video']).withMessage('Invalid message type')
], validateRequest, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { content, messageType = 'text', replyTo = null } = req.body;
    const senderId = req.user.userId;

    const eventChatService = require('../services/eventChatService');

    const messageData = {
      eventId: eventId,
      senderId: senderId,
      content: content,
      messageType: messageType,
      replyTo: replyTo
    };

    const result = await eventChatService.sendEventMessage(messageData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Send event message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/events/{id}/chat/join:
 *   post:
 *     summary: Add user to event chat room when they join the event
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: User added to event chat successfully
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
 *                     eventId:
 *                       type: string
 *                       description: Event ID
 *                     userId:
 *                       type: string
 *                       description: User ID
 *                     roomId:
 *                       type: string
 *                       description: Chat room ID
 *       400:
 *         description: Invalid event ID or user not attending
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event or chat room not found
 */
router.post('/:id/chat/join', auth, eventIdValidation, validateRequest, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.userId;

    const eventChatService = require('../services/eventChatService');

    const result = await eventChatService.addUserToEventChat(eventId, userId);

    res.json(result);
  } catch (error) {
    console.error('Add user to event chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/events/{id}/chat/leave:
 *   post:
 *     summary: Remove user from event chat room when they leave the event
 *     tags: [Event Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: User removed from event chat successfully
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
 *                     eventId:
 *                       type: string
 *                       description: Event ID
 *                     userId:
 *                       type: string
 *                       description: User ID
 *                     roomId:
 *                       type: string
 *                       description: Chat room ID
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/chat/leave', auth, eventIdValidation, validateRequest, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.userId;

    const eventChatService = require('../services/eventChatService');

    const result = await eventChatService.removeUserFromEventChat(eventId, userId);

    res.json(result);
  } catch (error) {
    console.error('Remove user from event chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ... rest of the file with other event routes ...

module.exports = router;