const admin = require('firebase-admin');

class MockFirebaseAuth {
  constructor() {
    this.users = new Map();
  }

  async createCustomToken(uid, claims = {}) {
    // Generate a mock JWT-like token for testing
    const mockToken = `mock_token_${uid}_${Date.now()}`;
    console.log(`🔧 Mock: Generated custom token for user ${uid}`, claims);
    return mockToken;
  }

  async verifyIdToken(token) {
    console.log('🔧 Mock: Verifying ID token');
    return { uid: 'mock_user', claims: {} };
  }
}

class FirebaseConfig {
  constructor() {
    this.initializeApp();
  }

  initializeApp() {
    try {
      if (!admin.apps.length) {
        // Try to initialize with environment variables first (for Admin SDK)
        let serviceAccount = null;
        let projectId = null;

        // Check for Firebase Admin SDK environment variables
        const projectIdFromEnv = process.env.FIREBASE_PROJECT_ID;
        const clientEmailFromEnv = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyFromEnv = process.env.FIREBASE_PRIVATE_KEY;
        const databaseUrlFromEnv = process.env.FIREBASE_DATABASE_URL;

        if (projectIdFromEnv && clientEmailFromEnv && privateKeyFromEnv &&
            !privateKeyFromEnv.includes('REPLACE_WITH_YOUR_REAL_PRIVATE_KEY_HERE')) {
          // Use environment variables for service account
          serviceAccount = {
            project_id: projectIdFromEnv,
            client_email: clientEmailFromEnv,
            private_key: privateKeyFromEnv.replace(/\\n/g, '\n')
          };
          projectId = projectIdFromEnv;
          
          console.log('✅ Using Firebase Admin SDK from environment variables');
        } else {
          // Fallback to service account file
          try {
            const serviceAccountFile = require('../../firebase_commapp.json');
            
            // Check if the private key is a real key (not mock data)
            if (serviceAccountFile.private_key &&
                !serviceAccountFile.private_key.includes('TEST_MOCK_PRIVATE_KEY_FOR_TESTING_ONLY')) {
              serviceAccount = serviceAccountFile;
              projectId = serviceAccount.project_id;
              
              console.log('✅ Using Firebase Admin SDK from service account file');
            } else {
              throw new Error('Mock credentials detected');
            }
          } catch (fileError) {
            console.log('⚠️ Using mock Firebase service (no valid credentials found)');
            // Initialize mock Firebase service
            this.auth = new MockFirebaseAuth();
            this.messaging = {
              send: async () => 'mock-message-id',
              sendMulticast: async (message) => {
                console.log('🔧 Mock multicast notification:', message.tokens?.length || 0, 'tokens');
                const tokenCount = message.tokens?.length || 0;
                return {
                  successCount: tokenCount,
                  failureCount: 0,
                  responses: message.tokens?.map(() => ({ success: true })) || []
                };
              }
            };
            this.db = null;
            return;
          }
        }

        // Initialize Firebase Admin SDK
        const config = {
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId
        };
        
        // Add database URL if available
        const databaseUrl = databaseUrlFromEnv || serviceAccount.database_url || process.env.FIREBASE_DATABASE_URL;
        if (databaseUrl) {
          config.databaseURL = databaseUrl;
        }
        
        admin.initializeApp(config);

        // Initialize components
        this.auth = admin.auth();
        this.messaging = admin.messaging();
        
        // Only initialize Database if URL is provided
        if (databaseUrl) {
          this.db = admin.database();
          console.log('✅ Firebase initialized with Database');
        } else {
          this.db = null;
          console.log('✅ Firebase initialized without Database (Auth + Messaging only)');
        }
        
      }
    } catch (error) {
      console.log('⚠️ Firebase initialization failed, using mock service:', error.message);
      
      // Initialize mock Firebase service instead of setting to null
      this.auth = new MockFirebaseAuth();
      this.messaging = {
        send: async () => 'mock-message-id',
        sendMulticast: async (message) => {
          console.log('🔧 Mock multicast notification:', message.tokens?.length || 0, 'tokens');
          const tokenCount = message.tokens?.length || 0;
          return {
            successCount: tokenCount,
            failureCount: 0,
            responses: message.tokens?.map(() => ({ success: true })) || []
          };
        }
      };
      this.db = null;
      
      console.log('🔧 Mock Firebase services initialized - server will continue with mock Firebase');
    }
  }

  // Get Firebase Database reference (only if initialized)
  getDatabase() {
    if (!this.db) {
      console.warn('⚠️ Firebase Database not initialized');
      return null;
    }
    return this.db;
  }

  // Get Firebase Auth
  getAuth() {
    if (!this.auth) {
      console.warn('⚠️ Firebase Auth not initialized');
      return null;
    }
    return this.auth;
  }

  // Get Firebase Messaging
  getMessaging() {
    if (!this.messaging) {
      console.warn('⚠️ Firebase Messaging not initialized');
      return null;
    }
    return this.messaging;
  }

  // Verify Firebase ID token
  async verifyIdToken(idToken) {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid Firebase token');
    }
  }

  // Send push notification
  async sendPushNotification(token, notification, data = {}) {
    if (!this.messaging) {
      console.log('📱 Mock push notification sent (Firebase not initialized)');
      return 'mock-message-id';
    }
    try {
      const message = {
        notification,
        data,
        token
      };

      const response = await this.messaging.send(message);
      console.log('📱 Push notification sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send to multiple tokens
  async sendMulticastNotification(tokens, notification, data = {}) {
    if (!this.messaging) {
      console.log('📱 Mock multicast notification sent (Firebase not initialized)');
      return { successCount: tokens.length, failureCount: 0 };
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('📱 No tokens provided for multicast notification');
      return { successCount: 0, failureCount: 0 };
    }
    
    try {
      const message = {
        notification,
        data,
        tokens
      };

      console.log(`📱 Sending multicast notification to ${tokens.length} tokens`);
      
      // Check if sendEachForMulticast method exists (Firebase Admin SDK v13+)
      if (typeof this.messaging.sendEachForMulticast === 'function') {
        console.log('📱 Using sendEachForMulticast method (Firebase Admin SDK v13+)');
        const response = await this.messaging.sendEachForMulticast(message);
        console.log('📱 Multicast notification sent:', response);
        return response;
      }
      // Check if sendMulticast method exists (older versions)
      else if (typeof this.messaging.sendMulticast === 'function') {
        console.log('📱 Using sendMulticast method (older Firebase SDK)');
        const response = await this.messaging.sendMulticast(message);
        console.log('📱 Multicast notification sent:', response);
        return response;
      }
      // Fallback: send notifications individually
      else {
        console.error('❌ No multicast method available, falling back to individual notifications');
        
        let successCount = 0;
        let failureCount = 0;
        const responses = [];
        
        for (const token of tokens) {
          try {
            const response = await this.messaging.send({
              notification,
              data,
              token
            });
            successCount++;
            responses.push({ success: true, response });
          } catch (error) {
            failureCount++;
            responses.push({ success: false, error: error.message });
          }
        }
        
        console.log(`📱 Individual notifications: ${successCount} success, ${failureCount} failed`);
        return { successCount, failureCount, responses };
      }
    } catch (error) {
      console.error('❌ Error sending multicast notification:', error);
      
      // If sendEachForMulticast fails completely, try fallback to individual sends
      if (error.message && (error.message.includes('sendEachForMulticast is not a function') ||
                           error.message.includes('sendMulticast is not a function'))) {
        console.log('🔧 Attempting fallback to individual notifications...');
        return this.sendMulticastNotification(tokens, notification, data);
      }
      
      throw error;
    }
  }
}

// Create singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;