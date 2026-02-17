/**
 * Simple FCM Notification Sender
 * Just send one notification and check result
 */

const admin = require('firebase-admin');

// Your FCM token - replace with your actual token
const YOUR_FCM_TOKEN = 'YOUR_FCM_TOKEN_HERE';

// Simple notification message
const notification = {
  title: 'CommAPP Test',
  body: 'This is a test notification! 🎉'
};

async function sendSimpleNotification() {
  try {
    console.log('📱 Sending FCM Notification...');
    console.log('Token:', YOUR_FCM_TOKEN.substring(0, 20) + '...');
    console.log('Title:', notification.title);
    console.log('Body:', notification.body);
    console.log('----------------------------');

    // Initialize Firebase Admin (uses environment variables or service account)
    try {
      // Try environment variables first
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey && !privateKey.includes('REPLACE_WITH_YOUR_REAL_PRIVATE_KEY_HERE')) {
        admin.initializeApp({
          credential: admin.credential.cert({
            project_id: projectId,
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n')
          }),
          projectId: projectId
        });
        console.log('✅ Firebase initialized with environment variables');
      } else {
        // Try service account file
        try {
          const serviceAccount = require('../firebase-service-account.json');
          if (serviceAccount.private_key && !serviceAccount.private_key.includes('TEST_MOCK_PRIVATE_KEY_FOR_TESTING_ONLY')) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase initialized with service account file');
          } else {
            throw new Error('Mock credentials detected');
          }
        } catch (fileError) {
          console.log('⚠️ No valid credentials found, using mock service');
          // Mock service for testing
          admin.initializeApp({
            credential: admin.credential.cert({
              project_id: 'mock-project',
              client_email: 'mock@example.com',
              private_key: 'mock-key'
            })
          });
        }
      }
    } catch (initError) {
      console.log('⚠️ Firebase initialization error:', initError.message);
      // Continue with mock service
    }

    // Send the notification
    const message = {
      token: YOUR_FCM_TOKEN,
      notification: notification,
      data: {
        timestamp: Date.now().toString(),
        type: 'test'
      }
    };

    const response = await admin.messaging().send(message);
    
    console.log('\n🎉 SUCCESS! Notification sent!');
    console.log('Message ID:', response);
    console.log('\n📱 Check your device for the notification!');
    
    return {
      success: true,
      messageId: response,
      token: YOUR_FCM_TOKEN
    };

  } catch (error) {
    console.log('\n❌ FAILED! Notification error:');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('\n💡 Tip: Make sure YOUR_FCM_TOKEN_HERE is replaced with your real FCM token');
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Run the notification test
if (require.main === module) {
  console.log('🚀 Simple FCM Notification Test');
  console.log('================================\n');
  
  sendSimpleNotification()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Test completed successfully!');
      } else {
        console.log('\n❌ Test failed. Check the error above.');
      }
    })
    .catch((error) => {
      console.log('\n💥 Unexpected error:', error.message);
    });
}

module.exports = sendSimpleNotification;