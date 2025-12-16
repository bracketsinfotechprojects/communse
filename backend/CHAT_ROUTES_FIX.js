/**
 * Comprehensive Chat Routes Fix
 * This script fixes the route conflicts and provides working endpoints
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const eventChatService = require('../services/eventChatService');
const firebaseCommunityChatService = require('../services/firebaseCommunityChatService');

// =============================================================================
// ROUTE CONFLICT RESOLUTION
// =============================================================================

/**
 * ISSUE IDENTIFIED:
 * Event chat routes are defined in BOTH:
 * 1. events.js router (lines 888, 891) -> /api/events/:id/chat*
 * 2. chat.js router (lines 519, 590, 667, 723, 764) -> /api/events/:eventId/chat*
 * 
 * This creates confusion about which routes actually work.
 * 
 * SOLUTION:
 * Remove duplicate routes from chat.js and keep only general chat functionality there.
 * Event-specific chat routes should be in events.js only.
 */

// =============================================================================
// GENERAL CHAT ROUTES (Firebase Community Chat)
// =============================================================================

// Get user's chat rooms
router.get('/rooms/user', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rooms = await firebaseCommunityChatService.getUserChatRooms(userId);
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get community chat rooms
router.get('/rooms/community/:communityId', auth, [
  param('communityId').isMongoId().withMessage('Valid community ID is required')
], validateRequest, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { category } = req.query;
    const rooms = await firebaseCommunityChatService.getCommunityRooms(communityId, category);
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Get community rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get chat room details
router.get('/rooms/:roomId', auth, [
  param('roomId').isMongoId().withMessage('Valid room ID is required')
], validateRequest, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await firebaseCommunityChatService.getChatRoom(roomId);
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(404).json({
      success: false,
      message: 'Chat room not found',
      error: error.message
    });
  }
});

// Get messages from a chat room
router.get('/rooms/:roomId/messages', auth, [
  param('roomId').isMongoId().withMessage('Valid room ID is required')
], validateRequest, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const messages = await firebaseCommunityChatService.getMessages(roomId, parseInt(limit), parseInt(offset));
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send message in a chat room
router.post('/rooms/:roomId/messages', auth, [
  param('roomId').isMongoId().withMessage('Valid room ID is required'),
  body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters').trim(),
  body('messageType').optional().isIn(['text', 'image', 'file', 'audio', 'video']).withMessage('Invalid message type')
], validateRequest, async (req, res) => {
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

// Create a new chat room
router.post('/rooms', auth, [
  body('type').isIn(['private', 'community', 'event']).withMessage('Room type must be private, community, or event'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Room name must be between 1 and 100 characters').trim(),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters').trim()
], validateRequest, async (req, res) => {
  try {
    const roomData = req.body;
    const createdBy = req.user.userId;

    const result = await firebaseCommunityChatService.createChatRoom({
      ...roomData,
      createdBy
    });

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

// Get user's event chat rooms
router.get('/users/events', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const eventChats = await eventChatService.getUserEventChats(userId);
    res.json({ success: true, data: eventChats });
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
// ROUTES TO REMOVE FROM THIS FILE (duplicates in events.js)
// =============================================================================

/**
 * The following routes should be REMOVED from chat.js because they conflict with events.js:
 * 
 * REMOVE THESE LINES FROM chat.js:
 * 
 * 1. Line 519: router.get('/events/:eventId/chat/room', auth, eventIdValidation, validateRequest, async (req, res) => {
 * 2. Line 590: router.get('/events/:eventId/chat/messages', auth, eventIdValidation, validateRequest, async (req, res) => {
 * 3. Line 667: router.post('/events/:eventId/chat/messages', auth, eventIdValidation, sendMessageValidation, validateRequest, async (req, res) => {
 * 4. Line 723: router.post('/events/:eventId/chat/join', auth, eventIdValidation, validateRequest, async (req, res) => {
 * 5. Line 764: router.post('/events/:eventId/chat/leave', auth, eventIdValidation, validateRequest, async (req, res) => {
 * 
 * KEEP ONLY IN events.js:
 * - GET /api/events/:id/chat
 * - GET /api/events/:id/chat/room 
 * - GET /api/events/:id/chat/messages
 * - POST /api/events/:id/chat/messages
 * - POST /api/events/:id/chat/join
 * - POST /api/events/:id/chat/leave
 */

module.exports = router;