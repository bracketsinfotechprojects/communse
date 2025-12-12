/**
 * Simple test for the specific chat access endpoint that was failing
 * This directly tests the fix for the "Only event attendees can access chat information" error
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = 'http://localhost:5000';
const EVENT_ID = '693bb754eb012d2a43551197';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJpYXQiOjE3NjU1MjAwNjAsImV4cCI6MTc2ODExMjA2MH0.r2Mi4RT94DA-JtSjF8Q0zI2qyhpMdZSjQ3hulC7vdOw';

// Test the specific endpoints that were failing
async function testChatAccess() {
  console.log('🧪 Testing Event Chat Access Control Fix');
  console.log('=========================================\n');

  const endpoints = [
    {
      name: 'GET /api/events/:id/chat (Original Route)',
      url: `/api/events/${EVENT_ID}/chat`
    },
    {
      name: 'GET /api/events/:id/chat/room (Alternative Route)',
      url: `/api/events/${EVENT_ID}/chat/room`
    },
    {
      name: 'GET /api/chat/events/:eventId/chat/room (Chat Router)',
      url: `/api/chat/events/${EVENT_ID}/chat/room`
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`🔍 Testing: ${endpoint.name}`);
    
    try {
      const urlObj = new URL(endpoint.url, BASE_URL);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({
                status: res.statusCode,
                success: res.statusCode >= 200 && res.statusCode < 300,
                data: parsed,
                headers: res.headers
              });
            } catch (e) {
              resolve({
                status: res.statusCode,
                success: res.statusCode >= 200 && res.statusCode < 300,
                data: data,
                headers: res.headers
              });
            }
          });
        });

        req.on('error', reject);
        req.end();
      });

      if (result.success) {
        console.log(`✅ SUCCESS - Status: ${result.status}`);
        console.log('   Access granted! The fix is working.');
        if (result.data && typeof result.data === 'object') {
          console.log('   Response data:');
          console.log('   ' + JSON.stringify(result.data, null, 2).split('\n').slice(0, 3).join('\n   '));
        }
      } else {
        console.log(`❌ FAILED - Status: ${result.status}`);
        
        // Check if it's the specific error we were trying to fix
        if (result.data && typeof result.data === 'object') {
          if (result.data.message === 'Only event attendees can access chat information') {
            console.log('   ⚠️  STILL GETTING THE ORIGINAL ERROR!');
            console.log('   This suggests:');
            console.log('   1. The user is not actually attending the event');
            console.log('   2. The JWT token belongs to a different user');
            console.log('   3. There might be another issue');
          } else {
            console.log('   Different error: ' + result.data.message);
          }
        } else {
          console.log('   Error: ' + result.data);
        }
      }

    } catch (error) {
      console.log(`❌ CONNECTION ERROR - ${error.message}`);
      console.log('   This usually means:');
      console.log('   1. Server is not running on localhost:5000');
      console.log('   2. Network connectivity issues');
      console.log('   3. Server is running on HTTPS instead of HTTP');
    }
    
    console.log('');
  }

  console.log('📋 Summary:');
  console.log('   If you see "SUCCESS" responses above, the fix is working!');
  console.log('   If you see "connection error", start the server first:');
  console.log('   cd backend && npm start');
  console.log('');
  console.log('🔧 To test manually, you can run these curl commands:');
  console.log(`   curl -H "Authorization: Bearer ${JWT_TOKEN}" \\`);
  console.log(`        "${BASE_URL}/api/events/${EVENT_ID}/chat"`);
}

// Instructions
console.log(`
📋 Event Chat Access Test
========================

🔧 Configuration:
   Event ID: ${EVENT_ID}
   Base URL: ${BASE_URL}
   JWT Token: ${JWT_TOKEN.substring(0, 20)}...

🎯 Purpose:
   This test specifically verifies that the access control fix for
   "Only event attendees can access chat information" is working.

⚠️  Prerequisites:
   1. Server must be running on localhost:5000
   2. JWT token must be valid and not expired
   3. Event must exist and user must have access

🚀 TO RUN:
node test_chat_access.js
`);

// Run the test
testChatAccess().catch(console.error);

module.exports = { testChatAccess };