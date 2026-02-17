require('dotenv').config();

console.log('🔥 Firebase Admin SDK Version Check\n');

try {
  // Check package.json for version
  const packageJson = require('./package.json');
  const firebaseVersion = packageJson.dependencies['firebase-admin'];
  console.log('📦 package.json firebase-admin version:', firebaseVersion);
  
  // Try to require and initialize
  const admin = require('firebase-admin');
  
  if (!admin.apps.length) {
    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  
  const messaging = admin.messaging();
  
  console.log('✅ Admin SDK initialized successfully');
  console.log('📋 Firebase Admin SDK version:', admin.VERSION || 'Version property not available');
  console.log('📋 Messaging service available:', !!messaging);
  
  // Check if sendMulticast exists and its signature
  if (typeof messaging.sendMulticast === 'function') {
    console.log('✅ sendMulticast method exists');
    console.log('📋 Method type:', typeof messaging.sendMulticast);
    
    // Test the correct way to call sendMulticast
    console.log('\n🧪 Testing sendMulticast with correct signature...');
    
    // Firebase Admin SDK sendMulticast expects:
    // messaging.sendMulticast(message: MulticastMessage): Promise<BatchResponse>
    
    const message = {
      tokens: ['test_token_123'], // Array of FCM tokens
      notification: {
        title: 'Test Title',
        body: 'Test Body'
      },
      data: {
        key: 'value'
      }
    };
    
    console.log('📋 Message structure:', JSON.stringify(message, null, 2));
    
    messaging.sendMulticast(message)
      .then(response => {
        console.log('🎉 sendMulticast call successful!');
        console.log('📊 Response:', JSON.stringify(response, null, 2));
        console.log('✅ sendMulticast is working correctly');
      })
      .catch(error => {
        if (error.code === 'messaging/invalid-registration-token') {
          console.log('🎉 sendMulticast working correctly!');
          console.log('✅ Error confirms real Firebase integration:', error.code);
          console.log('💡 Invalid token error is expected for test');
        } else {
          console.log('⚠️ Other error:', error.code, error.message);
        }
      });
      
  } else {
    console.log('❌ sendMulticast method not found');
    console.log('📋 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(messaging)));
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}