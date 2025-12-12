/**
 * Test script to verify event chat access control fix
 * This tests that the type conversion issue has been resolved
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const EVENT_ID = '693bb754eb012d2a43551197'; // Replace with actual event ID
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual JWT token

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

async function testEventChatAccess() {
  console.log('🧪 Testing Event Chat Access Control Fix...\n');

  // Test the original route that was failing
  console.log('🔍 Testing: GET /api/events/:id/chat');
  const result = await makeRequest('GET', `/api/events/${EVENT_ID}/chat`);
  
  if (result.success) {
    console.log('✅ SUCCESS - Chat access granted');
    console.log('   Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ FAILED - Chat access denied');
    console.log('   Status:', result.status);
    console.log('   Error:', JSON.stringify(result.error, null, 2));
    
    // Check if it's still the old error message
    if (result.error?.message === 'Only event attendees can access chat information') {
      console.log('\n⚠️  WARNING: Still getting the access control error.');
      console.log('   This might be because:');
      console.log('   1. The user is not actually attending the event');
      console.log('   2. The JWT token is invalid or expired');
      console.log('   3. The event ID is incorrect');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Configuration Reminder:');
  console.log('   - Replace EVENT_ID with a valid event ID from your database');
  console.log('   - Replace JWT_TOKEN with a valid JWT token');
  console.log('   - Ensure the user associated with the JWT token is attending the event');
  console.log('   - Make sure the server is running on localhost:5000');
}

console.log(`
📋 Event Chat Access Control Fix Test
=====================================

This test verifies that the type conversion issue in event chat access control has been fixed.

🔧 THE FIX:
   - Changed: event.createdBy._id.toString() === userId
   - To: event.createdBy._id.toString() === userId.toString()
   - This ensures both sides of the comparison are strings

⚠️  BEFORE RUNNING:
1. Replace EVENT_ID with a valid event ID from your database
2. Replace JWT_TOKEN with a valid JWT token for a user who is attending that event
3. Ensure the server is running on localhost:5000

🚀 TO RUN:
node test_event_chat_access_fix.js
`);

// Run the test if this file is executed directly
if (require.main === module) {
  testEventChatAccess().catch(console.error);
}

module.exports = { testEventChatAccess, makeRequest };