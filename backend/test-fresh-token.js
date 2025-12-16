/**
 * Test the specific fresh token you're trying to use
 */

const https = require('https');

// The exact token from your curl command
const FRESH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50aXR5dG9vbGtpdC5nb29nbGVhcGlzLmNvbS9nb29nbGUuaWRlbnRpdHkuaWRlbnRpdHl0b29sa2l0LnYxLklkZW50aXR5VG9vbGtpdCIsImlhdCI6MTc2NTYxNDMzMiwiZXhwIjoxNzY1NjE3OTMyLCJpc3MiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0B0ZW1wY29tbS0zNWRmZi5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInN1YiI6ImZpcmViYXNlLWFkbWluc2RrLWZic3ZjQHRlbXBjb21tLTM1ZGZmLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwidWlkIjoiNjkzN2NhOGE2MjdmMTUyMzg0YWMxODg0IiwiY2xhaW1zIjp7ImV2ZW50SWQiOiI2OTNiYjc1NGViMDEyZDJhNDM1NTExOTciLCJyb2xlIjoiYWRtaW4iLCJ1c2VySWQiOiI2OTM3Y2E4YTYyN2YxNTIzODRhYzE4ODQiLCJjb21tdW5pdHlJZCI6IjY5MzdjY2MzMmI5MjY4ZTM3NGEyZjMzNCJ9fQ.xJpdMLlPR3pJjFuiY5Q3i6CW26JxwPeqopfaNIlUF3OWDSwRLxtZhesphc7OY13kzDawIxeNuWBrmElrYKM2oUqyFp1F7VbJDUHooLFb2aJiPecFDKgn2f7crMrLKeYyHJhEO6ahxXTtHGAWRBYQ2I-HpZxx0yKmT8bOyB0AuIsdV02e14T0dlDzV4YcirENYRrfgG7dquM7zuC-DiUsszxpiDBFWIgjJaFlQ4O9cVE9QxYIeUPEqXi5tS9Q9bp0yDvHNRDaR42S0Rry8NJTBvdpVA_MaULhzoKyjFpy_AjJC7glAJeBovlEeRd2n75ERgp9v5NbbNrbPLqgirxFxQ";

const API_KEY = "AIzaSyCpg6ePltV5gShCAzGsL0vTvfNCtX_7WTM";

/**
 * Decode the JWT token to show its contents
 */
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('🔍 Token Analysis');
    console.log('='.repeat(40));
    
    console.log('📋 Header:', JSON.stringify(header, null, 2));
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    console.log('\n⏰ Time Analysis:');
    console.log('Current time (unix):', now);
    console.log('Issued at (iat):', payload.iat);
    console.log('Expires at (exp):', payload.exp);
    console.log('Time to expiry:', payload.exp - now, 'seconds');
    
    if (payload.exp < now) {
      console.log('❌ Token is EXPIRED');
    } else {
      console.log('✅ Token is still valid');
    }
    
    // Show claims
    console.log('\n📋 Custom Claims:');
    if (payload.claims) {
      console.log('Event ID:', payload.claims.eventId);
      console.log('Role:', payload.claims.role);
      console.log('User ID:', payload.claims.userId);
      console.log('Community ID:', payload.claims.communityId);
    }
    
    return { header, payload };
  } catch (error) {
    console.error('❌ Error decoding JWT:', error.message);
    return null;
  }
}

/**
 * Make the exact API call you're testing
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
      path: `/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🌐 Making API Request...');
    console.log('URL:', `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`);
    console.log('Token Preview:', token.substring(0, 50) + '...');

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
 * Main test function
 */
async function testFreshToken() {
  console.log('🧪 Testing Fresh Token from Your Curl Command\n');

  // Decode the token first
  const decoded = decodeJwt(FRESH_TOKEN);
  if (!decoded) {
    console.log('❌ Failed to decode token');
    return;
  }

  console.log('\n🔄 Making API Call...');

  try {
    const response = await makeIdentityToolkitRequest(FRESH_TOKEN);
    
    console.log('\n📡 API Response:');
    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log('\n🎉 SUCCESS! The token worked this time!');
      console.log('ID Token:', response.data.idToken?.substring(0, 50) + '...');
      console.log('Expires In:', response.data.expiresIn);
      console.log('Local ID:', response.data.localId);
    } else {
      console.log('\n❌ ERROR: Still getting non-200 status');
    }

  } catch (error) {
    console.log('\n❌ API Call Failed:');
    console.log('Error:', error.message);
  }

  console.log('\n🔍 Analysis:');
  console.log('The token appears to be valid and properly formatted.');
  console.log('If this still fails, the issue is likely:');
  console.log('1. API key project mismatch with service account project');
  console.log('2. Firebase project configuration issue');
  console.log('3. Service account permissions');
}

// Run the test
testFreshToken().catch(console.error);

module.exports = { decodeJwt, testFreshToken };