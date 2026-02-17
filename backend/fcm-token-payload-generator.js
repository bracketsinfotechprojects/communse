/**
 * FCM Token Payload Generator
 * 
 * This file shows how to generate payloads for FCM token registration
 * and provides utilities for testing the push notification system.
 */

// ============================================
// 1. PAYLOAD STRUCTURE FOR FCM TOKEN REGISTRATION
// ============================================

/**
 * Standard payload for registering an FCM token with your API
 */
const fcmTokenRegistrationPayload = {
    token: "your_fcm_token_here",           // FCM token from Firebase SDK
    platform: "web",                        // "web", "android", or "ios"
    deviceId: "optional_device_identifier"  // Optional unique device identifier
};

/**
 * Example payloads for different platforms
 */
const examplePayloads = {
    web: {
        token: "fcm_token_web_sample_12345abcdef...",
        platform: "web",
        deviceId: "chrome-browser-windows-12345"
    },
    android: {
        token: "fcm_token_android_sample_67890ghijkl...",
        platform: "android", 
        deviceId: "samsung-galaxy-s21-67890"
    },
    ios: {
        token: "fcm_token_ios_sample_11111mnopqr...",
        platform: "ios",
        deviceId: "iphone-12-pro-11111"
    }
};

// ============================================
// 2. HOW TO GET REAL FCM TOKENS FROM FIREBASE
// ============================================

/**
 * JavaScript code to get FCM token from Firebase Web SDK
 * This would go in your web application
 */
const firebaseWebCode = `
// Step 1: Initialize Firebase (if not already done)
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  // Your Firebase config
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};

const app = initializeApp(firebaseConfig);

// Step 2: Request notification permission and get token
const messaging = getMessaging(app);

async function getFcmToken() {
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      
      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: 'your-vapid-key-here'  // Get this from Firebase Console
      });
      
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        
        // Send this token to your backend
        const payload = {
          token: currentToken,
          platform: 'web',
          deviceId: generateDeviceId() // Your custom function
        };
        
        // Register with your API
        await registerFcmToken(payload);
        
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
  }
}

function generateDeviceId() {
  return 'web-' + navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) + '-' + Date.now();
}

function registerFcmToken(payload) {
  return fetch('/api/notifications/fcm-token', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + getJwtToken(), // Your JWT token
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
`;

// ============================================
// 3. DUMMY TOKEN GENERATOR FOR TESTING
// ============================================

/**
 * Generate a realistic FCM token for testing purposes
 */
function generateDummyFcmToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    // FCM tokens are typically 152 characters long
    for (let i = 0; i < 152; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
}

/**
 * Generate test payload with dummy token
 */
function generateTestPayload(platform = 'web', customDeviceId = null) {
    return {
        token: generateDummyFcmToken(),
        platform: platform,
        deviceId: customDeviceId || `test-device-${platform}-${Date.now()}`
    };
}

// ============================================
// 4. API REGISTRATION FUNCTIONS
// ============================================

/**
 * Register FCM token with your backend API
 */
async function registerFcmTokenWithAPI(payload, authToken, apiBaseUrl = 'http://localhost:5000') {
    try {
        const response = await fetch(`${apiBaseUrl}/api/notifications/fcm-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(result)}`);
        }
        
        return result;
    } catch (error) {
        console.error('Error registering FCM token:', error);
        throw error;
    }
}

/**
 * Remove FCM token from your backend API
 */
async function removeFcmTokenFromAPI(token, authToken, apiBaseUrl = 'http://localhost:5000') {
    try {
        const response = await fetch(`${apiBaseUrl}/api/notifications/fcm-token`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(result)}`);
        }
        
        return result;
    } catch (error) {
        console.error('Error removing FCM token:', error);
        throw error;
    }
}

// ============================================
// 5. COMPLETE TESTING EXAMPLE
// ============================================

/**
 * Complete example for testing the FCM token system
 */
async function testFcmTokenSystem() {
    try {
        // Step 1: Get your JWT token (from login)
        const authToken = await getJwtToken(); // Implement this function
        
        // Step 2: Generate test payload
        const payload = generateTestPayload('web');
        
        // Step 3: Register with API
        const result = await registerFcmTokenWithAPI(payload, authToken);
        
        console.log('FCM Token registered successfully:', result);
        
        // Step 4: Generate cURL command for manual testing
        const curlCommand = generateCurlCommand(payload, authToken);
        console.log('cURL Command:', curlCommand);
        
        return { payload, result, curlCommand };
        
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

/**
 * Generate cURL command for the payload
 */
function generateCurlCommand(payload, authToken, apiBaseUrl = 'http://localhost:5000') {
    return `curl -X POST ${apiBaseUrl}/api/notifications/fcm-token \\
  -H "Authorization: Bearer ${authToken}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
}

// ============================================
// 6. EXPORT FOR USE IN OTHER FILES
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        fcmTokenRegistrationPayload,
        examplePayloads,
        generateDummyFcmToken,
        generateTestPayload,
        registerFcmTokenWithAPI,
        removeFcmTokenFromAPI,
        testFcmTokenSystem,
        generateCurlCommand,
        firebaseWebCode
    };
}

// ============================================
// 7. USAGE EXAMPLES
// ============================================

console.log('=== FCM Token Payload Generator ===');
console.log('1. Generate dummy token for testing:');
console.log('   const payload = generateTestPayload("web");');
console.log('   console.log(payload);');

console.log('\n2. Generate cURL command:');
console.log('   const curl = generateCurlCommand(payload, "your-jwt-token");');
console.log('   console.log(curl);');

console.log('\n3. Test complete flow:');
console.log('   testFcmTokenSystem().then(result => console.log(result));');

console.log('\n4. Open fcm-token-generator.html in browser for interactive testing');