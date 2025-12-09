const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');

// Import models and controllers for testing
const Message = require('./src/models/Message');
const Community = require('./src/models/Community');
const User = require('./src/models/User');
const chatController = require('./src/controllers/chatController');

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:5000/api',
  wsURL: 'ws://localhost:5000',
  JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/commapp-test'
};

class ChatSystemTester {
  constructor() {
    this.testUser = null;
    this.testCommunity = null;
    this.testMessages = [];
    this.authToken = null;
  }

  /**
   * Setup test environment
   */
  async setup() {
    try {
      console.log('🔧 Setting up test environment...');
      
      // Connect to test database
      await mongoose.connect(TEST_CONFIG.MONGO_URI);
      console.log('✅ Connected to test database');

      // Clear existing test data
      await this.cleanup();
      
      // Create test user
      this.testUser = await this.createTestUser();
      console.log('✅ Test user created:', this.testUser._id);

      // Create test community
      this.testCommunity = await this.createTestCommunity();
      console.log('✅ Test community created:', this.testCommunity._id);

      // Generate auth token
      this.authToken = jwt.sign(
        { id: this.testUser._id, username: this.testUser.username },
        TEST_CONFIG.JWT_SECRET,
        { expiresIn: '1h' }
      );
      console.log('✅ Auth token generated');

      return true;
    } catch (error) {
      console.error('❌ Setup failed:', error);
      return false;
    }
  }

  /**
   * Create test user
   */
  async createTestUser() {
    const user = new User({
      username: 'testuser_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      password: 'hashedpassword', // In real tests, use proper password hashing
      firstName: 'Test',
      lastName: 'User'
    });
    return await user.save();
  }

  /**
   * Create test community
   */
  async createTestCommunity() {
    const community = new Community({
      name: 'Test Community ' + Date.now(),
      description: 'A test community for chat system',
      location: {
        city: 'TestCity'
      },
      interest: 'Testing',
      ownerId: this.testUser._id,
      members: [this.testUser._id],
      memberCount: 1
    });
    return await community.save();
  }

