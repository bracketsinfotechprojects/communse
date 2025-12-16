s/**
 * Exchange Firebase Custom Token for ID Token
 * 
 * This script demonstrates how to exchange a custom token for an ID token
 * using the Firebase IdentityToolkit API
 */

const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const chatTokenService = require('./src/services/chatTokenService');

// Configuration
const TEST_USER_ID = '6937ca8a627f152384ac1884';
const TEST_EVENT_ID = '693bb754eb012d2a43551197';

// Firebase IdentityToolkit API endpoint
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken';

/**
 * Exchange custom token for ID token using Firebase IdentityToolkit API
 */
async function exchangeCustomTokenForIdToken(customToken) {
  try {
    console.log('🔄 Exchanging custom token for ID token...');
    console.log('Custom token preview:', customToken.substring(0, 50) + '...');
    
    // Firebase API Key (you'll need to get this from Firebase Console)
    const apiKey = process.env.FIREBASE_API_KEY;
    
    if (!apiKey) {
      throw new Error('FIREBASE_API_KEY environment variable not set. Get this from Firebase Console > Project Settings > General > Your apps');
    }
    
    const requestData = {
      token: customToken,
      returnSecureToken: true
    };
    
    console.log('Making request to Firebase IdentityToolkit API...');
    const response = await axios.post(
      `${IDENTITY_TOOLKIT_URL}?key=${apiKey}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const idTokenData = response.data;
    
    console.log('✅ Successfully exchanged custom token for ID token!');
    console.log('ID Token preview:', idTokenData.idToken.substring(0, 50) + '...');
    console.log('Expires in:', idTokenData.expiresIn, 'seconds');
    console.log('User ID:', idTokenData.localId);
    
    return idTokenData;
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Firebase API Error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('❌ Error exchanging token:', error.message);
    }
    throw error;
  }
}

/**
 * Verify the ID token by decoding it
 */
function decodeIdToken(idToken) {
  try {
    const base64Payload = idToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    
    console.log('📋 ID Token Claims:');
    console.log('User ID (sub):', payload.user_id);
    console.log('Email:', payload.email);
    console.log('Email Verified:', payload.email_verified);
    console.log('Issuer (iss):', payload.iss);
    console.log('Audience (aud):', payload.aud);
    console.log('Issued At (iat):', new Date(payload.iat * 1000).toISOString());
    console.log('Expires (exp):', new Date(payload.exp * 1000).toISOString());
    console.log('Custom Claims:', payload);
    
    return payload;
  } catch (error) {
    console.error('❌ Error decoding ID token:', error.message);
    throw error;
  }
}

/**
 * Main function to test token exchange
 */
async function testTokenExchange() {
  console.log('🔧 Starting Token Exchange Test\n');
  
  try {
    // Step 1: Generate custom token
    console.log('1️⃣ Generating custom chat token...');
    const customToken = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
    console.log('✅ Custom token generated successfully\n');
    
    // Step 2: Exchange for ID token
    const idTokenData = await exchangeCustomTokenForIdToken(customToken);
    
    // Step 3: Decode and verify ID token
    console.log('\n2️⃣ Decoding ID token...');
    const decodedClaims = decodeIdToken(idTokenData.idToken);
    
    // Step 4: Verify custom claims are preserved
    console.log('\n3️⃣ Verifying custom claims preservation...');
    const customClaims = decodedClaims;
    console.log('Event ID from claims:', customClaims.eventId);
    console.log('Role from claims:', customClaims.role);
    console.log('User ID from claims:', customClaims.userId);
    console.log('Community ID from claims:', customClaims.communityId);
    
    // Verify the claims match what we expected
    const expectedEventId = TEST_EVENT_ID;
    const expectedUserId = TEST_USER_ID;
    
    if (customClaims.eventId === expectedEventId && customClaims.userId === expectedUserId) {
      console.log('✅ Custom claims correctly preserved in ID token!');
    } else {
      console.log('❌ Custom claims mismatch!');
      console.log('Expected eventId:', expectedEventId, 'Got:', customClaims.eventId);
      console.log('Expected userId:', expectedUserId, 'Got:', customClaims.userId);
    }
    
    console.log('\n🎉 Token exchange test completed successfully!');
    console.log('You can now use this ID token for authenticated Firebase operations.');
    
    return {
      customToken,
      idToken: idTokenData.idToken,
      expiresIn: idTokenData.expiresIn,
      claims: decodedClaims
    };
    
  } catch (error) {
    console.error('❌ Token exchange test failed:', error.message);
    throw error;
  }
}

/**
 * Setup instructions for users
 */
function printSetupInstructions() {
  console.log('\n📋 Setup Instructions:');
  console.log('=====================');
  console.log('1. Get your Firebase API Key from Firebase Console:');
  console.log('   - Go to https://console.firebase.google.com/');
  console.log('   - Select your project');
  console.log('   - Go to Project Settings > General');
  console.log('   - Scroll down to "Your apps" section');
  console.log('   - Copy the "Web API Key"');
  console.log('');
  console.log('2. Set the environment variable:');
  console.log('   export FIREBASE_API_KEY=your_api_key_here');
  console.log('');
  console.log('3. Make sure MongoDB is running');
  console.log('4. Run this script: node exchange-chat-token.js');
}

/**
 * Main execution
 */
async function main() {
  // Load environment variables
  require('dotenv').config();
  
  console.log('🔥 Firebase Custom Token Exchange Test\n');
  
  // Check if API key is set
  if (!process.env.FIREBASE_API_KEY) {
    console.log('❌ FIREBASE_API_KEY environment variable not set');
    printSetupInstructions();
    return;
  }
  
  console.log('Firebase Project:', process.env.FIREBASE_PROJECT_ID || 'Not set');
  console.log('Test User ID:', TEST_USER_ID);
  console.log('Test Event ID:', TEST_EVENT_ID);
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
  await testTokenExchange();
  
  // Close database connection
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { exchangeCustomTokenForIdToken, testTokenExchange };