const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CommAPP API',
      version: '2.0.0',
      description: 'API documentation for CommAPP backend - Event Management & Community Platform with Firebase Chat',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            fullName: { type: 'string' },
            avatar: { type: 'string' },
            bio: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            followers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  avatar: { type: 'string' }
                }
              }
            },
            following: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  avatar: { type: 'string' }
                }
              }
            },
            socialLinks: {
              type: 'object',
              properties: {
                twitter: { type: 'string' },
                linkedin: { type: 'string' },
                github: { type: 'string' },
                website: { type: 'string' }
              }
            },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            category: { 
              type: 'string', 
              enum: ['General', 'Technology', 'Lifestyle', 'Education', 'Entertainment', 'Health', 'Travel', 'Food']
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            status: { 
              type: 'string', 
              enum: ['draft', 'published', 'archived'],
              default: 'draft'
            },
            isPublic: { type: 'boolean', default: true },
            views: { type: 'integer', default: 0 },
            likes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            author: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            comments: {
              type: 'array',
              items: { type: 'string' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            content: { type: 'string' },
            isDeleted: { type: 'boolean', default: false },
            deletedAt: { type: 'string', format: 'date-time' },
            likes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            replies: {
              type: 'array',
              items: { type: 'string' }
            },
            parentComment: { type: 'string' },
            author: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            post: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Community: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            isPrivate: { type: 'boolean' },
            location: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  avatar: { type: 'string' }
                }
              }
            },
            bannedMembers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  avatar: { type: 'string' }
                }
              }
            },
            memberCount: { type: 'integer' },
            settings: {
              type: 'object',
              properties: {
                requireApproval: { type: 'boolean' },
                allowMemberInvites: { type: 'boolean' },
                maxMembers: { type: 'integer' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Interest: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { 
              type: 'string',
              description: 'Interest name (3-25 characters, alphanumeric and spaces only)'
            },
            createdBy: {
              type: 'string',
              description: 'User ID who created this interest'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Location: {
          type: 'object',
          properties: {
            coordinates: {
              type: 'object',
              properties: {
                latitude: { 
                  type: 'number',
                  minimum: -90,
                  maximum: 90
                },
                longitude: { 
                  type: 'number',
                  minimum: -180,
                  maximum: 180
                }
              }
            },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            method: { 
              type: 'string',
              description: 'How the location was determined (e.g., "manual", "geolocation")'
            },
            lastUpdated: { type: 'string', format: 'date-time' }
          }
        },
        CommunityLocation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            isPrivate: { type: 'boolean' },
            location: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  avatar: { type: 'string' }
                }
              }
            },
            memberCount: { type: 'integer' },
            calculatedDistance: { 
              type: 'number',
              description: 'Distance from user location in meters'
            },
            matchType: {
              type: 'string',
              enum: ['exact_location', 'nearby_location', 'city_exact', 'nearby_city'],
              description: 'How the community was matched to the search'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { 
              type: 'string',
              description: 'Event title (5-100 characters)',
              minLength: 5,
              maxLength: 100
            },
            description: { 
              type: 'string',
              description: 'Event description (10-2000 characters)',
              minLength: 10,
              maxLength: 2000
            },
            communityId: {
              type: 'string',
              description: 'Community ID where event belongs'
            },
            createdBy: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            },
            startTime: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event start time (must be in future)'
            },
            endTime: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event end time (must be after start time)'
            },
            expireAt: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event expiration time (auto-calculated: endTime + 7 days)'
            },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string', description: 'City name' },
                landmark: { type: 'string', description: 'Landmark or venue' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', minimum: -90, maximum: 90 },
                    longitude: { type: 'number', minimum: -180, maximum: 180 }
                  }
                },
                fullAddress: { type: 'string', description: 'Complete address' }
              }
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
              description: 'Event lifecycle status'
            },
            category: {
              type: 'string',
              enum: ['interest-based-meetup', 'skill-learning-session', 'sports', 'networking', 'workshop', 'discussion', 'social', 'other'],
              description: 'Event category'
            },
            maxAttendees: { 
              type: 'integer', 
              minimum: 1, 
              maximum: 1000,
              description: 'Maximum number of attendees allowed'
            },
            currentAttendees: { 
              type: 'integer', 
              minimum: 0,
              description: 'Current number of attendees'
            },
            attendees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  joinedAt: { type: 'string', format: 'date-time' },
                  status: { type: 'string', enum: ['confirmed', 'waitlist'] }
                }
              }
            },
            isPublic: { 
              type: 'boolean', 
              default: false,
              description: 'Whether event is visible to non-community members'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Event tags for discovery'
            },
            chatRoomId: { 
              type: 'string',
              description: 'Firebase chat room ID (created when event is published)'
            },
            chatRoomCreated: { 
              type: 'boolean',
              description: 'Whether chat room has been created'
            },
            coverImage: { type: 'string', description: 'Event cover image URL' },
            requirements: { 
              type: 'string',
              description: 'Requirements to attend the event'
            },
            contactInfo: { 
              type: 'string',
              description: 'Contact information for the event'
            },
            cancellationReason: { 
              type: 'string',
              description: 'Reason for event cancellation'
            },
            completionNotes: { 
              type: 'string',
              description: 'Notes after event completion'
            },
            isFull: { 
              type: 'boolean',
              description: 'Whether event has reached maximum capacity'
            },
            isUpcoming: { 
              type: 'boolean',
              description: 'Whether event is in the future'
            },
            isOngoing: { 
              type: 'boolean',
              description: 'Whether event is currently happening'
            },
            isPast: { 
              type: 'boolean',
              description: 'Whether event has ended'
            },
            attendeeCount: { 
              type: 'integer',
              description: 'Number of attendees (virtual field)'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        EventCreateRequest: {
          type: 'object',
          required: ['title', 'description', 'communityId', 'startTime', 'endTime', 'location', 'category', 'maxAttendees'],
          properties: {
            title: { 
              type: 'string',
              minLength: 5,
              maxLength: 100,
              description: 'Event title'
            },
            description: { 
              type: 'string',
              minLength: 10,
              maxLength: 2000,
              description: 'Event description'
            },
            communityId: { type: 'string', description: 'Community ID' },
            startTime: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event start time'
            },
            endTime: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event end time'
            },
            location: {
              type: 'object',
              required: ['city'],
              properties: {
                city: { type: 'string', description: 'City name' },
                landmark: { type: 'string', description: 'Landmark or venue' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', minimum: -90, maximum: 90 },
                    longitude: { type: 'number', minimum: -180, maximum: 180 }
                  }
                },
                fullAddress: { type: 'string', description: 'Complete address' }
              }
            },
            category: {
              type: 'string',
              enum: ['interest-based-meetup', 'skill-learning-session', 'sports', 'networking', 'workshop', 'discussion', 'social', 'other'],
              description: 'Event category'
            },
            maxAttendees: { 
              type: 'integer', 
              minimum: 1, 
              maximum: 1000,
              description: 'Maximum attendees allowed'
            },
            isPublic: { 
              type: 'boolean', 
              default: false,
              description: 'Whether event is public'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Event tags'
            },
            coverImage: { type: 'string', description: 'Cover image URL' },
            requirements: { type: 'string', description: 'Event requirements' },
            contactInfo: { type: 'string', description: 'Contact information' }
          }
        },
        EventUpdateRequest: {
          type: 'object',
          properties: {
            title: { 
              type: 'string',
              minLength: 5,
              maxLength: 100,
              description: 'Event title'
            },
            description: { 
              type: 'string',
              minLength: 10,
              maxLength: 2000,
              description: 'Event description'
            },
            startTime: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event start time'
            },
            endTime: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event end time'
            },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string', description: 'City name' },
                landmark: { type: 'string', description: 'Landmark or venue' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', minimum: -90, maximum: 90 },
                    longitude: { type: 'number', minimum: -180, maximum: 180 }
                  }
                },
                fullAddress: { type: 'string', description: 'Complete address' }
              }
            },
            category: {
              type: 'string',
              enum: ['interest-based-meetup', 'skill-learning-session', 'sports', 'networking', 'workshop', 'discussion', 'social', 'other'],
              description: 'Event category'
            },
            maxAttendees: { 
              type: 'integer', 
              minimum: 1, 
              maximum: 1000,
              description: 'Maximum attendees allowed'
            },
            isPublic: { type: 'boolean', description: 'Whether event is public' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Event tags'
            },
            coverImage: { type: 'string', description: 'Cover image URL' },
            requirements: { type: 'string', description: 'Event requirements' },
            contactInfo: { type: 'string', description: 'Contact information' }
          }
        },
        EventChatInfo: {
          type: 'object',
          properties: {
            hasChatRoom: { type: 'boolean', description: 'Whether event has a chat room' },
            roomId: { type: 'string', description: 'Firebase chat room ID' },
            eventTitle: { type: 'string', description: 'Event title' },
            participantCount: { type: 'integer', description: 'Number of chat participants' }
          }
        },
        EventCategory: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'Category value' },
            label: { type: 'string', description: 'Category display name' }
          }
        },
        EventStatistics: {
          type: 'object',
          properties: {
            created: {
              type: 'object',
              properties: {
                total: { type: 'integer', description: 'Total events created' },
                draft: { type: 'integer', description: 'Draft events' },
                published: { type: 'integer', description: 'Published events' },
                completed: { type: 'integer', description: 'Completed events' },
                cancelled: { type: 'integer', description: 'Cancelled events' }
              }
            },
            attending: {
              type: 'object',
              properties: {
                total: { type: 'integer', description: 'Total events attending' },
                upcoming: { type: 'integer', description: 'Upcoming events' },
                ongoing: { type: 'integer', description: 'Currently ongoing events' },
                past: { type: 'integer', description: 'Past events' }
              }
            }
          }
        },
        CancelEventRequest: {
          type: 'object',
          properties: {
            reason: { 
              type: 'string',
              maxLength: 500,
              description: 'Reason for cancellation'
            }
          }
        },
        CompleteEventRequest: {
          type: 'object',
          properties: {
            notes: { 
              type: 'string',
              maxLength: 1000,
              description: 'Completion notes'
            }
          }
        },
        EventSearchRequest: {
          type: 'object',
          properties: {
            interest: { 
              type: 'string',
              description: 'Interest to search for'
            },
            city: { 
              type: 'string',
              description: 'Filter by city'
            },
            limit: { 
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Number of results to return'
            }
          }
        },
        ChatRoom: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['private', 'community', 'event'] },
            description: { type: 'string' },
            communityId: { type: 'string' },
            eventId: { type: 'string', description: 'Event ID (for event chat rooms)' },
            createdBy: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'member'] },
                  joinedAt: { type: 'string', format: 'date-time' },
                  isOnline: { type: 'boolean' }
                }
              }
            },
            participantCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            lastActivity: { type: 'string', format: 'date-time' },
            lastMessage: { type: 'string' },
            messageCount: { type: 'integer' },
            isActive: { type: 'boolean' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            messageType: { type: 'string', enum: ['text', 'image', 'file', 'audio', 'video'] },
            sender: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            timestamp: { type: 'string', format: 'date-time' },
            replyTo: { type: 'string', nullable: true, description: 'ID of message being replied to' },
            reactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  emoji: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            readBy: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  readAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            isEdited: { type: 'boolean' },
            editedAt: { type: 'string', format: 'date-time' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time' },
            deletedBy: { type: 'string' }
          }
        },
        UserPresence: {
          type: 'object',
          properties: {
            isOnline: { type: 'boolean' },
            lastSeen: { type: 'string', format: 'date-time' },
            lastActivity: { type: 'string', format: 'date-time' }
          }
        },
        ChatRoomCreateRequest: {
          type: 'object',
          required: ['type'],
          properties: {
            name: { type: 'string', description: 'Room name (required for group chats)' },
            type: { type: 'string', enum: ['private', 'community', 'event'], description: 'Room type' },
            description: { type: 'string', description: 'Room description' },
            communityId: { type: 'string', description: 'Community ID (required for community/event type)' },
            eventId: { type: 'string', description: 'Event ID (required for event type)' },
            participants: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of user IDs to add as participants'
            }
          }
        },
        SendMessageRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', maxLength: 2000, description: 'Message content' },
            messageType: { type: 'string', enum: ['text', 'image', 'file', 'audio', 'video'], default: 'text' },
            replyTo: { type: 'string', description: 'ID of message being replied to' }
          }
        },
        AddReactionRequest: {
          type: 'object',
          required: ['emoji', 'roomId'],
          properties: {
            emoji: { type: 'string', description: 'Emoji to add as reaction' },
            roomId: { type: 'string', description: 'Room ID where message belongs' }
          }
        },
        MarkAsReadRequest: {
          type: 'object',
          required: ['roomId'],
          properties: {
            roomId: { type: 'string', description: 'Room ID where message belongs' }
          }
        },
        UpdateStatusRequest: {
          type: 'object',
          required: ['isOnline'],
          properties: {
            isOnline: { type: 'boolean', description: 'User online status' }
          }
        },
        EditMessageRequest: {
          type: 'object',
          required: ['content', 'roomId'],
          properties: {
            content: { type: 'string', maxLength: 2000, description: 'Updated message content' },
            roomId: { type: 'string', description: 'Room ID where message belongs' }
          }
        },
        DeleteMessageRequest: {
          type: 'object',
          required: ['roomId'],
          properties: {
            roomId: { type: 'string', description: 'Room ID where message belongs' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Posts', description: 'Post management endpoints' },
      { name: 'Comments', description: 'Comment management endpoints' },
      { name: 'Communities', description: 'Community management endpoints' },
      { name: 'Interests', description: 'Interest management endpoints' },
      { name: 'Locations', description: 'Location-based endpoints' },
      { name: 'Events', description: 'Event management endpoints' },
      { name: 'Event Chat', description: 'Firebase-based event chat endpoints' },
      { name: 'Firebase Chat', description: 'Firebase community chat endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/controllers/*Controller.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
