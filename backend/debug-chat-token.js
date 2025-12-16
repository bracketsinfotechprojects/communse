/**
 * Debug Chat Token Service
 * 
 * This script helps debug issues with the chat token generation
 * Run this to identify the exact problem
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const chatTokenService = require('./src/services/chatTokenService');

// Configuration
const TEST_USER_ID = '6937ca8a627f152384ac1884';  // Replace with your actual user ID
const TEST_EVENT_ID = '693bb754eb012d2a43551197';  // Replace with your actual event ID

async function debugChatToken() {
  console.log('🔍 Debugging Chat Token Generation');
  console.log('==================================\n');

  try {
    // Step 1: Check MongoDB connection
    console.log('1️⃣ Checking MongoDB connection...');
    const connectionState = mongoose.connection.readyState;
    console.log('Connection state:', connectionState, '(1=connected, 2=connecting, 3=disconnecting, 0=disconnected)');
    
    if (connectionState !== 1) {
      console.log('❌ MongoDB not connected! Check your database connection.');
      console.log('Connection string:', process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
      return;
    }
    console.log('✅ MongoDB connected\n');

    // Step 2: Check Firebase configuration
    console.log('2️⃣ Checking Firebase configuration...');
    try {
      const auth = chatTokenService.getAuth();
      console.log('✅ Firebase auth accessible');
      
      // Test Firebase token creation
      const testClaims = { test: 'debug' };
      const testToken = await auth.createCustomToken('debug-user', testClaims);
      console.log('✅ Firebase token creation working');
      console.log('Test token length:', testToken.length);
    } catch (firebaseError) {
      console.log('❌ Firebase configuration error:', firebaseError.message);
      console.log('Check your Firebase service account configuration');
      return;
    }
    console.log('');

    // Step 3: Check if user exists
    console.log('3️⃣ Checking if user exists...');
    try {
      const user = await User.findById(TEST_USER_ID);
      if (user) {
        console.log('✅ User found:');
        console.log('  - ID:', user._id);
        console.log('  - Email:', user.email);
        console.log('  - Name:', user.firstName, user.lastName);
        console.log('  - Active:', user.isActive);
        console.log('  - Verified:', user.isVerified);
      } else {
        console.log('❌ User not found with ID:', TEST_USER_ID);
        console.log('Please check if this user ID exists in your database');
        return;
      }
    } catch (userError) {
      console.log('❌ User lookup error:', userError.message);
      return;
    }
    console.log('');

    // Step 4: Check if event exists
    console.log('4️⃣ Checking if event exists...');
    try {
      const event = await Event.findById(TEST_EVENT_ID);
      if (event) {
        console.log('✅ Event found:');
        console.log('  - ID:', event._id);
        console.log('  - Title:', event.title);
        console.log('  - Status:', event.status);
        console.log('  - Created by:', event.createdBy);
        console.log('  - Community ID:', event.communityId);
        console.log('  - Attendees count:', event.attendees ? event.attendees.length : 0);
        
        // Check if user is attending
        const isAttending = event.isUserAttending(TEST_USER_ID);
        console.log('  - User attending:', isAttending);
        
        if (!isAttending) {
          console.log('❌ User is not attending this event');
          console.log('Event attendees:', event.attendees.map(a => a.userId.toString()));
          return;
        }
      } else {
        console.log('❌ Event not found with ID:', TEST_EVENT_ID);
        console.log('Please check if this event ID exists in your database');
        return;
      }
    } catch (eventError) {
      console.log('❌ Event lookup error:', eventError.message);
      return;
    }
    console.log('');

    // Step 5: Generate chat token
    console.log('5️⃣ Generating chat token...');
    try {
      const token = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
      console.log('✅ Chat token generated successfully!');
      console.log('Token length:', token.length);
      console.log('Token preview:', token.substring(0, 50) + '...');
      
      // Verify the token
      const decodedPayload = await chatTokenService.verifyCustomToken(token);
      console.log('✅ Token verified');
      console.log('Claims:', {
        eventId: decodedPayload.claims?.eventId,
        role: decodedPayload.claims?.role,
        userId: decodedPayload.claims?.userId,
        communityId: decodedPayload.claims?.communityId
      });
      
      // Also show the full decoded payload for reference
      console.log('Full decoded payload:', decodedPayload);
      
    } catch (tokenError) {
      console.log('❌ Chat token generation failed:', tokenError.message);
      console.log('Full error:', tokenError);
      return;
    }

    console.log('\n🎉 Debug completed successfully!');
    
  } catch (error) {
    console.log('❌ Unexpected error during debug:', error.message);
    console.log('Full error:', error);
  }
  
  // Close database connection
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Alternative initialization with environment variables
async function debugWithEnvironmentVariables() {
  console.log('🔍 Debugging Chat Token Generation (Environment Variables)\n');
  
  try {
    const { ChatTokenService } = require('./src/services/chatTokenService');
    
    console.log('1️⃣ Checking environment variables...');
    const envVars = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
    };
    
    console.log('Environment variables status:', envVars);
    
    if (!envVars.projectId || !envVars.clientEmail || !envVars.hasPrivateKey) {
      console.log('❌ Missing environment variables. Please set:');
      console.log('  - FIREBASE_PROJECT_ID');
      console.log('  - FIREBASE_CLIENT_EMAIL');
      console.log('  - FIREBASE_PRIVATE_KEY');
      return;
    }
    
    console.log('2️⃣ Initializing with environment variables...');
    const chatTokenService = ChatTokenService.initializeWithEnvironmentVariables();
    
    // Test token generation
    const token = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
    console.log('✅ Token generated with environment variables:', token.substring(0, 50) + '...');
    
  } catch (error) {
    console.log('❌ Environment variable method failed:', error.message);
  }
}

// Main execution
async function main() {
  // Load environment variables
  require('dotenv').config();
  
  console.log('🔧 Starting Chat Token Debug\n');
  console.log('Test User ID:', TEST_USER_ID);
  console.log('Test Event ID:', TEST_EVENT_ID);
  console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
  console.log('Node Environment:', process.env.NODE_ENV || 'development');
  console.log('');

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // Run debug
  await debugChatToken();
  
  console.log('\n' + '='.repeat(50));
  console.log('If the above method failed, try environment variables method:');
  console.log('='.repeat(50));
  
  await debugWithEnvironmentVariables();
}

// Run debug if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { debugChatToken, debugWithEnvironmentVariables };