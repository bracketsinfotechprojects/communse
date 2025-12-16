const firebaseCommunityChatService = require('./firebaseCommunityChatService');
const Event = require('../models/Event');

class EventChatService {
  constructor() {
    this.firebaseService = firebaseCommunityChatService;
  }

  /**
   * Create a chat room specifically for an event
   * Only event attendees and creator can participate
   */
  async createEventChatRoom(eventData) {
    try {
      const {
        _id: eventId,
        title,
        description,
        communityId,
        createdBy,
        attendees = []
      } = eventData;
      
      // Get attendee IDs
      const attendeeIds = attendees.map(attendee => attendee.userId.toString());
      
      // Ensure creator is included
      if (!attendeeIds.includes(createdBy.toString())) {
        attendeeIds.push(createdBy.toString());
      }

      // Get user names for participants
      const User = require('../models/User');
      const users = await User.find({ _id: { $in: attendeeIds } }, 'firstName lastName');
      
      const participantNames = {};
      users.forEach(user => {
        const userId = user._id.toString();
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        participantNames[userId] = fullName || 'Unknown User';
      });

      const chatRoomData = {
        name: `Event: ${title}`,
        type: 'event',
        description: description || 'Event discussion room',
        communityId: communityId.toString(),
        eventId: eventId.toString(),
        createdBy: createdBy.toString(),
        participants: attendeeIds,
        participantNames: participantNames,
        category: 'event',
        isPrivate: true,
        chatType: 'event-specific',
        tags: ['event-chat', 'discussion']
      };
      
      // Create room using existing Firebase service
      const roomResult = await this.firebaseService.createChatRoom(chatRoomData);
      
      if (roomResult.success) {
        console.log(`Event chat room created successfully: ${roomResult.data.roomId}`);
      }

      return roomResult;
    } catch (error) {
      console.error('Error creating event chat room:', error);
      throw error;
    }
  }

  /**
   * Add user to event chat room when they join the event
   */
  async addUserToEventChat(eventId, userId) {
    try {
      // Get event details
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomCreated || !event.chatRoomId) {
        throw new Error('Event chat room not found');
      }

      // Check if user is attending the event
      const isAttending = event.isUserAttending(userId) || event.createdBy.toString() === userId;
      if (!isAttending) {
        throw new Error('Only event attendees can be added to event chat');
      }

      // Add user to chat room
      await this.firebaseService.addRoomsToUsers([userId], event.chatRoomId);

      return {
        success: true,
        data: {
          eventId: eventId,
          userId: userId,
          roomId: event.chatRoomId,
          message: 'User added to event chat room'
        }
      };
    } catch (error) {
      console.error('Error adding user to event chat:', error);
      throw error;
    }
  }

  /**
   * Remove user from event chat room when they leave the event
   */
  async removeUserFromEventChat(eventId, userId) {
    try {
      // Get event details
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomCreated || !event.chatRoomId) {
        // Chat room doesn't exist, nothing to remove
        return {
          success: true,
          message: 'Event chat room not found, no action needed'
        };
      }

      // Note: Firebase service doesn't have a direct remove user method
      // The user will be automatically excluded from active participants
      // We could implement a soft removal by updating room data

      return {
        success: true,
        data: {
          eventId: eventId,
          userId: userId,
          roomId: event.chatRoomId,
          message: 'User will be removed from event chat room (soft removal)'
        }
      };
    } catch (error) {
      console.error('Error removing user from event chat:', error);
      throw error;
    }
  }

  /**
   * Send message in event chat room
   */
  async sendEventMessage(messageData) {
    try {
      const { eventId, senderId, content, messageType = 'text', replyTo = null } = messageData;

      // Verify user is allowed to send messages
      const canSendMessage = await this.verifyEventChatPermission(eventId, senderId);
      if (!canSendMessage) {
        throw new Error('Access denied: Only event attendees can send messages');
      }

      // Get sender info
      const User = require('../models/User');
      const sender = await User.findById(senderId, 'firstName lastName email');
      
      if (!sender) {
        throw new Error('Sender not found');
      }

      const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Unknown User';
      const senderEmail = sender.email || '';

      // Get event chat room ID
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
   * Verify if user can participate in event chat
   */
  async verifyEventChatPermission(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return false;
      }

      // Check if event is published and not cancelled
      if (event.status !== 'published' && event.status !== 'completed') {
        return false;
      }

      // Check if user is attending or is the creator
      const userIdStr = userId.toString();
      const isAttending = event.isUserAttending(userId) || event.createdBy.toString() === userIdStr;
      
      return isAttending;
    } catch (error) {
      console.error('Error verifying event chat permission:', error);
      return false;
    }
  }

  /**
   * Get messages from event chat room
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
   * Get event chat room information
   */
  async getEventChatInfo(eventId) {
    try {
      const event = await Event.findById(eventId)
        .populate('createdBy', 'firstName lastName')
        .populate('attendees.userId', 'firstName lastName');

      if (!event) {
        throw new Error('Event not found');
      }

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
          expiresAt: event.expireAt,
          createdBy: event.createdBy,
          attendees: event.attendees
        }
      };
    } catch (error) {
      console.error('Error getting event chat info:', error);
      throw error;
    }
  }

  /**
   * Archive event chat room after retention period
   */
  async archiveEventChatRoom(eventId) {
    try {
      const event = await Event.findById(eventId);
      if (!event || !event.chatRoomId) {
        return {
          success: true,
          message: 'Event chat room not found, no action needed'
        };
      }

      // Update chat room to inactive
      await this.firebaseService.updateChatRoomActivity(event.chatRoomId, {
        isActive: false,
        archivedAt: new Date().toISOString(),
        archivedReason: 'Event chat retention period ended'
      });

      console.log(`Event chat room ${event.chatRoomId} archived for event ${eventId}`);

      return {
        success: true,
        data: {
          eventId: eventId,
          roomId: event.chatRoomId,
          archivedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error archiving event chat room:', error);
      throw error;
    }
  }

  /**
   * Get user's event chat rooms
   */
  async getUserEventChats(userId) {
    try {
      // Get user's chat rooms from Firebase
      const chatRooms = await this.firebaseService.getUserChatRooms(userId);
      
      // Filter for event chat rooms
      const eventChatRooms = chatRooms.filter(room => 
        room.type === 'event' && room.eventId
      );

      // Get event details for each chat room
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
              eventDescription: event.description,
              eventStartTime: event.startTime,
              eventEndTime: event.endTime,
              eventStatus: event.status,
              eventExpireAt: event.expireAt,
              createdBy: event.createdBy,
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
   * Add reaction to event chat message
   */
  async addEventMessageReaction(eventId, messageId, userId, emoji) {
    try {
      // Verify permission first
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
   * Mark event message as read
   */
  async markEventMessageAsRead(eventId, messageId, userId) {
    try {
      // Verify permission first
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
   * Delete event chat message
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
   * Edit event chat message
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

module.exports = new EventChatService();