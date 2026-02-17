const Event = require('../models/Event');
const Community = require('../models/Community');
const User = require('../models/User');
const firebaseCommunityChatService = require('./firebaseCommunityChatService');
const notificationService = require('./notificationService');

class EventService {
  constructor() {
    this.firebaseService = firebaseCommunityChatService;
  }

  /**
   * Create a new event (also creates Firebase chat room)
   */
  async createEvent(eventData, creatorId) {
    try {
      // Verify creator exists and is part of the community
      const community = await Community.findById(eventData.communityId);
      if (!community) {
        throw new Error('Community not found');
      }

      const creator = await User.findById(creatorId);
      if (!creator) {
        throw new Error('Creator not found');
      }

      // Check if user is a member of the community
      const isMember = community.members.some(member =>
        member.toString() === creatorId.toString()
      );

      if (!isMember) {
        throw new Error('User must be a member of the community to create events');
      }

      // Create event with creator automatically added as attendee
      const event = new Event({
        ...eventData,
        createdBy: creatorId,
        status: 'draft',
        attendees: [{
          userId: creatorId,
          joinedAt: new Date(),
          status: 'confirmed'
        }],
        currentAttendees: 1  // Start with creator as attendee
      });

      await event.save();
      
      // Create chat room for the event with duplicate prevention
      try {
        await this.createEventChatRoomSafely(event);
      } catch (chatError) {
        console.warn('Failed to create chat room for event:', chatError);
        // Continue with event creation even if chat room creation fails
      }
      
      await event.populate([
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'communityId', select: 'name location' },
        { path: 'attendees.userId', select: 'firstName lastName' }
      ]);

      return {
        success: true,
        data: event,
        message: 'Event created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create event'
      };
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId, updateData, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if user is the creator or community owner
      if (event.createdBy.toString() !== userId.toString()) {
        const community = await Community.findById(event.communityId);
        if (community.ownerId.toString() !== userId.toString()) {
          throw new Error('Only event creator or community owner can update this event');
        }
      }

      // Prevent updating certain fields after event is published
      if (event.status === 'published') {
        const protectedFields = ['communityId', 'createdBy', 'maxAttendees'];
        protectedFields.forEach(field => {
          if (updateData[field]) {
            delete updateData[field];
          }
        });
      }

      // Update the event
      Object.assign(event, updateData);
      await event.save();
      
      await event.populate([
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'communityId', select: 'name location' },
        { path: 'attendees.userId', select: 'firstName lastName' }
      ]);

