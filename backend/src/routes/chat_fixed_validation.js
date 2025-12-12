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
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid room ID is required')
    .matches(/^room_\d+_[a-zA-Z0-9]+$/)
    .withMessage('Invalid room ID format')
];

const markAsReadValidation = [
  body('roomId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid room ID is required')
    .matches(/^room_\d+_[a-zA-Z0-9]+$/)
    .withMessage('Invalid room ID format')
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
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid room ID is required')
    .matches(/^room_\d+_[a-zA-Z0-9]+$/)
    .withMessage('Invalid room ID format')
];

const deleteMessageValidation = [
  body('roomId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid room ID is required')
    .matches(/^room_\d+_[a-zA-Z0-9]+$/)
    .withMessage('Invalid room ID format')
];

const roomIdValidation = [
  param('roomId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid room ID is required')
    .matches(/^room_\d+_[a-zA-Z0-9]+$/)
    .withMessage('Invalid room ID format')
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

module.exports = router;