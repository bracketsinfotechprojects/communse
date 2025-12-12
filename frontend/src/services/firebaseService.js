import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import app from "./firebase";

// Initialize Firebase services
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

class FirebaseClientService {
  constructor() {
    this.auth = auth;
    this.database = database;
    this.storage = storage;
    this.messaging = messaging;
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Get database reference
  getDatabase() {
    return this.database;
  }

  // Get storage reference
  getStorage() {
    return this.storage;
  }

  // Get messaging instance
  getMessaging() {
    return this.messaging;
  }

  // Sign in with email and password
  async signInWithEmailAndPassword(email, password) {
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Create user with email and password
  async createUserWithEmailAndPassword(email, password) {
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      await this.auth.signOut();
    } catch (error) {
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
    } catch (error) {
      throw error;
    }
  }

  // Listen to authentication state changes
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }

  // Get ID token
  async getIdToken(forceRefresh = false) {
    if (this.auth.currentUser) {
      return await this.auth.currentUser.getIdToken(forceRefresh);
    }
    return null;
  }

  // Reference to a path in database
  ref(path) {
    return this.database.ref(path);
  }

  // Upload file to storage
  async uploadFile(path, file, metadata = {}) {
    try {
      const storageRef = this.storage.ref().child(path);
      const snapshot = await storageRef.put(file, metadata);
      return snapshot;
    } catch (error) {
      throw error;
    }
  }

  // Get download URL from storage path
  async getDownloadURL(path) {
    try {
      const storageRef = this.storage.ref().child(path);
      const url = await storageRef.getDownloadURL();
      return url;
    } catch (error) {
      throw error;
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      throw error;
    }
  }

  // Get FCM token
  async getFCMToken() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const token = await this.messaging.getToken({
          vapidKey: "YOUR_VAPID_KEY_HERE", // You'll need to add your VAPID key
          serviceWorkerRegistration: registration
        });
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }
}

// Create singleton instance
const firebaseClientService = new FirebaseClientService();

export default firebaseClientService;