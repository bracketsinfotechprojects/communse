const Message = require('../models/Message');
const Community = require('../models/Community');
const { validationResult } = require('express-validator');

/**
 * Check if user is a member of the community
 */
const isCommunityMember = async (communityId, userId) => {
  try {
    const community = await Community.findById(communityId).select('members ownerId');
    if (!community) return false;
    
    return community.members.some(member => member.toString() === userId.toString()) ||
           community.ownerId.toString() === userId.toString();
  } catch (error) {
    console.error('Error checking community membership:', error);
    return false;
  }
};

/**
 * @swagger
 * /api/communities/{communityId}/messages:
 *   post:
 *     summary: Send a new message to community
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Message text content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of attachment URLs
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized to send messages in this community
 *       500:
 *         description: Server error
 */
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { communityId } = req.params;
    const { text, attachments } = req.body;
    const userId = req.user.userId;

    // Check if user is member of community
    const isMember = await isCommunityMember(communityId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to send messages in this community' });
    }

    // Create message
    const message = await Message.create({
      communityId,
      senderId: userId,
      text: text || '',
      attachments: attachments || [],
      readBy: [userId] // sender has 'read' by default
    });

    // Populate sender information for response
    await message.populate('senderId', 'username firstName lastName avatar');

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error while sending message' });
  }
};

/**
 * @swagger
 * /api/communities/{communityId}/messages:
 *   get:
 *     summary: Get messages for a community
 *     tags: [Chat]
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages created before this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatListResponse'
 *       403:
 *         description: Not authorized to view messages in this community
 *       500:
 *         description: Server error
 */
const getMessages = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit, 10) || 50;
    const before = req.query.before;

    // Check if user is member of community
    const isMember = await isCommunityMember(communityId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view messages in this community' });
    }

    // Build query
    const query = { communityId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Get messages with pagination
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'username firstName lastName avatar')
      .lean();

    // Reverse to show oldest first (newest at bottom)
    const reversedMessages = messages.reverse();

    return res.json({
      success: true,
      data: reversedMessages,
      pagination: {
        limit,
        hasMore: messages.length === limit
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ message: 'Server error while fetching messages' });
  }
};

/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   post:
 *     summary: Mark message as read by current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: { readBy: userId }
      },
      { new: true }
    ).populate('senderId', 'username firstName lastName avatar');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    return res.json({
      success: true,
      message: 'Message marked as read',
      data: message
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    return res.status(500).json({ message: 'Server error while marking message as read' });
  }
};

/**
 * @swagger
 * /api/communities/{communityId}/unread:
 *   get:
 *     summary: Get unread message count for community
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community ID
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnreadCountResponse'
 *       403:
 *         description: Not authorized to view this community
 *       500:
 *         description: Server error
 */
const getUnreadCount = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;

    // Check if user is member of community
    const isMember = await isCommunityMember(communityId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this community' });
    }

    const count = await Message.countDocuments({
      communityId,
      readBy: { $ne: userId }
    });

    return res.json({
      success: true,
      data: {
        communityId,
        unreadCount: count
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ message: 'Server error while fetching unread count' });
  }
};

/**
 * @swagger
 * /api/messages/{messageId}:
 *   patch:
 *     summary: Edit own message
 *     tags: [Chat]
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
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Updated message text
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Validation error
 *       403:
 *         description: You can edit only your messages
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
const editMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can edit only your messages' });
    }

    // Update message
    message.text = text;
    message.edited = true;
    await message.save();

    await message.populate('senderId', 'username firstName lastName avatar');

    return res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });

  } catch (error) {
    console.error('Edit message error:', error);
    return res.status(500).json({ message: 'Server error while editing message' });
  }
};

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete own message (soft delete)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *       403:
 *         description: You can delete only your messages
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can delete only your messages' });
    }

    // Soft delete
    message.deleted = true;
    message.text = '';
    message.attachments = [];
    await message.save();

    return res.json({
      success: true,
      message: 'Message deleted successfully',
      data: { id: messageId }
    });

  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ message: 'Server error while deleting message' });
  }
};

/**
 * Get message by ID (with authorization check)
 */
const getMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId)
      .populate('senderId', 'username firstName lastName avatar');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is member of the community
    const isMember = await isCommunityMember(message.communityId, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this message' });
    }

    return res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Get message by ID error:', error);
    return res.status(500).json({ message: 'Server error while fetching message' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markMessageAsRead,
  getUnreadCount,
  editMessage,
  deleteMessage,
  getMessageById,
  isCommunityMember
};