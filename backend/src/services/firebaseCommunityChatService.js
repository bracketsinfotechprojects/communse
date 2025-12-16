/**
 * Firebase Community Chat Service - Enhanced for Multiple Rooms per Community
 * Pure Firebase implementation with flexible community-based room management
 */

const firebaseConfig = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class FirebaseCommunityChatService {
  constructor() {
    this.db = firebaseConfig.getDatabase();
  }

  /**
   * Create a new chat room in Firebase with community support
   */
  async createChatRoom(roomData) {
    try {
      const {
        name,
        type = 'community',
        description = '',
        communityId,
        createdBy,
        participants = [],
        participantNames = {},
        category = 'general',
        tags = [],
        isPrivate = false,
        chatType = 'community-wide' // 'community-wide' or 'private'
      } = roomData;

      // Generate unique Firebase room ID
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let finalParticipants = [...participants];

      // COMMUNITY CHAT APPROACH: Auto-add all community members for community-wide chats
      if (chatType === 'community-wide' && communityId) {
        console.log('🏢 Auto-adding ALL community members to community chat...');
        
        try {
          // Fetch all community members from database
          const Community = require('../models/Community');
          const community = await Community.findById(communityId).populate('members', 'firstName lastName email');
          
          if (community && community.members) {
            const communityMemberIds = community.members.map(member =>
              member._id.toString()
            );
            
            // For community-wide chats, replace participants with ALL community members
            finalParticipants = communityMemberIds;
            
            // Update participant names with community member data
            community.members.forEach(member => {
              const userId = member._id.toString();
              const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
              participantNames[userId] = fullName || 'Community Member';
            });
            
            console.log(`📋 Community-wide chat: Added ${communityMemberIds.length} community members`);
          } else {
            console.log('⚠️ Community not found or no members');
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch community members:', error.message);
        }
      }

      // Ensure creator is included and remove duplicates
      const allParticipants = new Set([createdBy, ...finalParticipants]);
      const uniqueParticipants = Array.from(allParticipants);

      // Create room data for Firebase
      const firebaseRoomData = {
        id: roomId,
        name: name || 'Unnamed Room',
        type: type,
        description: description,
        communityId: communityId || null, // Link to community
        category: category, // Room category (general, announcements, topics, etc.)
        tags: tags,
        isPrivate: isPrivate,
        createdBy: createdBy,
        participants: uniqueParticipants.map(participantId => ({
          userId: participantId,
          name: participantNames[participantId] || 'Unknown User',
          role: participantId === createdBy ? 'admin' : 'member',
          joinedAt: new Date().toISOString(),
          isOnline: false
        })),
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        lastMessage: null,
        lastMessageBy: null,
        messageCount: 0,
        isActive: true,
        settings: {
          allowMemberInvite: true,
          requireApproval: false,
          maxMembers: 1000
        }
      };

      // Save to Firebase
      await this.db.ref(`chatRooms/${roomId}`).set(firebaseRoomData);

      // If part of a community, add to community's room list
      if (communityId) {
        await this.addRoomToCommunity(communityId, roomId, {
          name: name || 'Unnamed Room',
          category: category,
          description: description,
          createdAt: new Date().toISOString()
        });
      }

      // Add room to user's chat rooms list
      await this.addRoomsToUsers(uniqueParticipants, roomId);

      const roomType = chatType === 'community-wide' ? 'Community Chat (Auto-add All Members)' : 'Private Chat';
      console.log(`Chat room created: ${roomId} (Community: ${communityId}, Category: ${category}, Type: ${roomType}, Participants: ${uniqueParticipants.length})`);
      return {
        success: true,
        data: {
          roomId: roomId,
          firebaseRoomData: firebaseRoomData,
          chatType: chatType,
          participantCount: uniqueParticipants.length,
          messagingPermissions: {
            communityWide: chatType === 'community-wide' ? 'admin-only' : 'all-participants',
            description: chatType === 'community-wide'
              ? 'Community chat - only admins can send, all members can read'
              : 'Private chat - all participants can send messages'
          }
        }
      };
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Get all rooms for a community (supports multiple rooms per community)
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
            // Filter by category if specified
            if (category && room.category !== category) {
              continue;
            }
            rooms.push(room);
          }
        } catch (error) {
          console.warn(`Failed to get room ${roomId}:`, error.message);
        }
      }

      // Sort by category then by creation date
      rooms.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return rooms;
    } catch (error) {
      console.error('Error getting community rooms:', error);
      throw error;
    }
  }

  /**
   * Get rooms by category within a community
   */
  async getCommunityRoomsByCategory(communityId) {
    try {
      const rooms = await this.getCommunityRooms(communityId);
      
      // Group rooms by category
      const roomsByCategory = {};
      rooms.forEach(room => {
        const category = room.category || 'general';
        if (!roomsByCategory[category]) {
          roomsByCategory[category] = [];
        }
        roomsByCategory[category].push(room);
      });

      return roomsByCategory;
    } catch (error) {
      console.error('Error getting rooms by category:', error);
      throw error;
    }
  }

  /**
   * Create a room template for communities
   */
  async createRoomTemplates(communityId, templates = []) {
    try {
      const defaultTemplates = [
        {
          name: 'General Discussion',
          category: 'general',
          description: 'General conversations and discussions'
        },
        {
          name: 'Announcements',
          category: 'announcements',
          description: 'Official community announcements'
        },
        {
          name: 'Help & Support',
          category: 'support',
          description: 'Get help from community members'
        },
        {
          name: 'Events',
          category: 'events',
          description: 'Community events and meetups'
        }
      ];

      const templatesToUse = templates.length > 0 ? templates : defaultTemplates;
      const createdRooms = [];

      for (const template of templatesToUse) {
        try {
          const room = await this.createChatRoom({
            name: template.name,
            type: 'community',
            description: template.description,
            communityId: communityId,
            createdBy: 'system', // System-created room
            participants: [], // Will be populated when users join
            category: template.category,
            isPrivate: false
          });
          
          createdRooms.push(room.data);
        } catch (error) {
          console.warn(`Failed to create template room ${template.name}:`, error.message);
        }
      }

      console.log(`Created ${createdRooms.length} room templates for community ${communityId}`);
      return createdRooms;
    } catch (error) {
      console.error('Error creating room templates:', error);
      throw error;
    }
  }

  /**
   * Send a message using only Firebase
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

      // Check messaging permissions for community-wide chats
      const chatRoom = await this.getChatRoom(messageData.chatRoomId);
      if (chatRoom.communityId && chatRoom.type === 'community') {
        // This is a community-wide chat - check if sender is admin
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

      // Generate unique Firebase message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create message data for Firebase
      const firebaseMessage = {
        id: messageId,
        chatRoomId: chatRoomId,
        content: content.trim(),
        messageType: messageType,
        replyTo: replyTo, // Firebase message ID or null
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

      // Save message to Firebase
      await this.db.ref(`messages/${chatRoomId}/${messageId}`).set(firebaseMessage);

      // Update chat room metadata
      await this.updateChatRoomActivity(chatRoomId, {
        lastMessage: content.trim(),
        lastMessageBy: {
          id: senderId,
          name: senderName
        },
        lastActivity: new Date().toISOString()
      });

      // Update user's last activity
      await this.updateUserLastActivity(senderId);

      console.log(`Message sent: ${messageId} in room ${chatRoomId}`);
      return {
        success: true,
        data: {
          messageId: messageId,
          firebaseMessage: firebaseMessage
        }
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat room from Firebase
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
        messages.push(childSnapshot.val());
      });

      // Sort by timestamp (oldest first)
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Apply offset if needed
      if (offset > 0) {
        return messages.slice(offset);
      }

      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Get a specific message from Firebase
   */
  async getMessage(chatRoomId, messageId) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');
      
      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      return snapshot.val();
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  /**
   * Get chat room data from Firebase
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
   * Get user's chat rooms from Firebase
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

      return chatRooms;
    } catch (error) {
      console.error('Error getting user chat rooms:', error);
      throw error;
    }
  }

  /**
   * Add room to community
   */
  async addRoomToCommunity(communityId, roomId, roomInfo) {
    try {
      await this.db.ref(`communities/${communityId}/chatRooms/${roomId}`).set({
        name: roomInfo.name,
        category: roomInfo.category,
        description: roomInfo.description,
        createdAt: roomInfo.createdAt
      });
    } catch (error) {
      console.error('Error adding room to community:', error);
    }
  }

  /**
   * Add room IDs to users' chat rooms list
   */
  async addRoomsToUsers(userIds, roomId) {
    try {
      const updatePromises = userIds.map(userId => {
        return this.db.ref(`userChatRooms/${userId}/${roomId}`).set({
          addedAt: new Date().toISOString()
        });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error adding rooms to users:', error);
      throw error;
    }
  }

  /**
   * Update chat room activity
   */
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

  /**
   * Update user's last activity
   */
  async updateUserLastActivity(userId) {
    try {
      await this.db.ref(`userPresence/${userId}`).update({
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user last activity:', error);
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(chatRoomId, messageId, userId, emoji) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();
      
      // Remove existing reaction from this user
      const updatedReactions = message.reactions.filter(r => r.userId !== userId);
      
      // Add new reaction
      updatedReactions.push({
        userId,
        emoji,
        createdAt: new Date().toISOString()
      });

      await messageRef.update({
        reactions: updatedReactions
      });

      console.log(`Reaction added to message ${messageId}`);
      return updatedReactions;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(chatRoomId, messageId, userId) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();
      
      // Check if already read by user
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

  /**
   * Update user online status
   */
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      // Update user's presence
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

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(chatRoomId, messageId, userId) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();

      // Only sender can delete their message
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

  /**
   * Edit message
   */
  async editMessage(chatRoomId, messageId, userId, newContent) {
    try {
      const messageRef = this.db.ref(`messages/${chatRoomId}/${messageId}`);
      const snapshot = await messageRef.once('value');

      if (!snapshot.exists()) {
        throw new Error('Message not found');
      }

      const message = snapshot.val();

      // Only sender can edit their message
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

module.exports = new FirebaseCommunityChatService();