  /**
   * Make HTTP request using Node.js built-in modules
   */
  makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(TEST_CONFIG.baseURL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              data: body ? JSON.parse(body) : null
            };
            resolve(response);
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * Test REST API endpoints
   */
  async testRESTAPI() {
    console.log('\n📡 Testing REST API endpoints...');

    // Test 1: Send message
    console.log('\n1️⃣ Testing POST /communities/:id/messages');
    try {
      const response = await this.makeRequest(
        'POST',
        `/communities/${this.testCommunity._id}/messages`,
        {
          text: 'Hello, this is a test message!',
          attachments: []
        }
      );
      
      if (response.status === 201) {
        console.log('✅ Message sent successfully:', response.data.data._id);
        this.testMessages.push(response.data.data);
      } else {
        console.error('❌ Failed to send message:', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error.message);
    }

    // Test 2: Get messages
    console.log('\n2️⃣ Testing GET /communities/:id/messages');
    try {
      const response = await this.makeRequest(
        'GET',
        `/communities/${this.testCommunity._id}/messages`
      );
      
      if (response.status === 200) {
        console.log('✅ Messages retrieved:', response.data.data.length, 'messages');
      } else {
        console.error('❌ Failed to get messages:', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to get messages:', error.message);
    }

    // Test 3: Mark message as read
    console.log('\n3️⃣ Testing POST /messages/:id/read');
    if (this.testMessages.length > 0) {
      try {
        const response = await this.makeRequest(
          'POST',
          `/messages/${this.testMessages[0]._id}/read`
        );
        
        if (response.status === 200) {
          console.log('✅ Message marked as read');
        } else {
          console.error('❌ Failed to mark message as read:', response.data);
        }
      } catch (error) {
        console.error('❌ Failed to mark message as read:', error.message);
      }
    }

    // Test 4: Get unread count
    console.log('\n4️⃣ Testing GET /communities/:id/unread');
    try {
      const response = await this.makeRequest(
        'GET',
        `/communities/${this.testCommunity._id}/unread`
      );
      
      if (response.status === 200) {
        console.log('✅ Unread count:', response.data.data.unreadCount);
      } else {
        console.error('❌ Failed to get unread count:', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to get unread count:', error.message);
    }

    // Test 5: Edit message
    console.log('\n5️⃣ Testing PATCH /messages/:id');
    if (this.testMessages.length > 0) {
      try {
        const response = await this.makeRequest(
          'PATCH',
          `/messages/${this.testMessages[0]._id}`,
          {
            text: 'This message has been edited!'
          }
        );
        
        if (response.status === 200) {
          console.log('✅ Message edited successfully');
        } else {
          console.error('❌ Failed to edit message:', response.data);
        }
      } catch (error) {
        console.error('❌ Failed to edit message:', error.message);
      }
    }

    // Test 6: Validation errors
    console.log('\n6️⃣ Testing validation errors');
    try {
      const response = await this.makeRequest(
        'POST',
        `/communities/${this.testCommunity._id}/messages`,
        {
          text: 'x'.repeat(6000) // Exceed max length
        }
      );
      
      if (response.status === 400) {
        console.log('✅ Validation working correctly:', response.data.errors?.[0]?.msg);
      } else {
        console.log('❌ Validation should have failed');
      }
    } catch (error) {
      console.error('❌ Validation test error:', error.message);
    }
  }

  /**
   * Test controller methods directly
   */
  async testControllers() {
    console.log('\n🎮 Testing controller methods directly...');
    
    // Mock request/response objects
    const mockReq = {
      user: { id: this.testUser._id, username: this.testUser.username },
      params: { communityId: this.testCommunity._id },
      body: { text: 'Controller test message', attachments: [] },
      query: {}
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Response ${code}:`, JSON.stringify(data, null, 2));
          return mockRes;
        }
      }),
      json: (data) => {
        console.log('📤 Response:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    };

    // Test sendMessage controller
    console.log('\n🎯 Testing chatController.sendMessage');
    try {
      await chatController.sendMessage(mockReq, mockRes);
      console.log('✅ Controller test completed');
    } catch (error) {
      console.error('❌ Controller test failed:', error.message);
    }

    // Test getUnreadCount controller
    console.log('\n🎯 Testing chatController.getUnreadCount');
    try {
      await chatController.getUnreadCount(mockReq, mockRes);
    } catch (error) {
      console.error('❌ Get unread count test failed:', error.message);
    }
  }

  /**
   * Test WebSocket functionality
   */
  async testWebSocket() {
    console.log('\n🔌 Testing WebSocket functionality...');
    
    const WebSocket = require('ws');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(`${TEST_CONFIG.wsURL}/chat`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      ws.on('open', () => {
        console.log('✅ WebSocket connected');

        // Test join community
        ws.send(JSON.stringify({
          event: 'join-community',
          data: this.testCommunity._id
        }));
        console.log('📨 Joined community room');

        // Test send message
        setTimeout(() => {
          ws.send(JSON.stringify({
            event: 'send-message',
            data: {
              communityId: this.testCommunity._id,
              text: 'WebSocket test message',
              attachments: []
            }
          }));
        }, 1000);

        // Test typing indicator
        setTimeout(() => {
          ws.send(JSON.stringify({
            event: 'typing',
            data: {
              communityId: this.testCommunity._id,
              isTyping: true
            }
          }));
        }, 2000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📨 WebSocket message received:', message);
        } catch (error) {
          console.log('📨 Raw WebSocket message:', data.toString());
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        resolve();
      });

      // Close after 5 seconds
      setTimeout(() => {
        ws.close();
      }, 5000);
    });
  }

  /**
   * Test database operations
   */
  async testDatabase() {
    console.log('\n💾 Testing database operations...');
    
    try {
      // Test Message model
      const message = new Message({
        communityId: this.testCommunity._id,
        senderId: this.testUser._id,
        text: 'Database test message',
        attachments: [],
        readBy: [this.testUser._id]
      });
      await message.save();
      console.log('✅ Message saved to database');

      // Test find operations
      const messages = await Message.find({ communityId: this.testCommunity._id });
      console.log(`✅ Found ${messages.length} messages in database`);

      // Test aggregation
      const stats = await Message.aggregate([
        { $match: { communityId: this.testCommunity._id } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 }
          }
        }
      ]);
      console.log('✅ Aggregation query successful:', stats[0]);

    } catch (error) {
      console.error('❌ Database test failed:', error.message);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      await Message.deleteMany({});
      await Community.deleteMany({});
      await User.deleteMany({});
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Chat System Tests\n');
    
    const setupSuccess = await this.setup();
    if (!setupSuccess) {
      console.log('❌ Setup failed, aborting tests');
      return;
    }

    try {
      await this.testControllers();
      await this.testRESTAPI();
      await this.testDatabase();
      await this.testWebSocket();
      
      console.log('\n🎉 All tests completed!');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
      await mongoose.connection.close();
      console.log('🔚 Test suite finished');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ChatSystemTester();
  tester.runAllTests();
}

module.exports = ChatSystemTester;