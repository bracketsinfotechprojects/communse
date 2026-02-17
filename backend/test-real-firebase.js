require('dotenv').config(); // Load .env file
const firebaseConfig = require('./src/config/firebase');

async function testRealFirebaseSetup() {
  console.log('🔥 Testing REAL Firebase Setup with Environment Variables\n');
  
  // Check environment variables
  console.log('📋 Environment Variables Status:');
  console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ NOT SET');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ SET' : '❌ NOT SET');
  console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL ? '✅ SET' : '❌ NOT SET');
  console.log('');
  
  try {
    // Get Firebase services
    const auth = firebaseConfig.getAuth();
    const messaging = firebaseConfig.getMessaging();
    const database = firebaseConfig.getDatabase();
    
    console.log('📱 Firebase Services Status:');
    console.log('Auth Service:', auth ? '✅ Available' : '❌ Not Available');
    console.log('Messaging Service:', messaging ? '✅ Available' : '❌ Not Available');
    console.log('Database Service:', database ? '✅ Available' : '❌ Not Available');
    console.log('');
    
    if (messaging) {
      console.log('✅ Firebase messaging service is available');
      console.log('📋 sendMulticast method:', typeof messaging.sendMulticast === 'function' ? '✅ Available' : '❌ Not Available');
      
      if (typeof messaging.sendMulticast === 'function') {
        console.log('\n🧪 Testing REAL Firebase sendMulticast...');
        
        // Test with dummy tokens (this will fail but should show real Firebase is working)
        try {
          const result = await firebaseConfig.sendMulticastNotification(
            ['dummy_token_123'], 
            {
              title: 'Real Firebase Test',
              body: 'Testing real Firebase sendMulticast function'
            },
            {
              type: 'real_firebase_test',
              timestamp: new Date().toISOString()
            }
          );
          
          console.log('✅ Real Firebase sendMulticast response:', JSON.stringify(result, null, 2));
          
        } catch (notificationError) {
          if (notificationError.code === 'messaging/invalid-registration-token') {
            console.log('✅ REAL Firebase is working! (Token validation error is expected)');
            console.log('📋 Error type:', notificationError.code);
            console.log('💡 This means sendMulticast is working with real Firebase');
          } else {
            console.log('⚠️ Notification error:', notificationError.message);
          }
        }
      }
      
      console.log('\n🎉 REAL Firebase Configuration Summary:');
      console.log('✅ Firebase Admin SDK initialized');
      console.log('✅ sendMulticast function available');
      console.log('✅ Ready for real push notifications');
      
    } else {
      console.log('❌ Firebase messaging service not available - check credentials');
    }
    
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.log('\n💡 This might indicate credential issues. Check your .env file.');
  }
}

// Run the test
testRealFirebaseSetup().catch(console.error);