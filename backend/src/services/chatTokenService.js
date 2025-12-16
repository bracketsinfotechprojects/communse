const admin = require('firebase-admin');
const Event = require('../models/Event');
const User = require('../models/User');
const firebaseConfig = require('../config/firebase');

class ChatTokenService {
  constructor() {
    // Use existing Firebase configuration instead of separate initialization
    this.auth = firebaseConfig.getAuth();
    console.log('✅ ChatTokenService initialized with existing Firebase configuration');
  }

  /**
   * Alternative initialization using environment variables
   * Use this method if you prefer environment variables over service account JSON
   */
  static initializeWithEnvironmentVariables() {
    try {
      // Check if environment variables are provided
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase environment variables not found. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
      }

      // Initialize Firebase Admin with environment variables
      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      };

      // Only initialize if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        
        console.log('✅ Firebase Admin initialized with environment variables');
        return new ChatTokenService();
      } else {
        console.log('⚠️ Firebase Admin already initialized, using existing instance');
        return new ChatTokenService();
      }
      
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin:', error);
      throw error;
    }
  }

  /**
   * Generate a Firebase Custom Token for chat access
   * @param {string} userId - The user ID
   * @param {string} eventId - The event ID
   * @returns {Promise<string>} Generated Firebase custom token
   */
  async generateChatToken(userId, eventId) {
    try {
      // Step 1: Validate inputs
      if (!userId || !eventId) {
        throw new Error('userId and eventId are required');
      }

      // Step 2: Validate the event exists in MongoDB
      const event = await Event.findById(eventId).populate('createdBy', 'firstName lastName');
      if (!event) {
        throw new Error('Event not found');
      }

      // Step 3: Validate user is a member of the event
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is attending the event
      const isUserAttending = event.isUserAttending(userId);
      if (!isUserAttending) {
        throw new Error('User is not a member of this event');
      }

      // Step 4: Validate the user is not banned
      if (!user.isActive) {
        throw new Error('User account is inactive or banned');
      }

      // Step 5: Fetch the user's role in the event
      let role = 'member';
      if (event.createdBy && event.createdBy._id.toString() === userId.toString()) {
        role = 'admin';
      }

      // Step 6: Generate Firebase custom token with custom claims
      const customClaims = {
        eventId: eventId,
        role: role,
        userId: userId,
        communityId: event.communityId.toString()
      };

      console.log('Preparing to generate custom token with claims:', customClaims);

      // Generate the custom token using existing Firebase auth
      const customToken = await this.auth.createCustomToken(userId, customClaims);

      console.log('Generated custom token preview:', customToken.substring(0, 50) + '...');
      console.log('Token length:', customToken.length);
      
      console.log(`✅ Generated chat token for user ${userId} with role ${role} for event ${eventId}`);
      
      return customToken;

    } catch (error) {
      console.error('❌ Error generating chat token:', error);
      throw error;
    }
  }

  /**
   * Verify and decode a custom token
   * Note: Custom tokens are verified on the client side by exchanging them for ID tokens
   * This method decodes the JWT payload to extract custom claims for debugging
   * @param {string} customToken - The custom token to verify
   * @returns {Promise<Object>} Decoded token claims (from custom token payload)
   */
  async verifyCustomToken(customToken) {
    try {
      // Custom tokens are JWT tokens that we can decode to get the payload
      // The payload contains our custom claims
      const base64Payload = customToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      console.log('Decoded custom token payload:', payload);
      
      // Custom tokens have a specific structure with aud, exp, iat, iss, sub, and our custom claims
      return payload;
    } catch (error) {
      console.error('❌ Error decoding custom token:', error);
      throw new Error('Invalid custom token format');
    }
  }

  /**
   * Check if user has permission for specific event chat
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @returns {Promise<{hasAccess: boolean, role: string, error?: string}>}
   */
  async checkChatPermission(userId, eventId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return { hasAccess: false, role: null, error: 'Event not found' };
      }

      const user = await User.findById(userId);
      if (!user) {
        return { hasAccess: false, role: null, error: 'User not found' };
      }

      if (!user.isActive) {
        return { hasAccess: false, role: null, error: 'User account is inactive' };
      }

      const isUserAttending = event.isUserAttending(userId);
      if (!isUserAttending) {
        return { hasAccess: false, role: null, error: 'User is not a member of this event' };
      }

      let role = 'member';
      if (event.createdBy && event.createdBy.toString() === userId.toString()) {
        role = 'admin';
      }

      return { hasAccess: true, role };

    } catch (error) {
      console.error('❌ Error checking chat permission:', error);
      return { hasAccess: false, role: null, error: error.message };
    }
  }

  /**
   * Get Firebase Auth instance for direct usage
   * @returns {Object} Firebase Auth instance
   */
  getAuth() {
    return this.auth;
  }
}

// Create singleton instance using existing Firebase configuration
const chatTokenService = new ChatTokenService();

// Export both the service and alternative initialization method
module.exports = chatTokenService;
module.exports.ChatTokenService = ChatTokenService;