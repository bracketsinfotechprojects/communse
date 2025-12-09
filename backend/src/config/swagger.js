const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Community App API',
      version: '1.0.0',
      description: 'API documentation for Community App backend',
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
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            communityId: {
              type: 'string',
              description: 'ID of the community'
            },
            senderId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            text: { 
              type: 'string',
              description: 'Message text content',
              maxLength: 5000
            },
            attachments: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of attachment URLs'
            },
            readBy: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of user IDs who have read the message'
            },
            edited: { 
              type: 'boolean',
              description: 'Whether the message has been edited',
              default: false
            },
            editedAt: { 
              type: 'string',
              format: 'date-time',
              description: 'When the message was last edited'
            },
            deleted: { 
              type: 'boolean',
              description: 'Whether the message has been soft deleted',
              default: false
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ChatResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/Message' }
          }
        },
        ChatListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Message' }
            },
            pagination: {
              type: 'object',
              properties: {
                limit: { type: 'integer' },
                hasMore: { type: 'boolean' }
              }
            }
          }
        },
        UnreadCountResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                communityId: { type: 'string' },
                unreadCount: { type: 'integer' }
              }
            }
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
      { name: 'Chat', description: 'Chat and messaging endpoints' },
      { name: 'Interests', description: 'Interest management endpoints' },
      { name: 'Locations', description: 'Location-based endpoints' },
      { name: 'Community Location', description: 'Location-based community discovery APIs' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/controllers/*Controller.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
