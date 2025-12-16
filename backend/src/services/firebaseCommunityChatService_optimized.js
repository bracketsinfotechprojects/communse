/**
 * OPTIMIZED Firebase Community Chat Service
 * Returns concise, essential data only
 */

const firebaseConfig = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class OptimizedFirebaseCommunityChatService {
  constructor() {
    this.db = firebaseConfig.getDatabase();
  }

  /**
   * Send a message with OPTIMIZED response
   */
  async sendMessage(messageData) {
    try {
      // Input validation
      if (!messageData || !messageData.chatRoomId || !messageData.senderId || !messageData.content) {
        throw new Error('chatRoomId, senderId, and content are required');
      }

      if (!messageData.content.trim()) {
        throw new Error('Message content cannot be empty');
      }

      // Check messaging permissions
      const chatRoom = await this.getChatRoom(messageData.chatRoomId);
      if (chatRoom.communityId && chatRoom.type === 'community') {
        const participant = chatRoom.participants.find(p => p.userId === messageData.senderId);
        if (participant && participant.role !== 'admin') {
          throw new Error('Access denied: Only community admins can send messages in community chat');
        }
      }

      const {
        chatRoomId,
        senderId,
        content,
        messageType = 'text',
        replyTo = null,
        senderName = 'Unknown User',
        senderEmail = '',
        senderAvatar = null
      } = messageData;

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const firebaseMessage = {
        id: messageId,
        chatRoomId: chatRoomId,
        content: content.trim(),
        messageType: messageType,
        replyTo: replyTo,
        sender: {
          id: senderId,
          name: senderName,
          email: senderEmail,
          avatar: senderAvatar
        },
        timestamp: new Date().toISOString(),
        reactions: [],
        readBy: [{
          userId: senderId,
          readAt: new Date().toISOString()
        }],
        isEdited: false,
        isDeleted: false
      };

      await this.db.ref(`messages/${chatRoomId}/${messageId}`).set(firebaseMessage);

      await this.updateChatRoomActivity(chatRoomId, {
        lastMessage: content.trim(),
        lastMessageBy: {
          id: senderId,
          name: senderName
        },
        lastActivity: new Date().toISOString()
      });

      await this.updateUserLastActivity(senderId);

      console.log(`Message sent: ${messageId} in room ${chatRoomId}`);
      
      // OPTIMIZED RESPONSE - Only essential data
      return {
        success: true,
        data: {
          messageId: messageId,
          content: content.trim(),
          messageType: messageType,
          sender: {
            id: senderId,
            name: senderName
          },
          timestamp: firebaseMessage.timestamp,
          chatRoomId: chatRoomId
        }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages with OPTIMIZED response
   */
  async getMessages(chatRoomId, limit = 50, offset = 0) {
    try {
      const messagesRef = this.db.ref(`messages/${chatRoomId}`);
      const snapshot = await messagesRef.orderByChild('timestamp').limitToLast(limit).once('value');
      
      if (!snapshot.exists()) {
        return [];
      }

      const messages = [];
      snapshot.forEach(childSnapshot => {
        const msg = childSnapshot.val();
        // Only include non-deleted messages
        if (!msg.isDeleted) {
          messages.push(msg);
        }
      });

      // Sort by timestamp (oldest first)
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Apply offset if needed
      let finalMessages = offset > 0 ? messages.slice(offset) : messages;

      // OPTIMIZED RESPONSE - Map to essential fields only
      return finalMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        messageType: msg.messageType,
        sender: {
          id: msg.sender.id,
          name: msg.sender.name,
          avatar: msg.sender.avatar
        },
        timestamp: msg.timestamp,
        replyTo: msg.replyTo,
        reactions: msg.reactions || [],
        isEdited: msg.isEdited,
        isDeleted: msg.isDeleted,
        readBy: (msg.readBy || []).map(r => r.userId) // Only user IDs for read status
      }));
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Get user's chat rooms with OPTIMIZED response
   */
  async getUserChatRooms(userId) {
    try {
      const snapshot = await this.db.ref(`userChatRooms/${userId}`).once('value');
      if (!snapshot.exists()) {
        return [];
      }

      const roomIds = Object.keys(snapshot.val());
      const chatRooms = [];

      for (const roomId of roomIds) {
        try {
          const room = await this.getChatRoom(roomId);
          if (room && room.isActive) {
            chatRooms.push(room);
          }
        } catch (error) {
          console.warn(`Failed to get room ${roomId}:`, error.message);
        }
      }

      // Sort by last activity
      chatRooms.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

      // OPTIMIZED RESPONSE - Only essential room info
      return chatRooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        category: room.category,
        description: room.description,
        communityId: room.communityId,
        participantCount: room.participants ? room.participants.length : 0,
        lastMessage: room.lastMessage,
        lastMessageBy: room.lastMessageBy,
        lastActivity: room.lastActivity,
        messageCount: room.messageCount || 0,
        isPrivate: room.isPrivate,
        createdAt: room.createdAt
      }));
    } catch (error) {
      console.error('Error getting user chat rooms:', error);
      throw error;
    }
  }

  /**
   * Get chat room data with OPTIMIZED response
   */
  async getChatRoom(roomId) {
    try {
      const snapshot = await this.db.ref(`chatRooms/${roomId}`).once('value');
      if (!snapshot.exists()) {
        throw new Error('Chat room not found');
      }
      return snapshot.val();
    } catch (error) {
      console.error('Error getting chat room:', error);
      throw error;
    }
  }

  /**
   * Get community rooms with OPTIMIZED response
   */
  async getCommunityRooms(communityId, category = null) {
    try {
      const communityRoomsRef = this.db.ref(`communities/${communityId}/chatRooms`);
      const snapshot = await communityRoomsRef.once('value');
      
      if (!snapshot.exists()) {
        return [];
      }

      const roomData = snapshot.val();
      const roomIds = Object.keys(roomData);
      const rooms = [];

      for (const roomId of roomIds) {
        try {
          const room = await this.getChatRoom(roomId);
          if (room && room.isActive) {
            if (category && room.category !== category) {
              continue;
            }
            rooms.push(room);
          }
        } catch (error) {
          console.warn(`Failed to get room ${roomId}:`, error.message);
        }
      }

      rooms.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // OPTIMIZED RESPONSE - Essential room info only
      return rooms.map(room => ({
        id: room.id,
        name: room.name,
        category: room.category,
        description: room.description,
        participantCount: room.participants ? room.participants.length : 0,
        lastActivity: room.lastActivity,
        createdAt: room.createdAt,
        isPrivate: room.isPrivate
      }));
    } catch (error) {
      console.error('Error getting community rooms:', error);
      throw error;
    }
  }

  // Keep existing helper methods unchanged
  async updateChatRoomActivity(roomId, activityData) {
    try {
      await this.db.ref(`chatRooms/${roomId}`).update({
        ...activityData,
        messageCount: activityData.messageCount || 0
      });
    } catch (error) {
      console.error('Error updating chat room activity:', error);
    }
  }

  async updateUserLastActivity(userId) {
    try {
      await this.db.ref(`userPresence/${userId}`).update({
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user last activity:', error);
    }
  }

  async addReaction(chatRoomId, messageId, userId, emoji) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();
      const updatedReactions = message.reactions.filter(r => r.userId !== userId);
      
      updatedReactions.push({
        userId,
        emoji,
        createdAt: new Date().toISOString()
      });

      await messageRef.update({
        reactions: updatedReactions
      });

      // OPTIMIZED RESPONSE - Just the reactions
      return updatedReactions.map(r => ({
        userId: r.userId,
        emoji: r.emoji
      }));
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async markMessageAsRead(chatRoomId, messageId, userId) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();
      const isAlreadyRead = message.readBy.some(r => r.userId === userId);
      
      if (!isAlreadyRead) {
        const updatedReadBy = message.readBy || [];
        updatedReadBy.push({
          userId,
          readAt: new Date().toISOString()
        });

        await messageRef.update({
          readBy: updatedReadBy
        });
      }

      console.log(`Message ${messageId} marked as read by user ${userId}`);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await this.db.ref(`userPresence/${userId}`).set({
        isOnline,
        lastSeen: new Date().toISOString()
      });

      console.log(`User ${userId} status updated to ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating user online status:', error);
      throw error;
    }
  }

  async deleteMessage(chatRoomId, messageId, userId) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();

      if (message.sender.id !== userId) {
        throw new Error('Access denied: Only sender can delete message');
      }

      await messageRef.update({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId
      });

      console.log(`Message ${messageId} deleted`);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async editMessage(chatRoomId, messageId, userId, newContent) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();

      if (message.sender.id !== userId) {
        throw new Error('Access denied: Only sender can edit message');
      }

      await messageRef.update({
        content: newContent,
        isEdited: true,
        editedAt: new Date().toISOString()
      });

      console.log(`Message ${messageId} edited`);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }
}

module.exports = new OptimizedFirebaseCommunityChatService();