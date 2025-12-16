const express = require('express');
const chatTokenService = require('../services/chatTokenService');
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const router = express.Router();

/**
 * @swagger
 * /chat/token:
 *   get:
 *     summary: Generate Firebase Custom Token for chat access
 *     description: Returns a Firebase custom token for authenticated users who are members of the specified event
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID requesting chat access
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID for which chat access is requested
 *     responses:
 *       200:
 *         description: Successfully generated chat token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: Firebase custom token
 *                 claims:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [member, admin]
 *                     userId:
 *                       type: string
 *                     communityId:
 *                       type: string
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Error message
 *       401:
 *         description: Unauthorized - user not authenticated
 *       403:
 *         description: Forbidden - user not authorized for this event
 *       404:
 *         description: Event or user not found
 *       500:
 *         description: Internal server error
 */

/**
 * Generate Firebase Custom Token for chat access
 * GET /chat/token?userId=<userId>&eventId=<eventId>
 */
router.get('/token', [
  // Validation middleware
  body('userId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('userId must be a valid string'),
  body('eventId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('eventId must be a valid string'),
  param('userId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('userId must be a valid string'),
  param('eventId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('eventId must be a valid string'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT token verified for user:', decoded.userId);
      
      // Store user info in request for potential future use
      req.authUser = {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email
      };
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Extract parameters from query string or body
    const { userId, eventId } = req.query.userId ? req.query : req.body;

    // Validate required parameters
    if (!userId || !eventId) {
      return res.status(400).json({
        success: false,
        error: 'userId and eventId are required parameters'
      });
    }

    // Validate parameter format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid userId format'
      });
    }

    if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid eventId format'
      });
    }

    // Generate chat token
    const customToken = await chatTokenService.generateChatToken(userId, eventId);

    // Decode the JWT manually to get claims (since we can't verify custom tokens server-side)
    const base64Payload = customToken.split('.')[1];
    const claims = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

    // Return success response
    res.status(200).json({
      success: true,
      token: customToken,
      claims: {
        eventId: claims.eventId,
        role: claims.role,
        userId: claims.userId,
        communityId: claims.communityId
      }
    });

  } catch (error) {
    console.error('Chat token generation error:', error);

    // Handle specific error types
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (error.message === 'User is not a member of this event') {
      return res.status(403).json({
        success: false,
        error: 'User is not authorized to access chat for this event'
      });
    }

    if (error.message === 'User account is inactive or banned') {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive or banned'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error occurred while generating chat token'
    });
  }
});

/**
 * Verify chat token and get user permissions
 * GET /chat/verify?token=<customToken>
 */
router.get('/verify', [
  param('token').isString().notEmpty().withMessage('token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token } = req.query;

    // Decode JWT manually for custom tokens
    const base64Payload = token.split('.')[1];
    const claims = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

    res.status(200).json({
      success: true,
      claims: claims
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

/**
 * Check chat permission without generating token
 * POST /chat/permission
 */
router.post('/permission', [
  body('userId').isString().notEmpty().withMessage('userId is required'),
  body('eventId').isString().notEmpty().withMessage('eventId is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, eventId } = req.body;

    const permission = await chatTokenService.checkChatPermission(userId, eventId);

    res.status(200).json({
      success: true,
      ...permission
    });

  } catch (error) {
    console.error('Permission check error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;