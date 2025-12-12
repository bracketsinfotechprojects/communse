const admin = require('firebase-admin');
const serviceAccount = require('../../firebase_commapp.json');

class FirebaseConfig {
  constructor() {
    this.initializeApp();
  }

  initializeApp() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        console.log('Firebase initialized successfully');
        
        // Initialize Realtime Database reference
        this.db = admin.database();
        this.auth = admin.auth();
        this.messaging = admin.messaging();
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  // Get Firebase Database reference
  getDatabase() {
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