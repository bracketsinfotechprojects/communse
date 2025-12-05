# Backend Notification Implementation Examples

## 1. Enhanced Server.js with WebSocket Support

```javascript
// backend/src/server.js - Add this after existing middleware
const http = require('http');
const socketIo = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Make io globally available for notification system
global.io = io;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      
      // Store user ID with socket
      socket.userId = userId;
      socket.join(`user_${userId}`);
      
      // Add to connection manager
      const { ConnectionManager } = require('./utils/notificationSystem');
      ConnectionManager.addWebSocketConnection(userId, socket.id);
      
      socket.emit('authenticated', { userId, status: 'connected' });
    } catch (error) {
      socket.emit('auth_error', { message: 'Invalid token' });
      socket.disconnect();
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const { ConnectionManager } = require('./utils/notificationSystem');
    if (socket.userId) {
      ConnectionManager.removeWebSocketConnection(socket.userId);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 2. Enhanced Community Controller with Notifications

```javascript
// backend/src/controllers/communityController.js - Add notifications to existing functions

const { NotificationHelpers, NotificationQueue } = require('../utils/notificationSystem');

// Enhanced approveUserRequest function
const approveUserRequest = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check permissions
    const userId = req.user.userId;
    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can approve users' });
    }

    const { userId: approveUserId } = req.params;

    // Approve the user
    await community.approveMember(approveUserId);

    // Add community to user's joined communities
    await User.findByIdAndUpdate(approveUserId, {
      $push: { joinedCommunities: community._id }
    });

    // Send notification to approved user
    const notification = {
      type: 'community_join_approved',
      communityId: community._id.toString(),
      communityName: community.name,
      title: 'Join Request Approved!',
      message: `Your request to join "${community.name}" has been approved.`,
      data: {
        communityId: community._id,
        communityName: community.name
      }
    };

    // Send immediate WebSocket notification
    const { WebSocketNotifier } = require('../utils/notificationSystem');
    WebSocketNotifier.sendToUser(approveUserId, notification);
    
    // Also send email notification
    await NotificationQueue.queue(approveUserId, {
      type: 'email',
      subject: `Welcome to ${community.name}!`,
      htmlContent: `
        <h2>Welcome to ${community.name}!</h2>
        <p>Your request to join our community has been approved. You now have full access to all community features.</p>
        <p><a href="${process.env.FRONTEND_URL}/communities/${community._id}">Visit Community</a></p>
      `
    }, ['email']);

    res.json({ 
      message: 'User approved successfully',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Approve user error:', error);
    if (error.message.includes('No pending request found') || 
        error.message.includes('already a member') ||
        error.message.includes('banned') ||
        error.message.includes('maximum member capacity')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced joinCommunity function
const joinCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if community is private - private communities always require approval
    if (community.isPrivate && !community.isOwner(req.user.userId)) {
      // Add user to pending requests
      try {
        await community.addPendingRequest(req.user.userId, req.body.message || '');
        
        // Notify community owner about new join request
        const joinRequestNotification = {
          type: 'new_join_request',
          communityId: community._id.toString(),
          communityName: community.name,
          requesterId: req.user.userId,
          title: 'New Join Request',
          message: `${req.user.username} wants to join "${community.name}"`,
          data: {
            communityId: community._id,
            requesterId: req.user.userId,
            requesterName: req.user.username,
            message: req.body.message
          }
        };

        // Notify owner
        const { WebSocketNotifier } = require('../utils/notificationSystem');
        WebSocketNotifier.sendToUser(community.ownerId.toString(), joinRequestNotification);
        
        // Also send email
        await NotificationQueue.queue(community.ownerId.toString(), {
          type: 'email',
          subject: `New join request for ${community.name}`,
          htmlContent: `
            <h2>New Join Request</h2>
            <p><strong>${req.user.username}</strong> wants to join "${community.name}"</p>
            ${req.body.message ? `<p>Message: "${req.body.message}"</p>` : ''}
            <p><a href="${process.env.FRONTEND_URL}/communities/${community._id}/requests">Review Request</a></p>
          `
        }, ['email']);

        return res.status(403).json({ 
          message: 'This community is private and requires approval to join. Your request has been sent.',
          status: 'pending_approval'
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    // Check if user is already a member
    if (community.isMember(req.user.userId)) {
      return res.status(400).json({ message: 'You are already a member of this community' });
    }

    // Add user to community
    await community.addMember(req.user.userId);

    // Add community to user's joined communities
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { joinedCommunities: community._id }
    });

    // Notify existing members about new member
    const newMemberNotification = {
      type: 'new_member',
      communityId: community._id.toString(),
      communityName: community.name,
      newMemberId: req.user.userId,
      newMemberName: req.user.username,
      title: 'New Member Joined',
      message: `${req.user.username} joined "${community.name}"`,
      data: {
        communityId: community._id,
        newMemberId: req.user.userId,
        newMemberName: req.user.username
      }
    };

    // Notify all community members except the new member
    const { NotificationHelpers } = require('../utils/notificationSystem');
    await NotificationHelpers.notifyCommunityMembers(
      community._id.toString(), 
      newMemberNotification, 
      req.user.userId
    );

    res.json({
      message: 'Successfully joined the community',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

## 3. Notifications Route

```javascript
// backend/src/routes/notifications.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { ConnectionManager } = require('../utils/notificationSystem');

// Get user notifications (polling method)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    // Get notifications from database
    // This assumes you have a Notification model
    const Notification = require('../models/Notification');
    
    const query = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    res.json({
      notifications,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notifications as read
router.put('/read', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;

    const Notification = require('../models/Notification');
    
    if (notificationIds && notificationIds.length > 0) {
      await Notification.updateMany(
        { 
          _id: { $in: notificationIds },
          userId 
        },
        { read: true }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );
    }

    res.json({ message: 'Notifications marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Server-Sent Events endpoint
router.get('/stream', auth, (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    timestamp: new Date().toISOString() 
  })}\n\n`);

  // Add connection to SSE manager
  const userId = req.user.userId;
  ConnectionManager.addSSEConnection(userId, res);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ 
      type: 'heartbeat', 
      timestamp: Date.now() 
    })}\n\n`);
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    ConnectionManager.removeSSEConnection(userId);
  });
});

// Register push subscription
router.post('/push-subscription', auth, (req, res) => {
  try {
    const userId = req.user.userId;
    const subscription = req.body;

    ConnectionManager.addPushSubscription(userId, subscription);
    
    res.json({ message: 'Push subscription registered successfully' });

  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get connection statistics (for debugging)
router.get('/stats', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const stats = ConnectionManager.getConnectionStats();
  res.json(stats);
});

module.exports = router;
```

## 4. Notification Model

```javascript
// backend/src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'community_join_approved',
      'new_join_request',
      'new_member',
      'comment_on_post',
      'post_liked',
      'user_mentioned',
      'community_invite',
      'system_announcement'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

// Auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
```

## 5. Updated package.json dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "socket.io": "^4.7.4",
    "web-push": "^3.6.6",
    "bull": "^4.12.0",
    "redis": "^4.6.10",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.41.3",
    "express-rate-limit": "^7.1.5",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "nodemailer": "^6.9.7",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  }
}
```

## 6. Environment Variables

```bash
# WebSocket Configuration
FRONTEND_URL=http://localhost:3000

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CONTACT_EMAIL=mailto:admin@yourapp.com

# Redis for queuing (optional)
REDIS_URL=redis://localhost:6379

# Email Configuration (existing)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=your-email@gmail.comyour-app-password
EMAIL_FROM=noreply@yourapp.com
```

## 7. Frontend Integration Points

Your frontend should handle these backend changes by:

1. **WebSocket Connection**: Connect to backend with JWT token for real-time notifications
2. **SSE Connection**: Use EventSource API for one-way notifications
3. **Polling Endpoint**: Check `/api/notifications` periodically as fallback
4. **Push Notifications**: Register service worker for browser notifications
5. **Email Integration**: Already working for important notifications

This implementation provides a comprehensive notification system that works with your existing codebase and can scale as your application grows.