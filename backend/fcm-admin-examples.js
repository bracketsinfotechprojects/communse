/**
 * FCM Admin SDK Usage Examples
 * How to use the Firebase Admin SDK service
 */

const fcmAdminService = require('./test-fcm-admin-sdk');

async function usageExamples() {
  console.log('📱 FCM Admin SDK Usage Examples');
  console.log('================================');

  try {
    // Example 1: Send to single FCM token
    console.log('\n1️⃣ Send to Single FCM Token:');
    console.log('------------------------------');
    
    const yourFcmToken = 'YOUR_REAL_FCM_TOKEN_HERE'; // Replace with actual token
    
    const singleResult = await fcmAdminService.sendSingleMessage(
      yourFcmToken,
      {
        title: 'Hello from Admin SDK!',
        body: 'This message was sent using Firebase Admin SDK'
      },
      {
        type: 'test',
        userId: '12345'
      }
    );
    
    console.log('Single message result:', singleResult);

    // Example 2: Send to multiple FCM tokens
    console.log('\n2️⃣ Send to Multiple FCM Tokens:');
    console.log('----------------------------------');
    
    const multipleTokens = [
      'TOKEN_1',
      'TOKEN_2', 
      'TOKEN_3'
      // Add your real tokens here
    ];
    
    const multicastResult = await fcmAdminService.sendMulticastMessage(
      multipleTokens,
      {
        title: 'Bulk Notification',
        body: 'This message was sent to multiple users'
      },
      {
        type: 'broadcast',
        category: 'announcement'
      }
    );
    
    console.log('Multicast result:', {
      successCount: multicastResult.successCount,
      failureCount: multicastResult.failureCount
    });

    // Example 3: Send to user by ID (gets FCM tokens from database)
    console.log('\n3️⃣ Send to User by Database ID:');
    console.log('--------------------------------');
    
    const userId = 'USER_OBJECT_ID_HERE'; // Replace with actual user ID
    
    const userResult = await fcmAdminService.sendToUser(
      userId,
      {
        title: 'Personal Message',
        body: 'This is a personal notification from the system'
      },
      {
        type: 'personal',
        source: 'admin'
      }
    );
    
    console.log('User notification result:', userResult);

    // Example 4: Get user's FCM tokens from database first
    console.log('\n4️⃣ Get FCM Tokens from Database:');
    console.log('----------------------------------');
    
    const User = require('./src/models/User');
    const userEmail = 'user@example.com'; // Replace with actual user email
    
    const user = await User.findOne({ email: userEmail });
    
    if (user && user.fcmTokens.length > 0) {
      const activeTokens = user.getActiveFcmTokens();
      console.log(`Found ${activeTokens.length} active FCM tokens for ${user.username}`);
      
      // Send notification using the found tokens
      const dbResult = await fcmAdminService.sendSingleMessage(
        activeTokens[0], // Send to first active token
        {
          title: 'Database Token Test',
          body: 'This message was sent using tokens from the database'
        }
      );
      
      console.log('Database token result:', dbResult);
    } else {
      console.log('No user found or no FCM tokens available');
    }

  } catch (error) {
    console.error('❌ Usage example error:', error);
  }
}

// Example: Test with MongoDB data
async function testWithRealData() {
  console.log('\n🧪 Testing with Real Database Data');
  console.log('===================================');

  try {
    const User = require('./src/models/User');
    
    // Find users with FCM tokens
    const usersWithTokens = await User.find({
      fcmTokens: { $exists: true, $ne: [] }
    }).limit(5);
    
    console.log(`Found ${usersWithTokens.length} users with FCM tokens`);
    
    for (const user of usersWithTokens) {
      const activeTokens = user.getActiveFcmTokens();
      
      if (activeTokens.length > 0) {
        console.log(`\n📱 Testing with user: ${user.username} (${activeTokens.length} tokens)`);
        
        const result = await fcmAdminService.sendSingleMessage(
          activeTokens[0],
          {
            title: 'CommAPP Test',
            body: `Hello ${user.firstName}! This is a test notification.`
          },
          {
            test: true,
            userId: user._id.toString(),
            username: user.username
          }
        );
        
        console.log(`Result for ${user.username}:`, result.success ? '✅ Success' : '❌ Failed');
        
        // Only test with one user to avoid spamming
        if (usersWithTokens.indexOf(user) === 0) {
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Real data test error:', error);
  }
}

// Run examples
if (require.main === module) {
  console.log('🚀 Running FCM Admin SDK Examples...\n');
  
  // Run basic examples
  usageExamples()
    .then(() => {
      console.log('\n✅ Basic examples completed');
      // Run real data test
      return testWithRealData();
    })
    .then(() => {
      console.log('\n🎉 All examples completed!');
    })
    .catch((error) => {
      console.error('💥 Example execution failed:', error);
    });
}

module.exports = {
  usageExamples,
  testWithRealData
};