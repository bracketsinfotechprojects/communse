const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const eventController = require('../controllers/eventController');

// Validation rules
const createEventValidation = [
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .trim(),
  body('description')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters')
    .trim(),
  body('communityId')
    .isMongoId()
    .withMessage('Valid community ID is required'),
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('location.city')
    .isLength({ min: 1, max: 50 })
    .withMessage('City is required and must be less than 50 characters')
    .trim(),
  body('location.landmark')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Landmark must be less than 100 characters')
    .trim(),
  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('category')
    .isIn([
      'interest-based-meetup',
      'skill-learning-session',
      'sports',
      'networking',
      'workshop',
      'discussion',
      'social',
      'other'
    ])
    .withMessage('Invalid event category'),
  body('maxAttendees')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max attendees must be between 1 and 1000'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Each tag must be between 1 and 20 characters')
    .trim()
    .toLowerCase(),
  body('coverImage')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),
  body('requirements')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Requirements must be less than 500 characters')
    .trim(),
  body('contactInfo')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Contact info must be less than 200 characters')
    .trim()
];

const updateEventValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('title')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters')
    .trim(),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Valid start time is required')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('location.city')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('City must be less than 50 characters')
    .trim(),
  body('location.landmark')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Landmark must be less than 100 characters')
    .trim(),
  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('category')
    .optional()
    .isIn([
      'interest-based-meetup',
      'skill-learning-session',
      'sports',
      'networking',
      'workshop',
      'discussion',
      'social',
      'other'
    ])
    .withMessage('Invalid event category'),
  body('maxAttendees')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max attendees must be between 1 and 1000'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Each tag must be between 1 and 20 characters')
    .trim()
    .toLowerCase(),
  body('coverImage')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),
  body('requirements')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Requirements must be less than 500 characters')
    .trim(),
  body('contactInfo')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Contact info must be less than 200 characters')
    .trim()
];

