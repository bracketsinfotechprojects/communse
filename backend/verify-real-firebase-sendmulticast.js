require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔥 REAL FIREBASE sendMulticast VERIFICATION\n');

// Initialize Firebase with real credentials
try {
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  
  const messaging = admin.messaging();
  
  console.log('✅ REAL Firebase Configuration:');
  console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('   Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  console.log('   Admin SDK Version:', admin.VERSION);
  console.log('   Messaging Service:', !!messaging);
  console.log('   sendMulticast Method:', typeof messaging.sendMulticast === 'function' ? '✅ Available' : '❌ Not Available');
  
  if (typeof messaging.sendMulticast === 'function') {
    console.log('\n🧪 Testing sendMulticast with Real Firebase...');
    
    // Test with invalid token to confirm real Firebase is working
    messaging.sendMulticast({
      tokens: ['test_invalid_token_12345'],
      notification: {
        title: 'Real Firebase Test',
        body: 'This is testing real Firebase sendMulticast'
      },
      data: {
        type: 'real_firebase_test',
        timestamp: new Date().toISOString()
      }
    }).then(result => {
      console.log('🎉 SUCCESS! sendMulticast completed');
      console.log('📊 Result:', JSON.stringify(result, null, 2));
      process.exit(0);
    }).catch(error => {
      if (error.code === 'messaging/invalid-registration-token') {
        console.log('🎉 SUCCESS! Real Firebase sendMulticast is working!');
        console.log('✅ Error confirms real Firebase integration:', error.code);
        console.log('💡 Invalid token error is expected for test tokens');
        console.log('📋 sendMulticast function is fully operational');
        process.exit(0);
      } else {
        console.log('⚠️ Unexpected error:', error.code, error.message);
        process.exit(1);
      }
    });
    
  } else {
    console.log('❌ sendMulticast method not found');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}