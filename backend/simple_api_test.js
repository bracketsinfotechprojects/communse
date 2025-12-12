/**
 * Simple Event and Chat API Test using Node.js built-in modules
 * Tests all event and chat related endpoints with provided credentials
 */

const https = require('https');
const { URL } = require('url');

// Configuration with provided credentials
const BASE_URL = 'http://localhost:5000';
const EVENT_ID = '693bb754eb012d2a43551197';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjU1MjAwNjAsImV4cCI6MTc2ODExMjA2MH0.r2Mi4RT94DA-JtSjF8Q0zI2qyhpMdZSjQ3hulC7vdOw';
const ROOM_ID = 'room_1765521236401_hbyfwtdbw';

// Helper function to make HTTP requests
function makeRequest(method, url, data = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url, BASE_URL);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js API Test'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: parsedData,
            status: res.statusCode,
            rawData: responseData
          });
        } catch (e) {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: responseData,
            status: res.statusCode,
            rawData: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        status: 0
      });
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testEndpoint(name, method, url, data = null) {
  console.log(`🔍 Testing: ${name}`);
  
  const result = await makeRequest(method, url, data);
  
  if (result.success) {
    console.log(`✅ PASSED - Status: ${result.status}`);
    if (result.data && typeof result.data === 'object' && result.data.success !== undefined) {
      console.log(`   Response: ${JSON.stringify(result.data, null, 2).split('\n')[0]}...`);
    }
    return { passed: true, failed: false };
  } else {
    console.log(`❌ FAILED - Status: ${result.status}`);
    console.log(`   Error: ${JSON.stringify(result.error || result.data)}`);
    return { passed: false, failed: true };
  }
}

async function runTests() {
  console.log('🚀 STARTING COMPREHENSIVE API TEST SUITE\n');
  console.log('=' .repeat(80));
  console.log(`📋 Test Configuration:`);
  console.log(`   Event ID: ${EVENT_ID}`);
  console.log(`   Room ID: ${ROOM_ID}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log('=' .repeat(80));

  let totalPassed = 0;
  let totalFailed = 0;

  // Event Routes Tests
  console.log('\n📅 TESTING EVENT ROUTES...\n');
  
  const eventTests = [
    ['GET /api/events/:id (Get Event by ID)', 'GET', `/api/events/${EVENT_ID}`],
    ['GET /api/events/:id/chat (Get Event Chat Info - ORIGINAL)', 'GET', `/api/events/${EVENT_ID}/chat`],
    ['GET /api/events/:id/chat/room (Get Event Chat Room - ALT)', 'GET', `/api/events/${EVENT_ID}/chat/room`],
    ['GET /api/users/events (Get User Events)', 'GET', '/api/users/events'],
    ['GET /api/users/events/stats (Get User Event Stats)', 'GET', '/api/users/events/stats'],
    ['GET /api/events/categories (Get Event Categories)', 'GET', '/api/events/categories']
  ];

  for (const [name, method, url] of eventTests) {
    const result = await testEndpoint(name, method, url);
    totalPassed += result.passed ? 1 : 0;
    totalFailed += result.failed ? 1 : 0;
    console.log('');
  }

  // Chat Routes Tests
  console.log('💬 TESTING CHAT ROUTES...\n');
  
  const chatTests = [
    ['GET /api/chat/rooms/user (Get User Chat Rooms)', 'GET', '/api/chat/rooms/user'],
    [`GET /api/chat/rooms/:roomId (Get Chat Room Details)`, 'GET', `/api/chat/rooms/${ROOM_ID}`],
    [`GET /api/chat/rooms/:roomId/messages (Get Chat Messages)`, 'GET', `/api/chat/rooms/${ROOM_ID}/messages?limit=10`],
    ['GET /api/chat/events/:eventId/chat/room (Chat Router - Event Room)', 'GET', `/api/chat/events/${EVENT_ID}/chat/room`],
    ['GET /api/chat/events/:eventId/chat/messages (Chat Router - Messages)', 'GET', `/api/chat/events/${EVENT_ID}/chat/messages?limit=10`],
    ['GET /api/chat/users/events (Get User Event Chats)', 'GET', '/api/chat/users/events']
  ];

  for (const [name, method, url] of chatTests) {
    const result = await testEndpoint(name, method, url);
    totalPassed += result.passed ? 1 : 0;
    totalFailed += result.failed ? 1 : 0;
    console.log('');
  }

  // Message Operations Tests
  console.log('📨 TESTING MESSAGE OPERATIONS...\n');
  
  const messageTests = [
    ['POST /api/chat/events/:eventId/chat/messages (Send Event Message)', 'POST', `/api/chat/events/${EVENT_ID}/chat/messages`, {
      content: 'Test event message from comprehensive API test',
      messageType: 'text'
    }]
  ];

  for (const [name, method, url, data] of messageTests) {
    const result = await testEndpoint(name, method, url, data);
    totalPassed += result.passed ? 1 : 0;
    totalFailed += result.failed ? 1 : 0;
    console.log('');
  }

  // Final Summary
  console.log('=' .repeat(80));
  console.log('🎯 FINAL TEST SUMMARY:');
  console.log(`📊 Total Tests: ${totalPassed + totalFailed}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  const successRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Event chat functionality is working correctly.');
  } else if (totalPassed > totalFailed) {
    console.log('\n✅ MOSTLY SUCCESSFUL - Core functionality is working with some expected failures.');
  } else {
    console.log('\n⚠️ MULTIPLE FAILURES - Please check the errors above and investigate.');
  }

  console.log('\n📋 Notes:');
  console.log('   - Some failures might be expected if user is not attending the event');
  console.log('   - JWT token expiration could cause authentication failures');
  console.log('   - Event might not exist or be in the expected state');
  
  return { totalPassed, totalFailed, successRate };
}

// Instructions and auto-run
console.log(`
📋 Simple Event and Chat API Test Suite
=======================================

🔧 Configuration:
   Event ID: ${EVENT_ID}
   Room ID: ${ROOM_ID}
   Base URL: ${BASE_URL}

📝 This test covers:
   ✅ Event routes (retrieval, chat access)
   ✅ Chat routes (room management, messaging)
   ✅ Message operations

⚠️  Make sure:
   1. The server is running on localhost:5000
   2. The JWT token is valid and not expired
   3. The event exists and the user has access to it

🚀 TO RUN:
node simple_api_test.js
`);

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };