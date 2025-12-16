const admin = require('firebase-admin');
const serviceAccount = require('../../firebase_commapp.json');

class FirebaseConfig {
  constructor() {
    this.initializeApp();
  }

  initializeApp() {
    try {
      if (!admin.apps.length) {
        // Initialize with only Auth (no Database) to avoid missing DATABASE_URL error
        const config = {
          credential: admin.credential.cert(serviceAccount)
        };
        
        // Only add database URL if it exists (for backwards compatibility)
        if (process.env.FIREBASE_DATABASE_URL) {
          config.databaseURL = process.env.FIREBASE_DATABASE_URL;
        }
        
        admin.initializeApp(config);

        // Only initialize Database if URL is provided
        if (process.env.FIREBASE_DATABASE_URL) {
          this.db = admin.database();
          console.log('Firebase initialized with Database');
        } else {
          console.log('Firebase initialized without Database (Auth only)');
        }
        
        this.auth = admin.auth();
        this.messaging = admin.messaging();
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  // Get Firebase Database reference (only if initialized)
  getDatabase() {
    if (!this.db) {
      console.warn('Firebase Database not initialized. Set FIREBASE_DATABASE_URL to enable.');
      return null;
    }
    return this.db;
  }

  // Get Firebase Auth
  getAuth() {
    return this.auth;
  }

  // Get Firebase Messaging
  getMessaging() {
    return this.messaging;
  }

  // Verify Firebase ID token
  async verifyIdToken(idToken) {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid Firebase token');
    }
  }

  // Send push notification
  async sendPushNotification(token, notification, data = {}) {
    try {
      const message = {
        notification,
        data,
        token
      };

      const response = await this.messaging.send(message);
      console.log('Push notification sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send to multiple tokens
  async sendMulticastNotification(tokens, notification, data = {}) {
    try {
      const message = {
        notification,
        data,
        tokens
      };

      const response = await this.messaging.sendMulticast(message);
      console.log('Multicast notification sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      throw error;
    }
  }
}

// Create singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;