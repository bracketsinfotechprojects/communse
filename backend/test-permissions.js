require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔍 TESTING FIREBASE PERMISSIONS\n');

try {
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
  
  console.log('📋 Service Account Details:');
  console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('   Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  
  const messaging = admin.messaging();
  
  console.log('\n✅ Firebase initialized successfully');
  console.log('📱 Testing single notification permissions...');
  
  // Test simple send with invalid token to check permissions
  messaging.send({
    token: 'test_invalid_token_for_permission_check_12345',
    notification: {
      title: 'Permission Test',
      body: 'Testing if service account has permissions'
    }
  }).then(result => {
    console.log('\n✅ SUCCESS! Permissions are working!');
    console.log('📊 Message ID:', result);
    console.log('\n🎉 Your Firebase notifications are now fully functional!');
    process.exit(0);
  }).catch(error => {
    console.log('\n❌ Permission Test Result:');
    console.log('   Error Code:', error.code);
    console.log('   Error Message:', error.message);
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('\n✅ SUCCESS! Service account has permissions (invalid token error expected)');
      console.log('🎉 Your Firebase notifications are working!');
      process.exit(0);
    } else if (error.code === 'messaging/mismatched-credential') {
      console.log('\n❌ PERMISSION DENIED! Service account lacks messaging permissions');
      console.log('🔧 Need to add Firebase Cloud Messaging permissions to service account');
      process.exit(1);
    } else {
      console.log('\n❌ OTHER ERROR - Check console for details');
      process.exit(1);
    }
  });
  
} catch (error) {
  console.error('\n❌ Firebase initialization error:', error.message);
  process.exit(1);
}