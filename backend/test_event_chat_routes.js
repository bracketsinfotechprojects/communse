/**
 * Event Chat Routes Verification Script
 * Tests all event chat related routes to ensure they are working
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const EVENT_ID = '693bb754eb012d2a43551197'; // Replace with actual event ID
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjU1MjAwNjAsImV4cCI6MTc2ODExMjA2MH0.r2Mi4RT94DA-JtSjF8Q0zI2qyhpMdZSjQ3hulC7vdOw'; // Replace with actual JWT token

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

// Test functions for each route
async function testEventChatRoomRoutes() {
  console.log('🧪 Testing Event Chat Room Routes...\n');

  const tests = [
    {
      name: 'GET /api/events/:id/chat (Original Route)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat`
    },
    {
      name: 'GET /api/events/:id/chat/room (NEW Route - User Requested)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat/room`
    },
    {
      name: 'GET /api/chat/events/:eventId/chat/room (Chat Router)',
      method: 'GET',
      url: `/api/chat/events/${EVENT_ID}/chat/room`
    },
    {
      name: 'GET /api/chat/events/:eventId/chat/messages',
      method: 'GET',
      url: `/api/chat/events/${EVENT_ID}/chat/messages?limit=10`
    },
    {
      name: 'POST /api/chat/events/:eventId/chat/join',
      method: 'POST',
      url: `/api/chat/events/${EVENT_ID}/chat/join`
    },
    {
      name: 'POST /api/chat/events/:eventId/chat/leave',
      method: 'POST',
      url: `/api/chat/events/${EVENT_ID}/chat/leave`
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
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

  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  return { passed, failed, total: passed + failed };
}

// Test event creation with automatic chat room
async function testEventCreationWithChat() {
  console.log('\n🧪 Testing Event Creation with Automatic Chat Room...\n');

  const eventData = {
    title: 'Test Event for Chat Verification',
    description: 'This event should automatically create a chat room',
    communityId: 'VALID_COMMUNITY_ID', // Replace with actual community ID
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
    location: {
      city: 'Mumbai'
    },
    category: 'social',
    maxAttendees: 20
  };

  console.log('📝 Creating event...');
  const result = await makeRequest('POST', '/api/events', eventData);
  
  if (result.success && result.data.success) {
    const event = result.data.data;
    console.log('✅ Event created successfully');
    console.log(`   Event ID: ${event._id}`);
    console.log(`   Chat Room Created: ${event.chatRoomCreated || 'false'}`);
    console.log(`   Chat Room ID: ${event.chatRoomId || 'N/A'}`);
    
    // Test accessing the chat room
    if (event.chatRoomCreated && event.chatRoomId) {
      console.log('\n🔍 Testing chat room access...');
      const chatResult = await makeRequest('GET', `/api/events/${event._id}/chat/room`);
      
      if (chatResult.success) {
        console.log('✅ Chat room accessible');
      } else {
        console.log('❌ Chat room not accessible');
        console.log(`   Error: ${JSON.stringify(chatResult.error)}`);
      }
    }
    
    return true;
  } else {
    console.log('❌ Event creation failed');
    console.log(`   Error: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Event Chat Routes Verification\n');
  console.log('=' .repeat(60));
  
  // Test routes
  const routeResults = await testEventChatRoomRoutes();
  
  // Test event creation
  const eventCreationSuccess = await testEventCreationWithChat();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 FINAL SUMMARY:');
  console.log(`📡 Route Tests: ${routeResults.passed}/${routeResults.total} passed`);
  console.log(`📝 Event Creation: ${eventCreationSuccess ? '✅ Success' : '❌ Failed'}`);
  
  if (routeResults.failed === 0 && eventCreationSuccess) {
    console.log('\n🎉 ALL TESTS PASSED! Event chat functionality is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
}

// Instructions for usage
console.log(`
📋 Event Chat Routes Verification Script
========================================

⚠️  BEFORE RUNNING:
1. Replace EVENT_ID with a valid event ID from your database
2. Replace JWT_TOKEN with a valid JWT token
3. Replace VALID_COMMUNITY_ID with a valid community ID
4. Ensure the server is running on localhost:5000

🔧 TO RUN:
node test_event_chat_routes.js

📝 This script will test:
- All event chat related routes
- Event creation with automatic chat room
- Chat room accessibility
`);

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };