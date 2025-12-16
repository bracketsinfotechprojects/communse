const eventService = require('../services/eventService');
const { validationResult } = require('express-validator');

class EventController {
  /**
   * Create a new event
   * POST /api/events
   */
  async createEvent(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const eventData = req.body;
      const creatorId = req.user.userId;

      const result = await eventService.createEvent(eventData, creatorId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update an event
   * PUT /api/events/:id
   */
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.userId;

      const result = await eventService.updateEvent(id, updateData, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Publish an event
   * POST /api/events/:id/publish
   */
  async publishEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await eventService.publishEvent(id, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Publish event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  async getEventById(req, res) {
    try {
      const { id } = req.params;

      const result = await eventService.getEventById(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Join an event
   * POST /api/events/:id/join
   */
  async joinEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await eventService.joinEvent(id, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Join event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Leave an event
   * POST /api/events/:id/leave
   */
  async leaveEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await eventService.leaveEvent(id, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Leave event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Cancel an event
   * POST /api/events/:id/cancel
   */
  async cancelEvent(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      const result = await eventService.cancelEvent(id, userId, reason);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Cancel event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Complete an event
   * POST /api/events/:id/complete
   */
  async completeEvent(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.userId;

      const result = await eventService.completeEvent(id, userId, notes);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Complete event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get events for a community
   * GET /api/communities/:communityId/events
   */
  async getCommunityEvents(req, res) {
    try {
      const { communityId } = req.params;
      const { 
        status = 'published', 
        category, 
        limit = 20, 
        skip = 0 
      } = req.query;

      const options = { status, category, limit: parseInt(limit), skip: parseInt(skip) };

      const result = await eventService.getCommunityEvents(communityId, options);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get community events error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Search events by interest
   * GET /api/events/search/interest
   */
  async findEventsByInterest(req, res) {
    try {
      const { interest } = req.query;
      const { city, limit = 20 } = req.query;

      if (!interest) {
        return res.status(400).json({
          success: false,
          message: 'Interest parameter is required'
        });
      }

      const userLocation = city ? { city } : null;
      const options = { limit: parseInt(limit) };

      const result = await eventService.findEventsByInterest(interest, userLocation, options);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Search events by interest error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get user's events
   * GET /api/users/events
   */
  async getUserEvents(req, res) {
    try {
      const userId = req.user.userId;
      const { status, limit = 20, skip = 0 } = req.query;

      const options = { 
        status, 
        limit: parseInt(limit), 
        skip: parseInt(skip) 
      };

      const result = await eventService.getUserEvents(userId, options);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Get user events error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete an event
   * DELETE /api/events/:id
   */
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await eventService.deleteEvent(id, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get event categories
   * GET /api/events/categories
   */
  async getEventCategories(req, res) {
    try {
      const result = eventService.getEventCategories();
      res.json(result);
    } catch (error) {
      console.error('Get event categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get user's event statistics
   * GET /api/users/events/stats
   */
  async getUserEventStats(req, res) {
    try {
      const userId = req.user.userId;
      
      const Event = require('../models/Event');
      
      // Get user's created events
      const createdEvents = await Event.find({ createdBy: userId });
      
      // Get events user is attending
      const attendingEvents = await Event.find({ 'attendees.userId': userId });
      
      // Calculate statistics
      const stats = {
        created: {
          total: createdEvents.length,
          draft: createdEvents.filter(e => e.status === 'draft').length,
          published: createdEvents.filter(e => e.status === 'published').length,
          completed: createdEvents.filter(e => e.status === 'completed').length,
          cancelled: createdEvents.filter(e => e.status === 'cancelled').length
        },
        attending: {
          total: attendingEvents.length,
          upcoming: attendingEvents.filter(e => e.isUpcoming).length,
          ongoing: attendingEvents.filter(e => e.isOngoing).length,
          past: attendingEvents.filter(e => e.isPast).length
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get user event stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Archive expired events (admin/cron function)
   * POST /api/events/archive-expired
   */
  async archiveExpiredEvents(req, res) {
    try {
      const result = await eventService.archiveExpiredEvents();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Archive expired events error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get event chat room info
   * GET /api/events/:id/chat
   */
  async getEventChatInfo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Get event details
      const eventResult = await eventService.getEventById(id);
      if (!eventResult.success) {
        return res.status(404).json(eventResult);
      }

      const event = eventResult.data;

      // Check if user is attending the event or is the creator
      const userIdStr = userId.toString();
      const isAttending = event.isUserAttending(userId) || event.createdBy._id.toString() === userIdStr;
      
      if (!isAttending) {
        return res.status(403).json({
          success: false,
          message: 'Only event attendees can access chat information'
        });
      }

      if (!event.chatRoomCreated || !event.chatRoomId) {
        return res.json({
          success: true,
          data: {
            hasChatRoom: false,
            message: 'Chat room not created yet'
          }
        });
      }

      res.json({
        success: true,
        data: {
          hasChatRoom: true,
          roomId: event.chatRoomId,
          eventTitle: event.title,
          participantCount: event.attendees.length + 1 // +1 for creator
        }
      });
    } catch (error) {
      console.error('Get event chat info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update event attendance (admin function)
   * POST /api/events/:id/attendance/update
   */
  async updateEventAttendance(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // This could be used to manually sync attendance count
      const eventResult = await eventService.getEventById(id);
      if (!eventResult.success) {
        return res.status(404).json(eventResult);
      }

      const event = eventResult.data;
      
      // Update current attendee count
      event.currentAttendees = event.attendees.length;
      await event.save();

      res.json({
        success: true,
        data: {
          eventId: id,
          currentAttendees: event.currentAttendees,
          maxAttendees: event.maxAttendees,
          isFull: event.isFull
        },
        message: 'Attendance updated successfully'
      });
    } catch (error) {
      console.error('Update event attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new EventController();