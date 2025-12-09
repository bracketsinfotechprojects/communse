const Message = require('../models/Message');
const MessageBatch = require('../models/MessageBatch');
const Community = require('../models/Community');

/**
 * Chat Service - Handles complex business logic for chat operations
 */
class ChatService {
  /**
   * Validate message content and attachments
   */
  static validateMessageContent(text, attachments = []) {
    const errors = [];

    // Validate text length
    if (text && text.length > 5000) {
      errors.push('Message text cannot exceed 5000 characters');
    }

    // Validate attachments
    if (!Array.isArray(attachments)) {
      errors.push('Attachments must be an array');
    } else {
      attachments.forEach((attachment, index) => {
        if (typeof attachment !== 'string') {
          errors.push(`Attachment at index ${index} must be a string (URL)`);
        }
        
        // Basic URL validation
        if (attachment && !/^https?:\/\/.+/.test(attachment) && !/^data:.+/.test(attachment)) {
          errors.push(`Attachment at index ${index} must be a valid URL or data URI`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get message thread with replies (if implementing threaded conversations)
   */
  static async getMessageThread(messageId, userId) {
    try {
      // For individual message retrieval, we'll use the original Message model
      // since getMessageThread is for single message lookup
      const Message = require('../models/Message');
      const message = await Message.findById(messageId)
        .populate('senderId', 'username firstName lastName avatar');

      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user is member of the community
      const isMember = await this.isCommunityMember(message.communityId, userId);
      if (!isMember) {
        throw new Error('Not authorized to view this message');
      }

      // For now, return single message
      // In the future, this could be extended to handle threaded conversations
      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk mark messages as read
   */
  static async markMultipleMessagesAsRead(messageIds, userId) {
    try {
      const result = await Message.updateMany(
        {
          _id: { $in: messageIds },
          readBy: { $ne: userId }
        },
        {
          $addToSet: { readBy: userId }
        }
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  /**
   * Get message statistics for a community
   */
  static async getMessageStats(communityId, userId) {
    try {
      // Check if user is member of community
      const isMember = await this.isCommunityMember(communityId, userId);
      if (!isMember) {
        throw new Error('Not authorized to view community statistics');
      }

      const stats = await Message.aggregate([
        { $match: { communityId: communityId } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            messagesWithAttachments: {
              $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$attachments', []] } }, 0] }, 1, 0] }
            },
            editedMessages: {
              $sum: { $cond: ['$edited', 1, 0] }
            },
            averageMessageLength: { $avg: { $strLenCP: '$text' } }
          }
        }
      ]);

      return stats[0] || {
        totalMessages: 0,
        messagesWithAttachments: 0,
        editedMessages: 0,
        averageMessageLength: 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search messages in a community
   */
  static async searchMessages(communityId, searchTerm, userId, options = {}) {
    try {
      // Check if user is member of community
      const isMember = await this.isCommunityMember(communityId, userId);
      if (!isMember) {
        throw new Error('Not authorized to search messages in this community');
      }

      const {
        limit = 20,
        skip = 0,
        sortBy = 'createdAt',
        sortOrder = -1
      } = options;

      const query = {
        communityId,
        $text: { $search: searchTerm }
      };

      // For search functionality, we'll use the original Message model for now
      // since it has text indexing support
      const Message = require('../models/Message');
      const messages = await Message.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username firstName lastName avatar')
        .lean();

      return messages;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user is member of community (helper method)
   */
  static async isCommunityMember(communityId, userId) {
    try {
      console.log('🔍 Checking membership:', { communityId, userId });
      const community = await Community.findById(communityId).select('members ownerId');
      if (!community) {
        console.log('❌ Community not found:', communityId);
        return false;
      }
      
      console.log('🏘️ Community found:', {
        _id: community._id,
        members: community.members.length,
        ownerId: community.ownerId
      });
      
      const isMember = community.members.some(member => member.toString() === userId.toString()) ||
                      community.ownerId.toString() === userId.toString();
      
      console.log('👤 Membership result:', {
        userId,
        isMember,
        memberMatch: community.members.some(member => member.toString() === userId.toString()),
        ownerMatch: community.ownerId.toString() === userId.toString()
      });
      
      return isMember;
    } catch (error) {
      console.error('❌ Error checking community membership:', error);
      return false;
    }
  }

  /**
   * Send message using batching strategy
   */
  static async sendMessageBatched(communityId, userId, text, attachments = []) {
    try {
      console.log('📤 sendMessageBatched called:', { communityId, userId, text: text?.substring(0, 50) });

      // Validate message content
      const validation = this.validateMessageContent(text, attachments);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check membership
      const isMember = await this.isCommunityMember(communityId, userId);
      console.log('🔑 Membership check result:', isMember);
      
      if (!isMember) {
        throw new Error('Not authorized to send messages in this community');
      }

      // Add message to batch
      const messageData = {
        senderId: userId,
        text: text || '',
        attachments: attachments || [],
        readBy: [userId] // sender has 'read' by default
      };

      console.log('📦 Adding message to batch...');
      const batchResult = await MessageBatch.addMessageToBatch(communityId, messageData);
      console.log('✅ Message added to batch:', batchResult);

      // Return message object compatible with existing API
      const result = {
        _id: batchResult.messageId,
        communityId,
        senderId: userId,
        text: text || '',
        attachments: attachments || [],
        readBy: [userId],
        edited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        batchId: batchResult.batchId,
        batchNumber: batchResult.batchNumber,
        messageIndex: batchResult.messageIndex
      };

      console.log('📤 sendMessageBatched result:', result._id);
      return result;

    } catch (error) {
      console.error('❌ Error sending batched message:', error);
      throw error;
    }
  }

  /**
   * Get messages using batching (returns format compatible with existing API)
   */
  static async getMessagesBatched(communityId, userId, options = {}) {
    try {
      console.log('📥 getMessagesBatched called:', { communityId, userId, options });

      const {
        limit = 50,
        before
      } = options;

      // Check membership
      const isMember = await this.isCommunityMember(communityId, userId);
      console.log('🔑 Membership check for getMessages:', isMember);
      
      if (!isMember) {
        throw new Error('Not authorized to view messages in this community');
      }

      // Get messages from batches
      console.log('📦 Getting messages from batches...');
      const messages = await MessageBatch.getMessages(communityId, {
        limit,
        before,
        includeDeleted: false
      });
      console.log('📦 Messages from batch query:', messages.length);

      // Manually populate sender information for each message
      const User = require('../models/User');
      for (let message of messages) {
        const populatedSender = await User.findById(message.senderId, 'username firstName lastName avatar');
        message.senderId = populatedSender;
      }

      const result = {
        success: true,
        data: messages,
        pagination: {
          limit,
          hasMore: messages.length === limit
        }
      };

      console.log('📥 getMessagesBatched result:', result.data.length, 'messages');
      return result;

    } catch (error) {
      console.error('❌ Error getting batched messages:', error);
      throw error;
    }
  }

  /**
   * Mark message as read using batching system
   */
  static async markMessageAsReadBatched(messageId, userId) {
    try {
      // Find the batch containing this message
      const batch = await MessageBatch.findOne({
        'messages.messageId': messageId
      });

      if (!batch) {
        throw new Error('Message not found');
      }

      // Mark message as read in the batch
      await batch.markMessageAsRead(messageId, userId);

      return { success: true, messageId, userId };

    } catch (error) {
      console.error('Error marking message as read (batched):', error);
      throw error;
    }
  }

  /**
   * Edit message using batching system
   */
  static async editMessageBatched(messageId, userId, newText) {
    try {
      // Find the batch containing this message
      const batch = await MessageBatch.findOne({
        'messages.messageId': messageId
      });

      if (!batch) {
        throw new Error('Message not found');
      }

      // Find the specific message
      const message = batch.messages.find(msg => msg.messageId.equals(messageId));
      if (!message) {
        throw new Error('Message not found in batch');
      }

      // Check if user is the sender
      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('You can edit only your messages');
      }

      // Edit the message in the batch
      await batch.editMessage(messageId, newText);

      // Return updated message - manually populate sender info
      const User = require('../models/User');
      // Manually populate sender for the updated message
      const sender = await User.findById(message.senderId, 'username firstName lastName avatar');
      message.senderId = sender;

      return {
        success: true,
        data: {
          _id: message.messageId,
          communityId: batch.communityId,
          senderId: message.senderId,
          text: message.text,
          attachments: message.attachments,
          readBy: message.readBy,
          edited: message.edited,
          editedAt: message.editedAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        }
      };

    } catch (error) {
      console.error('Error editing message (batched):', error);
      throw error;
    }
  }

  /**
   * Delete message using batching system (soft delete)
   */
  static async deleteMessageBatched(messageId, userId) {
    try {
      // Find the batch containing this message
      const batch = await MessageBatch.findOne({
        'messages.messageId': messageId
      });

      if (!batch) {
        throw new Error('Message not found');
      }

      // Find the specific message
      const message = batch.messages.find(msg => msg.messageId.equals(messageId));
      if (!message) {
        throw new Error('Message not found in batch');
      }

      // Check if user is the sender
      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('You can delete only your messages');
      }

      // Soft delete the message in the batch
      await batch.deleteMessage(messageId);

      return {
        success: true,
        message: 'Message deleted successfully',
        data: { id: messageId }
      };

    } catch (error) {
      console.error('Error deleting message (batched):', error);
      throw error;
    }
  }

  /**
   * Get unread count using batching system
   */
  static async getUnreadCountBatched(communityId, userId) {
    try {
      // Check membership
      const isMember = await this.isCommunityMember(communityId, userId);
      if (!isMember) {
        throw new Error('Not authorized to view this community');
      }

      // Aggregate unread messages from all batches
      const result = await MessageBatch.aggregate([
        { $match: { communityId: communityId } },
        { $unwind: '$messages' },
        { $match: { 'messages.deleted': { $ne: true } } },
        { $match: { 'messages.readBy': { $ne: userId } } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);

      const count = result.length > 0 ? result[0].count : 0;

      return {
        success: true,
        data: {
          communityId,
          unreadCount: count
        }
      };

    } catch (error) {
      console.error('Error getting unread count (batched):', error);
      throw error;
    }
  }

  /**
   * Get message statistics using batching system
   */
  static async getMessageStatsBatched(communityId, userId) {
    try {
      // Check membership
      const isMember = await this.isCommunityMember(communityId, userId);
      if (!isMember) {
        throw new Error('Not authorized to view community statistics');
      }

      const stats = await MessageBatch.aggregate([
        { $match: { communityId: communityId } },
        { $unwind: '$messages' },
        { $match: { 'messages.deleted': { $ne: true } } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            messagesWithAttachments: {
              $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$messages.attachments', []] } }, 0] }, 1, 0] }
            },
            editedMessages: {
              $sum: { $cond: ['$messages.edited', 1, 0] }
            },
            averageMessageLength: { $avg: { $strLenCP: '$messages.text' } }
          }
        }
      ]);

      return stats[0] || {
        totalMessages: 0,
        messagesWithAttachments: 0,
        editedMessages: 0,
        averageMessageLength: 0
      };

    } catch (error) {
      console.error('Error getting message stats (batched):', error);
      throw error;
    }
  }

  /**
   * Search messages using batching system
   */
  static async searchMessagesBatched(communityId, searchTerm, userId, options = {}) {
    try {
      // Check membership
      const isMember = await this.isCommunityMember(communityId, userId);
      if (!isMember) {
        throw new Error('Not authorized to search messages in this community');
      }

      const {
        limit = 20,
        skip = 0
      } = options;

      // Search in message text using text index (if available)
      // Note: For now, using regex search as MongoDB text search requires additional setup
      const messages = await MessageBatch.aggregate([
        { $match: { communityId: communityId } },
        { $unwind: '$messages' },
        { $match: { 'messages.deleted': { $ne: true } } },
        { $match: { 'messages.text': { $regex: searchTerm, $options: 'i' } } },
        { $sort: { 'messages.createdAt': -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: '$messages.messageId',
            communityId: 1,
            senderId: '$messages.senderId',
            text: '$messages.text',
            attachments: '$messages.attachments',
            readBy: '$messages.readBy',
            edited: '$messages.edited',
            editedAt: '$messages.editedAt',
            createdAt: '$messages.createdAt',
            updatedAt: '$messages.updatedAt'
          }
        }
      ]);

      // Populate sender information manually
      const User = require('../models/User');
      for (let message of messages) {
        const populatedSender = await User.findById(message.senderId, 'username firstName lastName avatar');
        message.senderId = populatedSender;
      }

      return messages;

    } catch (error) {
      console.error('Error searching messages (batched):', error);
      throw error;
    }
  }

  /**
   * Clean up old messages (admin function)
   */
  static async cleanupOldMessages(communityId, daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Message.deleteMany({
        communityId,
        createdAt: { $lt: cutoffDate },
        deleted: true // Only clean up soft-deleted messages
      });

      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      throw new Error(`Failed to cleanup old messages: ${error.message}`);
    }
  }
}

module.exports = ChatService;