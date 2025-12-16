/**
 * Debug IdentityToolkit API Token Exchange
 * 
 * This script tests the direct API call to identify the specific error
 */

const http = require('http');
const mongoose = require('mongoose');
const chatTokenService = require('./src/services/chatTokenService');

// Configuration
const TEST_USER_ID = '6937ca8a627f152384ac1884';
const TEST_EVENT_ID = '693bb754eb012d2a43551197';
const FIREBASE_API_KEY = 'AIzaSyCpg6ePltV5gShCAzGsL0vTvfNCtX_7WTM';
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken';

/**
 * Make HTTP POST request to IdentityToolkit API
 */
function makeIdentityToolkitRequest(token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      token: token,
      returnSecureToken: true
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
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
          reject(new Error('Failed to parse response: ' + error.message + '\nRaw response: ' + data));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get fresh token from backend
 */
async function getFreshToken() {
  console.log('🔄 Getting fresh token from backend...');
  
  try {
    const customToken = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
    console.log('✅ Fresh token generated:');
    console.log('   Length:', customToken.length);
    console.log('   Preview:', customToken.substring(0, 50) + '...');
    
    // Decode to show claims
    const decoded = await chatTokenService.verifyCustomToken(customToken);
    console.log('📋 Token Claims:');
    console.log('   Event ID:', decoded.claims?.eventId);
    console.log('   Role:', decoded.claims?.role);
    console.log('   User ID:', decoded.claims?.userId);
    console.log('   Community ID:', decoded.claims?.communityId);
    
    return customToken;
  } catch (error) {
    console.error('❌ Failed to generate token:', error.message);
    throw error;
  }
}

/**
 * Test IdentityToolkit API exchange
 */
async function testIdentityToolkitExchange(token) {
  console.log('\n🌐 Testing IdentityToolkit API Exchange');
  console.log('='.repeat(50));
  
  console.log('API Endpoint:', IDENTITY_TOOLKIT_URL + `?key=${FIREBASE_API_KEY}`);
  console.log('Token Preview:', token.substring(0, 50) + '...');
  console.log('');
  
  try {
    const response = await makeIdentityToolkitRequest(token);
    
    console.log('✅ API Response Received:');
    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('\n🎉 SUCCESS! Token exchange worked:');
      console.log('ID Token:', response.data.idToken?.substring(0, 50) + '...');
      console.log('Expires In:', response.data.expiresIn);
      console.log('Local ID:', response.data.localId);
      
      // Decode ID token to show claims
      if (response.data.idToken) {
        const decodedIdToken = decodeJwt(response.data.idToken);
        console.log('\n📋 ID Token Claims:');
        console.log(JSON.stringify(decodedIdToken, null, 2));
      }
      
      return response.data;
    } else {
      console.log('\n❌ ERROR: API returned non-200 status');
      return null;
    }
    
  } catch (error) {
    console.log('\n❌ ERROR: IdentityToolkit API call failed');
    console.log('Error Message:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    return null;
  }
}

/**
 * Decode JWT token to show claims
 */
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    console.error('Error decoding JWT:', error.message);
    return null;
  }
}

/**
 * Check token format and validity
 */
function analyzeToken(token) {
  console.log('\n🔍 Token Analysis');
  console.log('-'.repeat(30));
  
  console.log('Token Length:', token.length);
  console.log('Token Format Check:');
  
  // Check JWT format
  const parts = token.split('.');
  console.log('JWT Parts:', parts.length);
  console.log('Header:', parts[0] ? '✅ Present' : '❌ Missing');
  console.log('Payload:', parts[1] ? '✅ Present' : '❌ Missing');
  console.log('Signature:', parts[2] ? '✅ Present' : '❌ Missing');
  
  // Try to decode payload
  if (parts[1]) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('Payload Decoding: ✅ Success');
      console.log('Payload Claims:', JSON.stringify(payload.claims || payload, null, 2));
      
      // Check expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = now > expDate;
        console.log('Expiration:', expDate.toISOString(), isExpired ? '(EXPIRED)' : '(Valid)');
      }
      
    } catch (error) {
      console.log('Payload Decoding: ❌ Failed -', error.message);
    }
  }
  
  // Check Firebase-specific fields
  if (parts[1]) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('\nFirebase-Specific Checks:');
      console.log('Issuer (iss):', payload.iss || 'Missing');
      console.log('Audience (aud):', payload.aud || 'Missing');
      console.log('Subject (sub):', payload.sub || 'Missing');
      console.log('UID:', payload.uid || 'Missing');
    } catch (error) {
      console.log('Firebase checks: ❌ Cannot analyze');
    }
  }
}

/**
 * Main debugging function
 */
async function debugIdentityToolkitError() {
  console.log('🔧 Debugging IdentityToolkit API Error\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/community_app');
    console.log('✅ Connected to MongoDB\n');
    
    // Get fresh token
    const token = await getFreshToken();
    
    // Analyze token
    analyzeToken(token);
    
    // Test API exchange
    const result = await testIdentityToolkitExchange(token);
    
    if (!result) {
      console.log('\n🔧 Troubleshooting Steps:');
      console.log('1. Check if token is expired (current time > exp)');
      console.log('2. Verify Firebase API key is valid');
      console.log('3. Check if service account has proper permissions');
      console.log('4. Ensure token format matches Firebase expectations');
      console.log('5. Check Firebase project configuration');
      
      console.log('\n🛠️ Common Fixes:');
      console.log('1. Use fresh token (tokens expire after 1 hour)');
      console.log('2. Verify Firebase project ID in service account');
      console.log('3. Check if custom claims are properly formatted');
      console.log('4. Ensure service account key is not expired');
    }
    
  } catch (error) {
    console.error('❌ Debug process failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Import https module
const https = require('https');

// Run debug if executed directly
if (require.main === module) {
  debugIdentityToolkitError().catch(console.error);
}

module.exports = { debugIdentityToolkitError, analyzeToken, decodeJwt };