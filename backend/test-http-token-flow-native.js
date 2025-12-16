/**
 * Test Complete HTTP Token Flow (using native Node.js modules)
 * 
 * This script tests the complete flow:
 * 1. Make HTTP request to get token: GET /chat/token?userId=...&eventId=...
 * 2. Show how to use the token with signInWithCustomToken()
 */

const http = require('http');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const chatTokenService = require('./src/services/chatTokenService');

// Configuration
const TEST_USER_ID = '6937ca8a627f152384ac1884';
const TEST_EVENT_ID = '693bb754eb012d2a43551197';
const BACKEND_URL = 'http://localhost:5000';

/**
 * Make HTTP request using native Node.js modules
 */
function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-auth-token', // Add auth header as expected by backend
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          };
          resolve(response);
        } catch (error) {
          reject(new Error('Failed to parse response: ' + error.message));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Test getting token via HTTP API
 */
async function testHttpTokenGeneration() {
  console.log('🌐 Testing HTTP Token Generation');
  console.log('='.repeat(50));
  
  try {
    const url = `${BACKEND_URL}/chat/token?userId=${TEST_USER_ID}&eventId=${TEST_EVENT_ID}`;
    console.log('1️⃣ Making HTTP Request to Backend API');
    console.log('URL:', url);
    
    const response = await makeHttpRequest(url);
    
    if (response.status === 200) {
      const tokenData = response.data;
      console.log('✅ HTTP Response Received:');
      console.log('Status:', response.status);
      console.log('Success:', tokenData.success);
      console.log('Token Length:', tokenData.token.length);
      console.log('Token Preview:', tokenData.token.substring(0, 50) + '...');
      
      console.log('\n📋 Token Claims from API:');
      console.log('Event ID:', tokenData.claims?.eventId);
      console.log('Role:', tokenData.claims?.role);
      console.log('User ID:', tokenData.claims?.userId);
      console.log('Community ID:', tokenData.claims?.communityId);
      
      return tokenData;
    } else {
      console.log('❌ HTTP Error:', response.status);
      console.log('Response:', response.data);
      return null;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server not running on localhost:5000');
      console.log('Please start the backend server first:');
      console.log('  cd backend && npm start');
      return null;
    } else {
      console.log('❌ Request Error:', error.message);
      return null;
    }
  }
}

/**
 * Show how to use the token in frontend signInWithCustomToken
 */
function showFrontendUsage(tokenData) {
  console.log('\n2️⃣ Frontend Usage with signInWithCustomToken');
  console.log('-'.repeat(50));
  
  console.log('📱 Angular/React Code Example:');
  console.log('```typescript');
  console.log('// 1. Get token from backend API');
  console.log('const response = await fetch(');
  console.log(`  '${BACKEND_URL}/chat/token?userId=${TEST_USER_ID}&eventId=${TEST_EVENT_ID}',`);
  console.log('  {');
  console.log('    headers: {');
  console.log('      "Authorization": "Bearer YOUR_AUTH_TOKEN"');
  console.log('    }');
  console.log('  }');
  console.log(');');
  console.log('const tokenData = await response.json();');
  console.log('');
  console.log('// 2. Use token with Firebase signInWithCustomToken');
  console.log('import { signInWithCustomToken } from "firebase/auth";');
  console.log('');
  console.log('try {');
  console.log('  const userCredential = await signInWithCustomToken(');
  console.log('    auth,');
  console.log(`    "${tokenData.token.substring(0, 30)}..."`);
  console.log('  );');
  console.log('  ');
  console.log('  console.log("User authenticated:", userCredential.user.uid);');
  console.log('  console.log("Custom claims available in user");');
  console.log('  ');
  console.log('  // 3. Use authenticated session for Firebase operations');
  console.log('  // Messages will now work with proper authentication');
  console.log('  subscribeToMessages(eventId);');
  console.log('  ');
  console.log('} catch (error) {');
  console.log('  console.error("Firebase auth failed:", error);');
  console.log('}');
  console.log('```');
  
  console.log('\n🔄 Token Exchange Process:');
  console.log('1. Frontend makes HTTP request to backend');
  console.log('2. Backend validates user and generates Firebase custom token');
  console.log('3. Backend returns: { success, token, claims }');
  console.log('4. Frontend calls signInWithCustomToken(auth, token)');
  console.log('5. Firebase automatically exchanges custom token for ID token');
  console.log('6. User session established with custom claims');
  
  console.log('\n📊 Expected Token Structure:');
  console.log('Backend Response:');
  console.log(JSON.stringify({
    success: true,
    token: tokenData.token.substring(0, 50) + '...',
    claims: tokenData.claims
  }, null, 2));
  
  console.log('\nFirebase ID Token (after signInWithCustomToken):');
  console.log(JSON.stringify({
    iss: "firebase-adminsdk-fbsvc@tempcomm-35dff.iam.gserviceaccount.com",
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    sub: TEST_USER_ID,
    user_id: TEST_USER_ID,
    eventId: tokenData.claims?.eventId,
    role: tokenData.claims?.role,
    userId: tokenData.claims?.userId,
    communityId: tokenData.claims?.communityId,
    iat: "<timestamp>",
    exp: "<timestamp>"
  }, null, 2));
}

/**
 * Test backend token generation directly (fallback)
 */
async function testDirectTokenGeneration() {
  console.log('\n3️⃣ Direct Token Generation (Backend Service)');
  console.log('-'.repeat(50));
  
  try {
    const customToken = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
    const decodedClaims = await chatTokenService.verifyCustomToken(customToken);
    
    console.log('✅ Direct Token Generated:');
    console.log('Token Preview:', customToken.substring(0, 50) + '...');
    console.log('\n📋 Claims:');
    console.log('Event ID:', decodedClaims.claims?.eventId);
    console.log('Role:', decodedClaims.claims?.role);
    console.log('User ID:', decodedClaims.claims?.userId);
    console.log('Community ID:', decodedClaims.claims?.communityId);
    
    return {
      token: customToken,
      claims: decodedClaims.claims,
      method: 'direct'
    };
    
  } catch (error) {
    console.error('❌ Direct token generation failed:', error.message);
    return null;
  }
}

/**
 * Show curl command for manual testing
 */
function showCurlCommand() {
  console.log('\n🔧 Manual Testing with curl:');
  console.log('='.repeat(50));
  console.log('curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\');
  console.log(`  "${BACKEND_URL}/chat/token?userId=${TEST_USER_ID}&eventId=${TEST_EVENT_ID}"`);
  console.log('');
  console.log('Expected Response:');
  console.log(JSON.stringify({
    success: true,
    token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    claims: {
      eventId: TEST_EVENT_ID,
      role: "admin",
      userId: TEST_USER_ID,
      communityId: "<community_id>"
    }
  }, null, 2));
}

/**
 * Show complete flow summary
 */
function showFlowSummary(httpTokenData, directTokenData) {
  console.log('\n🎯 Complete Token Flow Summary');
  console.log('='.repeat(50));
  
  console.log('✅ PRODUCTION FLOW (HTTP API):');
  if (httpTokenData) {
    console.log('   1. Frontend → GET /chat/token?userId=&eventId=');
    console.log('   2. Backend → Validate user + generate Firebase custom token');
    console.log('   3. Backend → Return { success, token, claims }');
    console.log('   4. Frontend → signInWithCustomToken(auth, token)');
    console.log('   5. Firebase → Exchange custom token for ID token');
    console.log('   6. User → Authenticated with custom claims');
  } else {
    console.log('   ❌ Backend server not available (start with: cd backend && npm start)');
  }
  
  console.log('\n🔧 DEVELOPMENT FLOW (Direct Service):');
  if (directTokenData) {
    console.log('   1. Direct service call → generateChatToken()');
    console.log('   2. Same Firebase custom token generation');
    console.log('   3. Same signInWithCustomToken() usage');
  }
  
  console.log('\n📝 Key Points:');
  console.log('• Backend generates Firebase custom tokens using Admin SDK');
  console.log('• Frontend exchanges custom tokens with signInWithCustomToken()');
  console.log('• Firebase automatically creates ID tokens with custom claims');
  console.log('• Custom claims (eventId, role, userId, communityId) available for authorization');
  console.log('• Authenticated users can access Firebase Realtime Database');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Start backend server: cd backend && npm start');
  showCurlCommand();
  console.log('3. Use token in frontend: signInWithCustomToken(auth, token)');
  console.log('4. Access Firebase Realtime Database with authenticated session');
}

// Main execution
async function main() {
  console.log('🚀 Complete HTTP Token Flow Test (Native Node.js)\n');
  
  // Load environment variables
  require('dotenv').config();
  
  console.log('Test Configuration:');
  console.log('User ID:', TEST_USER_ID);
  console.log('Event ID:', TEST_EVENT_ID);
  console.log('Backend URL:', BACKEND_URL);
  console.log('');
  
  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/community_app');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return;
  }
  
  // Test HTTP token generation
  const httpTokenData = await testHttpTokenGeneration();
  
  // Test direct token generation as fallback
  const directTokenData = await testDirectTokenGeneration();
  
  // Show frontend usage
  if (httpTokenData) {
    showFrontendUsage(httpTokenData);
  } else if (directTokenData) {
    console.log('\n⚠️ Using direct token generation as HTTP API is not available');
    showFrontendUsage(directTokenData);
  }
  
  // Show complete flow summary
  showFlowSummary(httpTokenData, directTokenData);
  
  // Close database connection
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testHttpTokenGeneration, testDirectTokenGeneration, showFrontendUsage };