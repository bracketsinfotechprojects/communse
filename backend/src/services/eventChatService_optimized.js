/**
 * OPTIMIZED Event Chat Service
 * Returns concise, essential data only
 */

const firebaseCommunityChatService = require('./firebaseCommunityChatService');
const Event = require('../models/Event');

class OptimizedEventChatService {
  constructor() {
    this.firebaseService = firebaseCommunityChatService;
  }

  /**
   * Send message in event chat with OPTIMIZED response
   */
  async sendEventMessage(messageData) {
    try {
      const { eventId, senderId, content, messageType = 'text', replyTo = null } = messageData;

      const canSendMessage = await this.verifyEventChatPermission(eventId, senderId);
      if (!canSendMessage) {
        throw new Error('Access denied: Only event attendees can send messages');
      }

      const User = require('../models/User');
      const sender = await User.findById(senderId, 'firstName lastName email');
      
      if (!sender) {
        throw new Error('Sender not found');
      }

      const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Unknown User';
      const senderEmail = sender.email || '';

      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      const finalMessageData = {
        chatRoomId: event.chatRoomId,
        senderId: senderId,
        content: content,
        messageType: messageType,
        replyTo: replyTo,
        senderName: senderName,
        senderEmail: senderEmail
      };

      return await this.firebaseService.sendMessage(finalMessageData);
    } catch (error) {
      console.error('Error sending event message:', error);
      throw error;
    }
  }

  /**
   * Get messages from event chat with OPTIMIZED response
   */
  async getEventMessages(eventId, limit = 50, offset = 0) {
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      return await this.firebaseService.getMessages(event.chatRoomId, limit, offset);
    } catch (error) {
      console.error('Error getting event messages:', error);
      throw error;
    }
  }

  /**
   * Get event chat info with OPTIMIZED response
   */
  async getEventChatInfo(eventId) {
    try {
      const event = await Event.findById(eventId)
        .populate('createdBy', 'firstName lastName')
        .populate('attendees.userId', 'firstName lastName');

      if (!event) {
        throw new Error('Event not found');
      }

      // OPTIMIZED RESPONSE - Only essential info
      return {
        success: true,
        data: {
          eventId: eventId,
          eventTitle: event.title,
          chatRoomId: event.chatRoomId,
          chatRoomCreated: event.chatRoomCreated,
          participantCount: event.attendees.length + 1, // +1 for creator
          isEventActive: event.status === 'published' || event.status === 'completed',
          eventStatus: event.status,
          createdBy: {
            id: event.createdBy._id,
            name: `${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''}`.trim()
          }
        }
      };
    } catch (error) {
      console.error('Error getting event chat info:', error);
      throw error;
    }
  }

  /**
   * Get user's event chat rooms with OPTIMIZED response
   */
  async getUserEventChats(userId) {
    try {
      const chatRooms = await this.firebaseService.getUserChatRooms(userId);
      
      const eventChatRooms = chatRooms.filter(room => 
        room.type === 'event' && room.eventId
      );

      const eventChatInfo = [];
      for (const room of eventChatRooms) {
        try {
          const event = await Event.findById(room.eventId)
            .populate('createdBy', 'firstName lastName')
            .select('title description startTime endTime status expireAt communityId');
          
          if (event) {
            eventChatInfo.push({
              roomId: room.id,
              eventId: room.eventId,
              eventTitle: event.title,
              eventStatus: event.status,
              eventStartTime: event.startTime,
              eventEndTime: event.endTime,
              createdBy: {
                id: event.createdBy._id,
                name: `${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''}`.trim()
              },
              lastActivity: room.lastActivity,
              isActive: room.isActive
            });
          }
        } catch (error) {
          console.warn(`Failed to get event details for room ${room.id}:`, error.message);
        }
      }

      return eventChatInfo;
    } catch (error) {
      console.error('Error getting user event chats:', error);
      throw error;
    }
  }

  /**
   * Add user to event chat room with OPTIMIZED response
   */
  async addUserToEventChat(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomCreated || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      const isAttending = event.isUserAttending(userId) || event.createdBy.toString() === userId;
      if (!isAttending) {
        throw new Error('Only event attendees can be added to event chat');
      }

      await this.firebaseService.addRoomsToUsers([userId], event.chatRoomId);

      // OPTIMIZED RESPONSE - Minimal data
      return {
        success: true,
        data: {
          eventId: eventId,
          userId: userId,
          roomId: event.chatRoomId
        }
      };
    } catch (error) {
      console.error('Error adding user to event chat:', error);
      throw error;
    }
  }

  /**
   * Remove user from event chat room with OPTIMIZED response
   */
  async removeUserFromEventChat(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomCreated || !event.chatRoomId) {
        return {
          success: true,
          message: 'Event chat room not found, no action needed'
        };
      }

      // OPTIMIZED RESPONSE - Minimal data
      return {
        success: true,
        data: {
          eventId: eventId,
          userId: userId,
          roomId: event.chatRoomId
        }
      };
    } catch (error) {
      console.error('Error removing user from event chat:', error);
      throw error;
    }
  }

  /**
   * Verify if user can participate in event chat
   */
  async verifyEventChatPermission(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return false;
      }

      if (event.status !== 'published' && event.status !== 'completed') {
        return false;
      }

      const userIdStr = userId.toString();
      const isAttending = event.isUserAttending(userId) || event.createdBy.toString() === userIdStr;
      
      return isAttending;
    } catch (error) {
      console.error('Error verifying event chat permission:', error);
      return false;
    }
  }

  /**
   * Add reaction to event message with OPTIMIZED response
   */
  async addEventMessageReaction(eventId, messageId, userId, emoji) {
    try {
      const canReact = await this.verifyEventChatPermission(eventId, userId);
      if (!canReact) {
        throw new Error('Access denied: Only event attendees can react to messages');
      }

      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      return await this.firebaseService.addReaction(event.chatRoomId, messageId, userId, emoji);
    } catch (error) {
      console.error('Error adding event message reaction:', error);
      throw error;
    }
  }

  /**
   * Mark event message as read with OPTIMIZED response
   */
  async markEventMessageAsRead(eventId, messageId, userId) {
    try {
      const canRead = await this.verifyEventChatPermission(eventId, userId);
      if (!canRead) {
        throw new Error('Access denied: Only event attendees can read messages');
      }

      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      return await this.firebaseService.markMessageAsRead(event.chatRoomId, messageId, userId);
    } catch (error) {
      console.error('Error marking event message as read:', error);
      throw error;
    }
  }

  /**
   * Delete event message with OPTIMIZED response
   */
  async deleteEventMessage(eventId, messageId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      return await this.firebaseService.deleteMessage(event.chatRoomId, messageId, userId);
    } catch (error) {
      console.error('Error deleting event message:', error);
      throw error;
    }
  }

  /**
   * Edit event message with OPTIMIZED response
   */
  async editEventMessage(eventId, messageId, userId, newContent) {
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      return await this.firebaseService.editMessage(event.chatRoomId, messageId, userId, newContent);
    } catch (error) {
      console.error('Error editing event message:', error);
      throw error;
    }
  }
}

module.exports = new OptimizedEventChatService();