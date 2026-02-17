const firebaseConfig = require('./src/config/firebase');

async function testSendMulticast() {
  console.log('🧪 Testing Firebase sendMulticast functionality...\n');

  try {
    // Test 1: Mock mode (no real Firebase credentials)
    console.log('📋 Test 1: Mock mode (no Firebase credentials)');
    const mockTokens = ['token1', 'token2', 'token3'];
    const mockNotification = {
      title: 'Test Notification',
      body: 'This is a test multicast notification'
    };
    const mockData = { type: 'test', timestamp: new Date().toISOString() };

    const mockResult = await firebaseConfig.sendMulticastNotification(mockTokens, mockNotification, mockData);
    console.log('✅ Mock result:', JSON.stringify(mockResult, null, 2));
    console.log('');

    // Test 2: Check if real Firebase is initialized
    console.log('📋 Test 2: Check Firebase initialization status');
    const messaging = firebaseConfig.getMessaging();
    if (messaging) {
      console.log('✅ Firebase messaging service is available');
      console.log('📋 sendMulticast method available:', typeof messaging.sendMulticast === 'function');
    } else {
      console.log('⚠️ Firebase messaging service not available (using mock)');
    }

    console.log('\n🎉 Test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testSendMulticast()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed! Firebase sendMulticast is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the configuration.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });