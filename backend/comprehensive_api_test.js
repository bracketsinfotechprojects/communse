/**
 * Comprehensive Event and Chat API Test
 * Tests all event and chat related endpoints with provided credentials
 */

const axios = require('axios');

// Configuration with provided credentials
const BASE_URL = 'http://localhost:5000';
const EVENT_ID = '693bb754eb012d2a43551197';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjU1MjAwNjAsImV4cCI6MTc2ODExMjA2MH0.r2Mi4RT94DA-JtSjF8Q0zI2qyhpMdZSjQ3hulC7vdOw';
const ROOM_ID = 'room_1765521236401_hbyfwtdbw';

// Helper function to make authenticated requests
async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions for different categories
async function testEventRoutes() {
  console.log('\n📅 TESTING EVENT ROUTES...\n');

  const eventTests = [
    {
      name: 'GET /api/events/:id (Get Event by ID)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}`
    },
    {
      name: 'GET /api/events/:id/chat (Get Event Chat Info - ORIGINAL)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat`
    },
    {
      name: 'GET /api/events/:id/chat/room (Get Event Chat Room - ALT)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat/room`
    },
    {
      name: 'POST /api/events/:id/join (Join Event)',
      method: 'POST',
      url: `/api/events/${EVENT_ID}/join`
    },
    {
      name: 'POST /api/events/:id/leave (Leave Event)',
      method: 'POST',
      url: `/api/events/${EVENT_ID}/leave`
    },
    {
      name: 'GET /api/users/events (Get User Events)',
      method: 'GET',
      url: '/api/users/events'
    },
    {
      name: 'GET /api/users/events/stats (Get User Event Stats)',
      method: 'GET',
      url: '/api/users/events/stats'
    },
    {
      name: 'GET /api/events/categories (Get Event Categories)',
      method: 'GET',
      url: '/api/events/categories'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of eventTests) {
    console.log(`🔍 Testing: ${test.name}`);
    
    const result = await makeRequest(test.method, test.url, test.data);
    
    if (result.success) {
      console.log(`✅ PASSED - Status: ${result.status}`);
      if (result.data.success !== undefined) {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2).split('\n')[0]}...`);
      }
      passed++;
    } else {
      console.log(`❌ FAILED - Status: ${result.status}`);
      console.log(`   Error: ${JSON.stringify(result.error)}`);
      failed++;
    }
    console.log('');
  }

  return { passed, failed, total: passed + failed };
}

async function testChatRoutes() {
  console.log('\n💬 TESTING CHAT ROUTES...\n');

  const chatTests = [
    {
      name: 'GET /api/chat/rooms/user (Get User Chat Rooms)',
      method: 'GET',
      url: '/api/chat/rooms/user'
    },
    {
      name: 'GET /api/chat/rooms/:roomId (Get Chat Room Details)',
      method: 'GET',
      url: `/api/chat/rooms/${ROOM_ID}`
    },
    {
      name: 'GET /api/chat/rooms/:roomId/messages (Get Chat Messages)',
      method: 'GET',
      url: `/api/chat/rooms/${ROOM_ID}/messages?limit=10`
    },
    {
      name: 'GET /api/chat/events/:eventId/chat/room (Chat Router - Event Room)',
      method: 'GET',
      url: `/api/chat/events/${EVENT_ID}/chat/room`
    },
    {
      name: 'GET /api/chat/events/:eventId/chat/messages (Chat Router - Messages)',
      method: 'GET',
      url: `/api/chat/events/${EVENT_ID}/chat/messages?limit=10`
    },
    {
      name: 'POST /api/chat/events/:eventId/chat/join (Chat Router - Join)',
      method: 'POST',
      url: `/api/chat/events/${EVENT_ID}/chat/join`
    },
    {
      name: 'POST /api/chat/events/:eventId/chat/leave (Chat Router - Leave)',
      method: 'POST',
      url: `/api/chat/events/${EVENT_ID}/chat/leave`
    },
    {
      name: 'GET /api/chat/users/events (Get User Event Chats)',
      method: 'GET',
      url: '/api/chat/users/events'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of chatTests) {
    console.log(`🔍 Testing: ${test.name}`);
    
    const result = await makeRequest(test.method, test.url, test.data);
    
    if (result.success) {
      console.log(`✅ PASSED - Status: ${result.status}`);
      if (result.data.success !== undefined) {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2).split('\n')[0]}...`);
      }
      passed++;
    } else {
      console.log(`❌ FAILED - Status: ${result.status}`);
      console.log(`   Error: ${JSON.stringify(result.error)}`);
      failed++;
    }
    console.log('');
  }

  return { passed, failed, total: passed + failed };
}

