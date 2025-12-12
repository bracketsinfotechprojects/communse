/**
 * CORRECTED Chat Routes Test Script
 * Tests the ACTUAL working endpoints based on route analysis
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const EVENT_ID = '693bb754eb012d2a43551197'; // Replace with actual event ID
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjU1MjAwNjAsImV4cCI6MTc2ODExMjA2MH0.r2Mi4RT94DA-JtSjF8Q0zI2qyhpMdZSjQ3hulC7vdOw'; // Use the token from debugging file

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

// Test the CORRECT routes (not the ones that don't exist)
async function testCorrectRoutes() {
  console.log('🧪 Testing CORRECT Chat Routes...\n');
  console.log('📋 ROUTE CONFLICTS IDENTIFIED:');
  console.log('   • Event chat routes exist in BOTH events.js AND chat.js');
  console.log('   • This creates confusion about which endpoints work');
  console.log('   • Solution: Remove duplicates from chat.js, keep only in events.js\n');

  const tests = [
    {
      name: '✅ GET /api/events/:id/chat (Defined in events.js)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat`
    },
    {
      name: '✅ GET /api/events/:id/chat/room (Defined in events.js)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat/room`
    },
    {
      name: '✅ GET /api/chat/rooms/user (Defined in chat.js)',
      method: 'GET',
      url: `/api/chat/rooms/user`
    },
    {
      name: '✅ GET /api/chat/users/events (Defined in chat.js)',
      method: 'GET',
      url: `/api/chat/users/events`
    },
    {
      name: '❌ GET /api/chat/events/:id/chat/room (DOES NOT EXIST)',
      method: 'GET',
      url: `/api/chat/events/${EVENT_ID}/chat/room`
    },
    {
      name: '❌ GET /api/events/:id/chat/messages (DOES NOT EXIST in events.js)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat/messages?limit=10`
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

// Test specific message endpoints
async function testMessageRoutes() {
  console.log('\n🧪 Testing Message Routes...\n');

  const tests = [
    {
      name: 'Testing /api/events/:id/chat/messages (should fail - not in events.js)',
      method: 'GET',
      url: `/api/events/${EVENT_ID}/chat/messages?limit=10`
    },
    {
      name: 'Testing /api/events/:id/chat/messages (should fail - not in events.js)',
      method: 'POST',
      url: `/api/events/${EVENT_ID}/chat/messages`,
      data: { content: 'test message' }
    }
  ];

  for (const test of tests) {
    console.log(`🔍 Testing: ${test.name}`);
    
    const result = await makeRequest(test.method, test.url, test.data);
    
    if (result.success) {
      console.log(`✅ PASSED - Status: ${result.status}`);
    } else {
      console.log(`❌ FAILED - Status: ${result.status}`);
      console.log(`   Error: ${JSON.stringify(result.error)}`);
    }
    console.log('');
  }
}

// Provide the fix instructions
function printFixInstructions() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 ROUTE CONFLICT FIX INSTRUCTIONS');
  console.log('='.repeat(80));
  
  console.log('\n📋 PROBLEM:');
  console.log('   Event chat routes are defined in BOTH:');
  console.log('   1. events.js -> /api/events/:id/chat*');
  console.log('   2. chat.js -> /api/events/:eventId/chat*');
  console.log('   This creates "route not found" errors due to conflicts.');
  
  console.log('\n🛠️ SOLUTION:');
  console.log('   1. REMOVE these lines from backend/src/routes/chat.js:');
  console.log('      - Line ~519: router.get(\'/events/:eventId/chat/room\', ...)');
  console.log('      - Line ~590: router.get(\'/events/:eventId/chat/messages\', ...)');
  console.log('      - Line ~667: router.post(\'/events/:eventId/chat/messages\', ...)');
  console.log('      - Line ~723: router.post(\'/events/:eventId/chat/join\', ...)');
  console.log('      - Line ~764: router.post(\'/events/:eventId/chat/leave\', ...)');
  
  console.log('\n   2. KEEP only in backend/src/routes/events.js:');
  console.log('      - GET /api/events/:id/chat');
  console.log('      - GET /api/events/:id/chat/room');
  console.log('      - Add missing routes: /chat/messages, /chat/join, /chat/leave');
  
  console.log('\n   3. RESTART the server after making changes');
  
  console.log('\n📡 WORKING ENDPOINTS (after fix):');
  console.log('   • GET /api/events/:id/chat');
  console.log('   • GET /api/events/:id/chat/room');
  console.log('   • GET /api/chat/rooms/user');
  console.log('   • GET /api/chat/users/events');
  console.log('   • GET/POST /api/chat/rooms/:roomId/messages');
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Corrected Chat Routes Verification\n');
  console.log('='.repeat(80));
  
  // Test correct routes
  const routeResults = await testCorrectRoutes();
  
  // Test message routes
  await testMessageRoutes();
  
  // Print fix instructions
  printFixInstructions();
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 FINAL SUMMARY:');
  console.log(`📡 Route Tests: ${routeResults.passed}/${routeResults.total} passed`);
  
  if (routeResults.failed > 0) {
    console.log('\n⚠️ Some tests failed due to route conflicts.');
    console.log('📝 Apply the fix instructions above to resolve the issues.');
  } else {
    console.log('\n🎉 All tests passed! Chat routes are working correctly.');
  }
}

// Instructions for usage
console.log(`
📋 CORRECTED Chat Routes Verification Script
=============================================

🔍 This script tests the ACTUAL working routes and identifies conflicts.

⚠️  BEFORE RUNNING:
1. Ensure the server is running on localhost:5000
2. Update EVENT_ID with a valid event ID if needed
3. JWT_TOKEN should work with the debugging file token

🔧 TO RUN:
node backend/CHAT_ROUTES_FIXED_TEST.js

📝 This script will:
- Test the correct working endpoints
- Identify route conflicts
- Provide fix instructions
`);

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };