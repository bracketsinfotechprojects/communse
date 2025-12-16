/**
 * Integration Example
 * 
 * This file shows how to integrate the chat token service into your Express server.
 * 
 * Add these lines to your backend/src/server.js file to enable the chat token routes.
 */

// Example integration in backend/src/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Existing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001']
}));

// ===================
// ADD THESE LINES FOR CHAT TOKEN INTEGRATION
// ===================

// Import chat token routes
const chatTokenRoutes = require('./routes/chatToken');

// Mount chat token routes
app.use('/chat', chatTokenRoutes);

console.log('✅ Chat token routes mounted at /chat');

// ===================
// REST OF YOUR SERVER CODE
// ===================

// Example of a protected route that generates chat tokens
// You can integrate this with your existing authentication middleware
app.get('/events/:eventId/chat-token', async (req, res) => {
  try {
    // Assuming you have authentication middleware
    // const authenticatedUserId = req.user.id;
    // const { eventId } = req.params;
    
    // For now, using query parameters
    const authenticatedUserId = req.query.userId;
    const eventId = req.params.eventId;
    
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Redirect to chat token service
    req.query.userId = authenticatedUserId;
    req.query.eventId = eventId;
    
    // Use the chat token route handler
    const chatRoutes = require('./routes/chatToken');
    const tokenHandler = chatRoutes.stack.find(layer => 
      layer.route && layer.route.path === '/token'
    );
    
    if (tokenHandler) {
      // Call the route handler directly
      tokenHandler.handle(req, res);
    } else {
      res.status(500).json({
        success: false,
        error: 'Chat token service not available'
      });
    }
    
  } catch (error) {
    console.error('Error in chat token endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Alternative: Direct service usage
const chatTokenService = require('./services/chatTokenService');

app.get('/api/events/:eventId/chat-access', async (req, res) => {
  try {
    // Get authenticated user ID from JWT token or session
    const authenticatedUserId = req.user?.id; // Adjust based on your auth system
    
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const { eventId } = req.params;
    
    // Check permission first
    const permission = await chatTokenService.checkChatPermission(
      authenticatedUserId, 
      eventId
    );
    
    if (!permission.hasAccess) {
      return res.status(403).json({
        success: false,
        error: permission.error || 'Access denied'
      });
    }
    
    // Generate token if permission granted
    const token = await chatTokenService.generateChatToken(
      authenticatedUserId, 
      eventId
    );
    
    res.json({
      success: true,
      token,
      role: permission.role,
      expiresIn: '1h' // Firebase custom tokens expire in 1 hour
    });
    
  } catch (error) {
    console.error('Error generating chat access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chat access token'
    });
  }
});

// ===================
// Authentication Middleware Example
// ===================

// Example JWT authentication middleware
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
}

// Protected route example
app.get('/protected-chat/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    const token = await chatTokenService.generateChatToken(userId, eventId);
    
    res.json({
      success: true,
      token,
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });
    
  } catch (error) {
    console.error('Protected chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate protected chat token'
    });
  }
});

// ===================
// Frontend Integration Examples
// ===================

/**
 * Example: React component for getting chat token
 */
const reactComponentExample = `
import React, { useState, useEffect } from 'react';

function ChatAccess({ eventId }) {
  const [chatToken, setChatToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getChatAccess = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get JWT token from your auth system
      const jwtToken = await getAuthToken(); // Implement this
      
      const response = await fetch('/api/events/' + eventId + '/chat-access', {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${jwtToken}\`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setChatToken(data.token);
        
        // Initialize Firebase with custom token
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('./firebase-config');
        
        const userCredential = await signInWithCustomToken(auth, data.token);
        console.log('User signed in for chat:', userCredential.user.uid);
        
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to get chat access');
      console.error('Chat access error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={getChatAccess} 
        disabled={loading}
        className="chat-access-button"
      >
        {loading ? 'Getting Access...' : 'Join Event Chat'}
      </button>
      
      {error && <div className="error">{error}</div>}
      {chatToken && <div className="success">Chat access granted!</div>}
    </div>
  );
}

export default ChatAccess;
`;

/**
 * Example: Vue.js component for getting chat token
 */
const vueComponentExample = `
<template>
  <div class="chat-access">
    <button 
      @click="getChatAccess" 
      :disabled="loading"
      class="chat-access-button"
    >
      {{ loading ? 'Getting Access...' : 'Join Event Chat' }}
    </button>
    
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="chatToken" class="success">Chat access granted!</div>
  </div>
</template>

<script>
import { getAuth, signInWithCustomToken } from 'firebase/auth';

export default {
  name: 'ChatAccess',
  props: ['eventId'],
  data() {
    return {
      chatToken: null,
      loading: false,
      error: null
    };
  },
  methods: {
    async getChatAccess() {
      this.loading = true;
      this.error = null;

      try {
        // Get JWT token from your auth system
        const jwtToken = await this.getAuthToken(); // Implement this
        
        const response = await fetch('/api/events/' + this.eventId + '/chat-access', {
          method: 'GET',
          headers: {
            'Authorization': \`Bearer \${jwtToken}\`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          this.chatToken = data.token;
          
          // Initialize Firebase with custom token
          const auth = getAuth();
          const userCredential = await signInWithCustomToken(auth, data.token);
          console.log('User signed in for chat:', userCredential.user.uid);
          
        } else {
          this.error = data.error;
        }
      } catch (err) {
        this.error = 'Failed to get chat access';
        console.error('Chat access error:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async getAuthToken() {
      // Implement your JWT token retrieval logic
      // This could be from localStorage, session storage, or a state management system
      return localStorage.getItem('authToken');
    }
  }
};
</script>
`;

console.log('📋 Integration examples created');
console.log('✅ Add chat token routes to your server with: app.use(\'/chat\', chatTokenRoutes);');