async function testMessageOperations() {
  console.log('\n📨 TESTING MESSAGE OPERATIONS...\n');

  // First, let's try to send a test message
  const messageTests = [
    {
      name: 'POST /api/chat/rooms/:roomId/messages (Send Message)',
      method: 'POST',
      url: `/api/chat/rooms/${ROOM_ID}/messages`,
      data: {
        content: 'Test message from comprehensive API test',
        messageType: 'text'
      }
    },
    {
      name: 'POST /api/chat/events/:eventId/chat/messages (Send Event Message)',
      method: 'POST',
      url: `/api/chat/events/${EVENT_ID}/chat/messages`,
      data: {
        content: 'Test event message from comprehensive API test',
        messageType: 'text'
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of messageTests) {
    console.log(`🔍 Testing: ${test.name}`);
    
    const result = await makeRequest(test.method, test.url, test.data);
    
    if (result.success) {
      console.log(`✅ PASSED - Status: ${result.status}`);
      if (result.data.success !== undefined) {
        console.log(`   Response: ${JSON.stringify(result.data, null, 2).split('\n')[0]}...`);
      }
      passed++;
    } else {
      console.log(`❌ FAILED - Status: ${result.status}`);
      console.log(`   Error: ${JSON.stringify(result.error)}`);
      failed++;
    }
    console.log('');
  }

  return { passed, failed, total: passed + failed };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE API TEST SUITE\n');
  console.log('=' .repeat(80));
  console.log(`📋 Test Configuration:`);
  console.log(`   Event ID: ${EVENT_ID}`);
  console.log(`   Room ID: ${ROOM_ID}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log('=' .repeat(80));
  
  // Test all categories
  const eventResults = await testEventRoutes();
  const chatResults = await testChatRoutes();
  const messageResults = await testMessageOperations();
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 FINAL TEST SUMMARY:');
  console.log(`📅 Event Routes: ${eventResults.passed}/${eventResults.total} passed`);
  console.log(`💬 Chat Routes: ${chatResults.passed}/${chatResults.total} passed`);
  console.log(`📨 Message Operations: ${messageResults.passed}/${messageResults.total} passed`);
  
  const totalPassed = eventResults.passed + chatResults.passed + messageResults.passed;
  const totalTests = eventResults.total + chatResults.total + messageResults.total;
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
  
  console.log(`📊 Overall Success Rate: ${successRate}%`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Event chat functionality is working correctly.');
  } else if (totalPassed > totalTests * 0.7) {
    console.log('\n✅ MOSTLY SUCCESSFUL - Core functionality is working with some expected failures.');
  } else {
    console.log('\n⚠️ MULTIPLE FAILURES - Please check the errors above and investigate.');
  }
  
  return { 
    eventResults, 
    chatResults, 
    messageResults, 
    totalPassed, 
    totalTests, 
    successRate 
  };
}

// Instructions and auto-run
console.log(`
📋 Comprehensive Event and Chat API Test Suite
==============================================

🔧 Configuration:
   Event ID: ${EVENT_ID}
   Room ID: ${ROOM_ID}
   Base URL: ${BASE_URL}

📝 This test suite covers:
   ✅ Event routes (CRUD operations, chat access)
   ✅ Chat routes (room management, messaging)
   ✅ Message operations (sending, receiving)

⚠️  Make sure:
   1. The server is running on localhost:5000
   2. The JWT token is valid and not expired
   3. The event exists and the user has access to it

🚀 TO RUN:
node comprehensive_api_test.js
`);

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, makeRequest };