      return {
        success: true,
        data: event,
        message: 'Event updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update event'
      };
    }
  }

  /**
   * Publish an event (chat room already created during event creation)
   */
  async publishEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions
      if (event.createdBy.toString() !== userId.toString()) {
        const community = await Community.findById(event.communityId);
        if (community.ownerId.toString() !== userId.toString()) {
          throw new Error('Only event creator or community owner can publish this event');
        }
      }

      if (event.status !== 'draft') {
        throw new Error('Only draft events can be published');
      }

      // Update status
      event.status = 'published';
      await event.save();

      // Ensure chat room exists (safely)
      if (!event.chatRoomCreated || !event.chatRoomId) {
        try {
          await this.createEventChatRoomSafely(event);
        } catch (chatError) {
          console.warn('Failed to create chat room during event publish:', chatError);
          // Continue with event publish even if chat room creation fails
        }
      }

      await event.populate([
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'communityId', select: 'name location' },
        { path: 'attendees.userId', select: 'firstName lastName' }
      ]);

      // Send push notifications to nearby users with matching interests
      try {
        await notificationService.notifyEventCreation(event, event.createdBy);
        console.log('Event publication notifications sent successfully');
      } catch (notificationError) {
        console.error('Failed to send event publication notifications:', notificationError);
        // Don't fail event publish if notification fails
      }

      return {
        success: true,
        data: event,
        message: 'Event published successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to publish event'
      };
    }
  }

  /**
   * Create chat room for event SAFELY (prevents duplicates)
   * This method ensures only one chat room is created per event
   */
  async createEventChatRoomSafely(event) {
    // Double-check: Re-fetch the event to avoid stale data
    const freshEvent = await Event.findById(event._id);
    
    // Prevent duplicate room creation
    if (freshEvent.chatRoomCreated && freshEvent.chatRoomId) {
      console.log(`Chat room already exists for event ${event._id}: ${freshEvent.chatRoomId}`);
      return {
        success: true,
        data: { roomId: freshEvent.chatRoomId },
        message: 'Chat room already exists'
      };
    }

    // Get attendee IDs from the attendees array (creator is now automatically included)
    const attendeeIds = freshEvent.attendees.map(attendee => attendee.userId.toString());

    const chatRoomData = {
      name: `Event: ${freshEvent.title}`,
      type: 'event',
      description: freshEvent.description,
      communityId: freshEvent.communityId.toString(),
      eventId: freshEvent._id.toString(),
      createdBy: freshEvent.createdBy.toString(),
      participants: attendeeIds,
      category: 'event',
      isPrivate: true,
      chatType: 'event-specific'
    };

    // Create the room in Firebase
    const roomResult = await this.firebaseService.createChatRoom(chatRoomData);
    
    if (roomResult.success) {
      // Update the event with the new room ID using atomic operation
      const updatedEvent = await Event.findByIdAndUpdate(
        event._id,
        {
          chatRoomId: roomResult.data.roomId,
          chatRoomCreated: true
        },
        { new: true }
      );
      
      if (!updatedEvent) {
        throw new Error('Failed to update event with chat room ID');
      }
      
      console.log(`Chat room created successfully for event ${event._id}: ${roomResult.data.roomId}`);
    } else {
      throw new Error(`Firebase room creation failed: ${roomResult.error || 'Unknown error'}`);
    }

    return roomResult;
  }

  /**
   * Legacy method - kept for backward compatibility
   * This now delegates to the safe version
   */
  async createEventChatRoom(event) {
    return await this.createEventChatRoomSafely(event);
  }

  /**
   * Join an event
   */
  async joinEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if event is published
      if (event.status !== 'published') {
        throw new Error('Cannot join unpublished event');
      }

      // Check if event is full
      if (event.currentAttendees >= event.maxAttendees) {
        throw new Error('Event has reached maximum attendee capacity');
      }

      // Check if user is community member
      const community = await Community.findById(event.communityId);
      const isMember = community.members.some(member =>
        member.toString() === userId.toString()
      );

      if (!isMember) {
        throw new Error('User must be a member of the community to join this event');
      }

      // Join the event
      await event.joinEvent(userId);

      // Add user to chat room if it exists
      if (event.chatRoomCreated && event.chatRoomId) {
        try {
          await this.firebaseService.addRoomsToUsers([userId], event.chatRoomId);
        } catch (chatError) {
          console.warn('Failed to add user to event chat room:', chatError);
        }
      }

      await event.populate([
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'communityId', select: 'name location' },
        { path: 'attendees.userId', select: 'firstName lastName' }
      ]);

      return {
        success: true,
        data: event,
        message: 'Successfully joined the event'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to join event'
      };
    }
  }

  /**
   * Leave an event
   */
  async leaveEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Leave the event
      await event.leaveEvent(userId);

      // Remove user from chat room if it exists
      if (event.chatRoomCreated && event.chatRoomId) {
        try {
          // Note: Firebase service doesn't have remove user method, but chat rooms can handle this
          // User will be automatically excluded from active participants
        } catch (chatError) {
          console.warn('Failed to remove user from event chat room:', chatError);
        }
      }

      await event.populate([
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'communityId', select: 'name location' },
        { path: 'attendees.userId', select: 'firstName lastName' }
      ]);

      return {
        success: true,
        data: event,
        message: 'Successfully left the event'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to leave event'
      };
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId, userId, reason = '') {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions
      if (event.createdBy.toString() !== userId.toString()) {
        const community = await Community.findById(event.communityId);
        if (community.ownerId.toString() !== userId.toString()) {
          throw new Error('Only event creator or community owner can cancel this event');
        }
      }

      if (event.status === 'archived' || event.status === 'cancelled') {
        throw new Error('Event is already cancelled or archived');
      }

      event.status = 'cancelled';
      event.cancellationReason = reason;
      await event.save();

      // Notify attendees about cancellation
      // TODO: Implement notification system

      return {
        success: true,
        data: event,
        message: 'Event cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to cancel event'
      };
    }
  }

  /**
   * Complete an event
   */
  async completeEvent(eventId, userId, notes = '') {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions
      if (event.createdBy.toString() !== userId.toString()) {
        const community = await Community.findById(event.communityId);
        if (community.ownerId.toString() !== userId.toString()) {
          throw new Error('Only event creator or community owner can complete this event');
        }
      }

      event.status = 'completed';
      event.completionNotes = notes;
      await event.save();

      return {
        success: true,
        data: event,
        message: 'Event marked as completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to complete event'
      };
    }
  }

  /**
   * Get events for a community
   */
  async getCommunityEvents(communityId, options = {}) {
    try {
      const events = await Event.findForCommunity(communityId, options);
      return {
        success: true,
        data: events,
        count: events.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch community events'
      };
    }
  }

  /**
   * Search events by interest
   */
  async findEventsByInterest(interest, userLocation, options = {}) {
    try {
      const events = await Event.findByInterest(interest, userLocation, options.limit);
      return {
        success: true,
        data: events,
        count: events.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to search events by interest'
      };
    }
  }

  /**
   * Get user's events (created or attending)
   */
  async getUserEvents(userId, options = {}) {
    try {
      const events = await Event.findForUser(userId, options);
      return {
        success: true,
        data: events,
        count: events.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch user events'
      };
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    try {
      const event = await Event.findById(eventId)
        .populate('createdBy', 'firstName lastName')
        .populate('communityId', 'name location')
        .populate('attendees.userId', 'firstName lastName');

      if (!event) {
        throw new Error('Event not found');
      }

      return {
        success: true,
        data: event
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch event'
      };
    }
  }

  /**
   * Delete an event (only draft events)
   */
  async deleteEvent(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions
      if (event.createdBy.toString() !== userId.toString()) {
        const community = await Community.findById(event.communityId);
        if (community.ownerId.toString() !== userId.toString()) {
          throw new Error('Only event creator or community owner can delete this event');
        }
      }

      if (event.status !== 'draft') {
        throw new Error('Only draft events can be deleted');
      }

      await Event.findByIdAndDelete(eventId);

      return {
        success: true,
        message: 'Event deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete event'
      };
    }
  }

  /**
   * Get event categories
   */
  getEventCategories() {
    return {
      success: true,
      data: [
        { value: 'interest-based-meetup', label: 'Interest-Based Meetup' },
        { value: 'skill-learning-session', label: 'Skill & Learning Session' },
        { value: 'sports', label: 'Sports' },
        { value: 'networking', label: 'Networking' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'discussion', label: 'Discussion' },
        { value: 'social', label: 'Social' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  /**
   * Archive expired events (cron job function)
   */
  async archiveExpiredEvents() {
    try {
      const expiredEvents = await Event.updateMany(
        { 
          status: 'completed',
          expireAt: { $lt: new Date() }
        },
        { status: 'archived' }
      );

      return {
        success: true,
        archivedCount: expiredEvents.modifiedCount,
        message: `Archived ${expiredEvents.modifiedCount} expired events`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to archive expired events'
      };
    }
  }
}

module.exports = new EventService();