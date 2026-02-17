/**
 * Test Your FCM Token
 * Simple script to test FCM with your specific token and user data
 */

const fcmAdminService = require('./test-fcm-admin-sdk');
const User = require('./src/models/User');

async function testYourFCM() {
  console.log('🔑 Testing YOUR FCM Token');
  console.log('==========================');

  try {
    // Method 1: Test with specific email
    const userEmail = 'your-email@example.com'; // CHANGE THIS
    console.log(`\n📧 Looking for user with email: ${userEmail}`);
    
    const user = await User.findOne({ email: userEmail });
    
    if (user) {
      console.log(`✅ Found user: ${user.username} (${user.firstName} ${user.lastName})`);
      
      const activeTokens = user.getActiveFcmTokens();
      console.log(`📱 Found ${activeTokens.length} active FCM tokens`);
      
      if (activeTokens.length > 0) {
        console.log(`🧪 Testing with token: ${activeTokens[0].substring(0, 20)}...`);
        
        const result = await fcmAdminService.sendSingleMessage(
          activeTokens[0],
          {
            title: 'CommAPP FCM Test',
            body: `Hello ${user.firstName}! Your FCM token is working! 🎉`
          },
          {
            type: 'test',
            userId: user._id.toString(),
            username: user.username,
            testTime: new Date().toISOString()
          }
        );
        
        console.log('\n📱 Test Result:');
        console.log('===============');
        console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Message ID: ${result.messageId || 'N/A'}`);
        console.log(`Token: ${result.token ? result.token.substring(0, 20) + '...' : 'N/A'}`);
        
        if (!result.success) {
          console.log(`Error: ${result.error}`);
        }
        
      } else {
        console.log('❌ No active FCM tokens found for this user');
      }
    } else {
      console.log(`❌ User not found with email: ${userEmail}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Method 2: Test with specific username
  console.log('\n\n👤 Testing with Username:');
  console.log('==========================');
  
  try {
    const username = 'your-username'; // CHANGE THIS
    console.log(`🔍 Looking for user: ${username}`);
    
    const userByUsername = await User.findOne({ username: username });
    
    if (userByUsername) {
      console.log(`✅ Found user: ${userByUsername.username}`);
      
      const tokens = userByUsername.getActiveFcmTokens();
      
      if (tokens.length > 0) {
        console.log(`📱 Testing with ${tokens.length} tokens...`);
        
        const testResult = await fcmAdminService.sendSingleMessage(
          tokens[0],
          {
            title: 'Username FCM Test',
            body: `FCM working for ${userByUsername.firstName}! 🚀`
          }
        );
        
        console.log(`Result: ${testResult.success ? '✅ Success' : '❌ Failed'}`);
        
      } else {
        console.log('❌ No tokens found for this username');
      }
    } else {
      console.log(`❌ Username not found: ${username}`);
    }

  } catch (error) {
    console.error('❌ Username test failed:', error.message);
  }

  // Method 3: Show all users with tokens
  console.log('\n\n📊 All Users with FCM Tokens:');
  console.log('==============================');
  
  try {
    const allUsersWithTokens = await User.find({
      fcmTokens: { $exists: true, $ne: [] }
    }).select('username email firstName lastName fcmTokens').limit(10);
    
    console.log(`Found ${allUsersWithTokens.length} users with FCM tokens:`);
    
    allUsersWithTokens.forEach((user, index) => {
      const activeCount = user.fcmTokens.filter(t => t.isActive).length;
      console.log(`${index + 1}. ${user.username} (${user.email}) - ${activeCount} active tokens`);
    });
    
  } catch (error) {
    console.error('❌ Failed to get users with tokens:', error.message);
  }

  console.log('\n🎯 Next Steps:');
  console.log('==============');
  console.log('1. Update the email/username variables in this script');
  console.log('2. Run: node test-your-fcm.js');
  console.log('3. Check your device for the test notification');
  console.log('4. If successful, you can use this method in your app!');
}

// Configure your test data here:
const YOUR_CONFIG = {
  email: 'your-email@example.com',     // CHANGE THIS
  username: 'your-username',           // CHANGE THIS
  testMessage: {
    title: 'CommAPP Test Notification',
    body: 'Your FCM setup is working perfectly! 🎉'
  }
};

console.log('⚙️ Current Configuration:');
console.log('========================');
console.log(`Email: ${YOUR_CONFIG.email}`);
console.log(`Username: ${YOUR_CONFIG.username}`);
console.log(`Title: ${YOUR_CONFIG.testMessage.title}`);
console.log(`Body: ${YOUR_CONFIG.testMessage.body}`);
console.log('');

// Run the test
if (require.main === module) {
  testYourFCM()
    .then(() => {
      console.log('\n🏁 Test completed!');
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
    });
}

module.exports = {
  testYourFCM,
  YOUR_CONFIG
};