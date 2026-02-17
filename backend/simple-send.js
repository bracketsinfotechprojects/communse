/**
 * Super Simple FCM Notification
 * Just send one notification - nothing complex
 */

const admin = require('firebase-admin');

// PUT YOUR FCM TOKEN HERE
const YOUR_FCM_TOKEN = 'PASTE_YOUR_REAL_FCM_TOKEN_HERE';

// Notification content
const title = 'CommAPP Test';
const body = 'Hello! This is a test notification. 🎉';

async function sendNotification() {
  try {
    console.log('📱 Sending Notification...');
    console.log('Token:', YOUR_FCM_TOKEN.substring(0, 20) + '...');
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('-------------------');

    // Initialize Firebase
    try {
      admin.initializeApp();
      console.log('✅ Firebase initialized');
    } catch (e) {
      console.log('ℹ️ Firebase already initialized or mock mode');
    }

    // Send notification
    const message = {
      token: YOUR_FCM_TOKEN,
      notification: { title, body }
    };

    const response = await admin.messaging().send(message);
    
    console.log('\n🎉 SUCCESS!');
    console.log('Message ID:', response);
    console.log('\n📱 Check your device now!');
    
  } catch (error) {
    console.log('\n❌ ERROR:');
    console.log('Code:', error.code || 'Unknown');
    console.log('Message:', error.message);
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('\n💡 Fix: Replace YOUR_FCM_TOKEN with your real FCM token');
    }
  }
}

// Run it
sendNotification();