const Message = require('../models/Message');
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
        { $match: { communityId: require('mongoose').Types.ObjectId(communityId) } },
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
      const community = await Community.findById(communityId).select('members ownerId');
      if (!community) return false;
      
      return community.members.some(member => member.toString() === userId.toString()) ||
             community.ownerId.toString() === userId.toString();
    } catch (error) {
      console.error('Error checking community membership:', error);
      return false;
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