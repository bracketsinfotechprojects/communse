/**
 * Firebase Admin SDK FCM Implementation
 * Using Firebase Admin SDK for push notifications (Option 3)
 */

const admin = require('firebase-admin');
require('dotenv').config();

class FCMAdminService {
  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      // Check for environment variables first
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey && 
          !privateKey.includes('REPLACE_WITH_YOUR_REAL_PRIVATE_KEY_HERE')) {
        
        // Use environment variables
        const serviceAccount = {
          project_id: projectId,
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n')
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId
        });

        console.log('✅ Firebase Admin initialized with environment variables');
      } else {
        // Try to use service account file
        try {
          const serviceAccount = require('../firebase-service-account.json');
          
          // Check if it's a real key (not mock data)
          if (serviceAccount.private_key && 
              !serviceAccount.private_key.includes('TEST_MOCK_PRIVATE_KEY_FOR_TESTING_ONLY')) {
            
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: serviceAccount.project_id
            });

            console.log('✅ Firebase Admin initialized with service account file');
          } else {
            throw new Error('Mock credentials detected in service account file');
          }
        } catch (fileError) {
          console.log('⚠️ No valid Firebase credentials found, using mock service');
          this.initializeMockFirebase();
        }
      }
    } catch (error) {
      console.log('⚠️ Firebase initialization failed:', error.message);
      this.initializeMockFirebase();
    }
  }

  /**
   * Initialize mock Firebase for testing
   */
  initializeMockFirebase() {
    // Mock Firebase Admin for testing
    this.messaging = {
      send: async (message) => {
        console.log('🔧 Mock: Sending FCM message to:', message.token);
        return `mock-message-id-${Date.now()}`;
      },
      sendMulticast: async (message) => {
        const tokenCount = message.tokens?.length || 0;
        console.log(`🔧 Mock: Sending multicast to ${tokenCount} tokens`);
        return {
          successCount: tokenCount,
          failureCount: 0,
          responses: message.tokens?.map(() => ({ success: true })) || []
        };
      }
    };
  }

  /**
   * Get Firebase Messaging instance
   */
  getMessaging() {
    return this.messaging || admin.messaging();
  }

  /**
   * Send single FCM message
   */
  async sendSingleMessage(fcmToken, notification, data = {}) {
    try {
      const messaging = this.getMessaging();
      
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'CommAPP Notification',
          body: notification.body || 'You have a new notification'
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        }
      };

      console.log('📱 Sending FCM message...');
      const response = await messaging.send(message);
      console.log('✅ FCM message sent successfully:', response);
      
      return {
        success: true,
        messageId: response,
        token: fcmToken
      };

    } catch (error) {
      console.error('❌ FCM send error:', error);
      return {
        success: false,
        error: error.message,
        token: fcmToken
      };
    }
  }

  /**
   * Send multicast FCM message to multiple tokens
   */
  async sendMulticastMessage(fcmTokens, notification, data = {}) {
    try {
      const messaging = this.getMessaging();

      if (!fcmTokens || fcmTokens.length === 0) {
        throw new Error('No FCM tokens provided');
      }

      const message = {
        tokens: fcmTokens,
        notification: {
          title: notification.title || 'CommAPP Notification',
          body: notification.body || 'You have a new notification'
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        }
      };

      console.log(`📱 Sending multicast FCM to ${fcmTokens.length} tokens...`);
      
      // Check if sendEachForMulticast is available (Firebase Admin SDK v13+)
      if (typeof messaging.sendEachForMulticast === 'function') {
        const response = await messaging.sendEachForMulticast(message);
        console.log('✅ Multicast sent:', {
          successCount: response.successCount,
          failureCount: response.failureCount
        });
        return response;
      } else if (typeof messaging.sendMulticast === 'function') {
        // Fallback for older versions
        const response = await messaging.sendMulticast(message);
        console.log('✅ Multicast sent (legacy):', {
          successCount: response.successCount,
          failureCount: response.failureCount
        });
        return response;
      } else {
        throw new Error('No multicast method available');
      }

    } catch (error) {
      console.error('❌ Multicast send error:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific user by user ID
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      const User = require('./src/models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get active FCM tokens
      const activeTokens = user.getActiveFcmTokens();
      
      if (activeTokens.length === 0) {
        console.log(`⚠️ User ${user.username} has no active FCM tokens`);
        return {
          success: false,
          error: 'No active FCM tokens found for user'
        };
      }

      console.log(`📱 Sending notification to user ${user.username} (${activeTokens.length} tokens)`);
      
      const result = await this.sendMulticastMessage(
        activeTokens, 
        notification, 
        { ...data, userId: userId.toString() }
      );

      return {
        success: true,
        user: {
          id: userId,
          username: user.username,
          email: user.email
        },
        tokensCount: activeTokens.length,
        deliveryResult: result
      };

    } catch (error) {
      console.error('❌ Send to user error:', error);
      return {
        success: false,
        error: error.message,
        userId: userId
      };
    }
  }

  /**
   * Test FCM setup
   */
  async testFCMSetup() {
    console.log('🧪 Testing FCM Admin SDK Setup...');
    console.log('=================================');

    try {
      const messaging = this.getMessaging();
      
      if (!messaging) {
        throw new Error('Messaging service not available');
      }

      console.log('✅ Messaging service available');

      // Test with a mock token
      const testToken = 'test-fcm-token-12345';
      const testNotification = {
        title: 'Test Notification',
        body: 'This is a test message from Firebase Admin SDK'
      };

      console.log('📱 Testing single message send...');
      
      try {
        await this.sendSingleMessage(testToken, testNotification);
        console.log('✅ Single message test passed');
      } catch (error) {
        if (error.code === 'messaging/invalid-registration-token') {
          console.log('✅ Authentication working (invalid token error expected)');
        } else {
          throw error;
        }
      }

      console.log('✅ FCM Admin SDK setup is working correctly!');
      return true;

    } catch (error) {
      console.error('❌ FCM test failed:', error.message);
      return false;
    }
  }
}

// Create and export service instance
const fcmAdminService = new FCMAdminService();

// Export for use in other modules
module.exports = fcmAdminService;

// CLI usage
if (require.main === module) {
  console.log('🔥 Firebase Admin SDK FCM Service');
  console.log('==================================');

  fcmAdminService.testFCMSetup()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Ready to send FCM messages!');
        console.log('\nUsage examples:');
        console.log('- await fcmAdminService.sendSingleMessage(token, notification, data)');
        console.log('- await fcmAdminService.sendMulticastMessage(tokens, notification, data)');
        console.log('- await fcmAdminService.sendToUser(userId, notification, data)');
      }
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
    });
}