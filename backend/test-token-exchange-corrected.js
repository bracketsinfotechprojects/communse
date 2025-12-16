/**
 * Test Firebase Token Exchange Process
 * 
 * This script demonstrates the complete flow:
 * 1. Generate custom token (backend)
 * 2. Exchange for ID token (frontend process)
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const chatTokenService = require('./src/services/chatTokenService');

// Configuration
const TEST_USER_ID = '6937ca8a627f152384ac1884';
const TEST_EVENT_ID = '693bb754eb012d2a43551197';

async function testTokenExchangeFlow() {
  console.log('🔥 Testing Firebase Token Exchange Flow\n');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Generate custom token (Backend Process)
    console.log('1️⃣ BACKEND: Generating Custom Token');
    console.log('-'.repeat(40));
    
    const customToken = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
    console.log('✅ Custom Token Generated:');
    console.log('   Length:', customToken.length, 'characters');
    console.log('   Preview:', customToken.substring(0, 50) + '...');
    
    // Decode the custom token to show claims
    const decodedCustom = await chatTokenService.verifyCustomToken(customToken);
    console.log('📋 Custom Token Claims:');
    console.log('   Event ID:', decodedCustom.claims?.eventId || 'undefined');
    console.log('   Role:', decodedCustom.claims?.role || 'undefined');
    console.log('   User ID:', decodedCustom.claims?.userId || 'undefined');
    console.log('   Community ID:', decodedCustom.claims?.communityId || 'undefined');
    
    console.log('\n2️⃣ FRONTEND: Token Exchange Process');
    console.log('-'.repeat(40));
    
    console.log('📱 Frontend Process (simulated):');
    console.log('   1. GET /chat/token → Receives custom token');
    console.log('   2. signInWithCustomToken(auth, customToken)');
    console.log('   3. Firebase automatically exchanges custom token for ID token');
    console.log('   4. User is now authenticated with Firebase');
    
    // Show what the frontend would receive
    console.log('\n📦 Frontend Response Structure:');
    console.log('   {');
    console.log('     "success": true,');
    console.log('     "token": "' + customToken.substring(0, 30) + '...",');
    console.log('     "claims": {');
    console.log('       "eventId": "' + (decodedCustom.claims?.eventId || 'undefined') + '",');
    console.log('       "role": "' + (decodedCustom.claims?.role || 'undefined') + '",');
    console.log('       "userId": "' + (decodedCustom.claims?.userId || 'undefined') + '",');
    console.log('       "communityId": "' + (decodedCustom.claims?.communityId || 'undefined') + '"');
    console.log('     }');
    console.log('   }');
    
    console.log('\n3️⃣ FIREBASE: Token Exchange Details');
    console.log('-'.repeat(40));
    
    console.log('🔄 Automatic Token Exchange:');
    console.log('   • signInWithCustomToken() triggers Firebase Auth');
    console.log('   • Firebase sends custom token to IdentityToolkit API');
    console.log('   • IdentityToolkit validates and returns ID token');
    console.log('   • User session established with ID token');
    console.log('   • Custom claims available in ID token');
    
    console.log('\n🔐 ID Token Structure (what Firebase creates):');
    console.log('   {');
    console.log('     "iss": "firebase-adminsdk-fbsvc@tempcomm-35dff.iam.gserviceaccount.com",');
    console.log('     "aud": "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",');
    console.log('     "sub": "' + TEST_USER_ID + '",');
    console.log('     "user_id": "' + TEST_USER_ID + '",');
    console.log('     "eventId": "' + (decodedCustom.claims?.eventId || 'undefined') + '",');
    console.log('     "role": "' + (decodedCustom.claims?.role || 'undefined') + '",');
    console.log('     "userId": "' + (decodedCustom.claims?.userId || 'undefined') + '",');
    console.log('     "communityId": "' + (decodedCustom.claims?.communityId || 'undefined') + '",');
    console.log('     "iat": <timestamp>,');
    console.log('     "exp": <timestamp>');
    console.log('   }');
    
    console.log('\n4️⃣ AFTER EXCHANGE: Authenticated Operations');
    console.log('-'.repeat(40));
    
    console.log('✅ User can now:');
    console.log('   • Subscribe to Firebase Realtime Database');
    console.log('   • Send messages to event chat');
    console.log('   • Access protected Firebase resources');
    console.log('   • Firebase rules can check custom claims (eventId, role)');
    
    console.log('\n📋 Firebase Database Path Example:');
    console.log('   event_chats/' + TEST_EVENT_ID + '/messages');
    console.log('   └── User authenticated via ID token');
    console.log('   └── Custom claims: eventId="' + (decodedCustom.claims?.eventId || 'undefined') + '", role="' + (decodedCustom.claims?.role || 'undefined') + '"');
    
    console.log('\n🎉 Token Exchange Flow Completed Successfully!');
    console.log('='.repeat(50));
    
    // Summary for frontend implementation
    console.log('\n📝 Frontend Implementation Summary:');
    console.log('   • Call: getChatToken(userId, eventId, authToken)');
    console.log('   • Receive: { success, token, claims }');
    console.log('   • Execute: await signInWithCustomToken(auth, token)');
    console.log('   • Result: User authenticated with Firebase');
    console.log('   • Next: Subscribe to chat messages and send messages');
    
    return {
      customToken,
      claims: decodedCustom,
      exchangeProcess: 'signInWithCustomToken'
    };
    
  } catch (error) {
    console.error('❌ Token exchange test failed:', error.message);
    throw error;
  }
}

// Alternative method showing direct API call (for reference)
async function showDirectApiExchange(customToken) {
  console.log('\n🔧 Alternative: Direct API Exchange (for reference)');
  console.log('-'.repeat(50));
  
  console.log('If you want to manually exchange via API:');
  console.log('POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_API_KEY');
  console.log('');
  console.log('Request Body:');
  console.log('{');
  console.log('  "token": "' + customToken.substring(0, 50) + '...",');
  console.log('  "returnSecureToken": true');
  console.log('}');
  console.log('');
  console.log('Response:');
  console.log('{');
  console.log('  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",');
  console.log('  "refreshToken": "...",');
  console.log('  "expiresIn": "3600",');
  console.log('  "localId": "' + TEST_USER_ID + '"');
  console.log('}');
}

// Main execution
async function main() {
  console.log('🚀 Firebase Token Exchange Test Starting...\n');
  
  // Load environment variables
  require('dotenv').config();
  
  console.log('Test Configuration:');
  console.log('User ID:', TEST_USER_ID);
  console.log('Event ID:', TEST_EVENT_ID);
  console.log('');
  
  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/community_app');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return;
  }
  
  // Run the test
  const result = await testTokenExchangeFlow();
  
  // Show alternative method
  await showDirectApiExchange(result.customToken);
  
  // Close database connection
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testTokenExchangeFlow, showDirectApiExchange };