const communityEventsValidation = [
  param('communityId')
    .isMongoId()
    .withMessage('Valid community ID is required'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed', 'archived'])
    .withMessage('Invalid status'),
  query('category')
    .optional()
    .isIn([
      'interest-based-meetup',
      'skill-learning-session',
      'sports',
      'networking',
      'workshop',
      'discussion',
      'social',
      'other'
    ])
    .withMessage('Invalid category'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer')
];

const interestSearchValidation = [
  query('interest')
    .notEmpty()
    .withMessage('Interest parameter is required')
    .trim(),
  query('city')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('City must be less than 50 characters')
    .trim(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const userEventsValidation = [
  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed', 'archived'])
    .withMessage('Invalid status'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer')
];

const eventIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid event ID is required')
];

const cancelEventValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must be less than 500 characters')
    .trim()
];

const completeEventValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Completion notes must be less than 1000 characters')
    .trim()
];

// =============================================================================
// EVENT ROUTES
// =============================================================================

/**
 * @swagger
 * /api/events/categories:
 *   get:
 *     summary: Get available event categories
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @route   GET /api/events/categories
// @desc    Get available event categories
// @access  Private
router.get('/categories', auth, eventController.getEventCategories);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - communityId
 *               - startTime
 *               - endTime
 *               - location
 *               - category
 *               - maxAttendees
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               communityId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   landmark:
 *                     type: string
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *               category:
 *                 type: string
 *                 enum: [interest-based-meetup, skill-learning-session, sports, networking, workshop, discussion, social, other]
 *               maxAttendees:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @route   POST /api/events
// @desc    Create a new event
// @access  Private
router.post('/', auth, createEventValidation, validateRequest, eventController.createEvent);

/**
 * @swagger
 * /api/events/search/interest:
 *   get:
 *     summary: Search events by interest
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: interest
 *         required: true
 *         schema:
 *           type: string
 *         description: Interest to search for
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Events found successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
// @route   GET /api/events/search/interest
// @desc    Search events by interest
// @access  Private
router.get('/search/interest', auth, interestSearchValidation, validateRequest, eventController.findEventsByInterest);

// @route   GET /api/users/events
// @desc    Get user's events (created or attending)
// @access  Private
router.get('/users/events', auth, userEventsValidation, validateRequest, eventController.getUserEvents);

/**
 * @swagger
 * /api/events/users/events:
 *   get:
 *     summary: Get user's events (created or attending)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, cancelled, completed, archived]
 *         description: Filter events by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of events to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip
 *     responses:
 *       200:
 *         description: User events retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */

// @route   GET /api/users/events/stats
// @desc    Get user's event statistics
// @access  Private
router.get('/users/events/stats', auth, eventController.getUserEventStats);

/**
 * @swagger
 * /api/events/users/events/stats:
 *   get:
 *     summary: Get user's event statistics
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User event statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// @route   POST /api/events/archive-expired
// @desc    Archive expired events (admin/cron function)
// @access  Private (admin only - add admin check if needed)
router.post('/archive-expired', auth, eventController.archiveExpiredEvents);

/**
 * @swagger
 * /api/events/archive-expired:
 *   post:
 *     summary: Archive expired events (admin/cron function)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired events archived successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// =============================================================================
// COMMUNITY EVENT ROUTES
// =============================================================================

// @route   GET /api/communities/:communityId/events
// @desc    Get events for a community
// @access  Private
router.get('/communities/:communityId/events', auth, communityEventsValidation, validateRequest, eventController.getCommunityEvents);

/**
 * @swagger
 * /api/events/communities/{communityId}/events:
 *   get:
 *     summary: Get events for a community
 *     tags: [Events]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, cancelled, completed, archived]
 *         description: Filter events by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [interest-based-meetup, skill-learning-session, sports, networking, workshop, discussion, social, other]
 *         description: Filter events by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of events to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip
 *     responses:
 *       200:
 *         description: Community events retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 */

// =============================================================================
// INDIVIDUAL EVENT ROUTES
// =============================================================================

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
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
 *         description: Event retrieved successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Private
router.get('/:id', auth, eventIdValidation, validateRequest, eventController.getEventById);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
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
 *             $ref: '#/components/schemas/EventUpdateRequest'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found
 */
// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private
router.put('/:id', auth, updateEventValidation, validateRequest, eventController.updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
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
 *         description: Event deleted successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found
 */
// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private
router.delete('/:id', auth, eventIdValidation, validateRequest, eventController.deleteEvent);

/**
 * @swagger
 * /api/events/{id}/publish:
 *   post:
 *     summary: Publish an event
 *     tags: [Events]
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
 *         description: Event published successfully
 *       400:
 *         description: Invalid event ID or event already published
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found
 */
// @route   POST /api/events/:id/publish
// @desc    Publish an event
// @access  Private
router.post('/:id/publish', auth, eventIdValidation, validateRequest, eventController.publishEvent);

/**
 * @swagger
 * /api/events/{id}/join:
 *   post:
 *     summary: Join an event
 *     tags: [Events]
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
 *         description: Successfully joined the event
 *       400:
 *         description: Invalid event ID, event full, or already joined
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
// @route   POST /api/events/:id/join
// @desc    Join an event
// @access  Private
router.post('/:id/join', auth, eventIdValidation, validateRequest, eventController.joinEvent);

/**
 * @swagger
 * /api/events/{id}/leave:
 *   post:
 *     summary: Leave an event
 *     tags: [Events]
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
 *         description: Successfully left the event
 *       400:
 *         description: Invalid event ID or not registered for event
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
// @route   POST /api/events/:id/leave
// @desc    Leave an event
// @access  Private
router.post('/:id/leave', auth, eventIdValidation, validateRequest, eventController.leaveEvent);

/**
 * @swagger
 * /api/events/{id}/cancel:
 *   post:
 *     summary: Cancel an event
 *     tags: [Events]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Event cancelled successfully
 *       400:
 *         description: Invalid event ID or cannot cancel event
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found
 */
// @route   POST /api/events/:id/cancel
// @desc    Cancel an event
// @access  Private
router.post('/:id/cancel', auth, cancelEventValidation, validateRequest, eventController.cancelEvent);

/**
 * @swagger
 * /api/events/{id}/complete:
 *   post:
 *     summary: Complete an event
 *     tags: [Events]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Completion notes
 *     responses:
 *       200:
 *         description: Event completed successfully
 *       400:
 *         description: Invalid event ID or cannot complete event
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found
 */
// @route   POST /api/events/:id/complete
// @desc    Complete an event
// @access  Private
router.post('/:id/complete', auth, completeEventValidation, validateRequest, eventController.completeEvent);

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
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only event attendees can access chat
 *       404:
 *         description: Event not found
 */
// @route   GET /api/events/:id/chat
// @desc    Get event chat room information
// @access  Private
router.get('/:id/chat', auth, eventIdValidation, validateRequest, eventController.getEventChatInfo);

// Alternative route for getting event chat room information
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

    // Import the service here to avoid circular dependency
    const eventChatService = require('../services/eventChatService');

    // Check if user can access event chat
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
router.post('/:id/chat/messages', auth, eventIdValidation, [
  body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters').trim(),
  body('messageType').optional().isIn(['text', 'image', 'file', 'audio', 'video']).withMessage('Invalid message type')
], validateRequest, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { content, messageType = 'text', replyTo = null } = req.body;
    const senderId = req.user.userId;

    // Import the service here to avoid circular dependency
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

    // Import the service here to avoid circular dependency
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
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/chat/leave', auth, eventIdValidation, validateRequest, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.userId;

    // Import the service here to avoid circular dependency
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

// @route   POST /api/events/:id/attendance/update
// @desc    Update event attendance count
// @access  Private

/**
 * @swagger
 * /api/events/{id}/attendance/update:
 *   post:
 *     summary: Update event attendance count
 *     tags: [Events]
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
 *         description: Attendance updated successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
// @route   POST /api/events/:id/attendance/update
// @desc    Update event attendance count
// @access  Private
router.post('/:id/attendance/update', auth, eventIdValidation, validateRequest, eventController.updateEventAttendance);

module.exports = router;