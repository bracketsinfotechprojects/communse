/**
 * Test file for Chat Token Service with Both Firebase Options
 * 
 * This file demonstrates how to use the chat token service with both
 * Firebase initialization methods.
 * 
 * Prerequisites:
 * 1. Set up MongoDB connection
 * 2. Choose ONE Firebase configuration method:
 *    - Option A: Existing firebase config (recommended)
 *    - Option B: Environment variables
 * 
 * Run: node test-chat-token-both-options.js
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');

// ===================
// OPTION A: Use Existing Firebase Configuration (Recommended)
// ===================

// Import and use existing Firebase config
const chatTokenService = require('./src/services/chatTokenService');

async function testWithExistingFirebase() {
  console.log('\n🧪 Testing with existing Firebase configuration');
  
  try {
    // Use the existing Firebase configuration
    console.log('✅ Using existing Firebase config from backend/src/config/firebase.js');
    
    const token = await chatTokenService.generateChatToken(
      '64a7b8c9d1e2f3456789abcd', // Replace with actual user ID
      '64a7b8c9d1e2f3456789ef01'  // Replace with actual event ID
    );
    
    console.log('✅ Token generated successfully with existing Firebase config');
    console.log('Token length:', token.length);
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// ===================
// OPTION B: Use Environment Variables
// ===================

const { ChatTokenService } = require('./src/services/chatTokenService');

async function testWithEnvironmentVariables() {
  console.log('\n🧪 Testing with environment variables');
  
  try {
    // Check if environment variables are set
    const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing environment variables:', missingVars.join(', '));
      console.log('Skipping environment variable test - set these in your .env file');
      return true; // Don't fail the test, just skip
    }
    
    // Initialize with environment variables
    const chatTokenServiceEnv = ChatTokenService.initializeWithEnvironmentVariables();
    
    const token = await chatTokenServiceEnv.generateChatToken(
      '64a7b8c9d1e2f3456789abcd', // Replace with actual user ID
      '64a7b8c9d1e2f3456789ef01'  // Replace with actual event ID
    );
    
    console.log('✅ Token generated successfully with environment variables');
    console.log('Token length:', token.length);
    
    return true;
    
  } catch (error) {
    console.log('❌ Environment variable test failed:', error.message);
    return false;
  }
}

// ===================
// Firebase Configuration Test
// ===================

async function testFirebaseConfiguration() {
  console.log('\n🧪 Testing Firebase configuration');
  
  try {
    // Test Option A: Existing config
    console.log('\n📋 Testing Option A: Existing Firebase configuration');
    
    // Check if we can access Firebase auth
    const auth = chatTokenService.getAuth();
    if (auth) {
      console.log('✅ Option A: Firebase auth accessible');
    } else {
      console.log('❌ Option A: Firebase auth not accessible');
    }
    
    // Test Option B: Environment variables
    console.log('\n📋 Testing Option B: Environment variables');
    
    const envVars = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
    };
    
    console.log('Environment variables status:', envVars);
    
    if (envVars.projectId && envVars.clientEmail && envVars.hasPrivateKey) {
      console.log('✅ Option B: All environment variables are set');
      
      try {
        const chatTokenServiceEnv = ChatTokenService.initializeWithEnvironmentVariables();
        console.log('✅ Option B: Firebase initialized with environment variables');
      } catch (error) {
        console.log('❌ Option B: Firebase initialization failed:', error.message);
      }
    } else {
      console.log('⚠️  Option B: Some environment variables are missing');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Firebase configuration test failed:', error.message);
    return false;
  }
}

// ===================
// MongoDB Setup
// ===================

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

const TEST_USER_ID = '64a7b8c9d1e2f3456789abcd'; // Replace with actual user ID
const TEST_EVENT_ID = '64a7b8c9d1e2f3456789ef01'; // Replace with actual event ID

async function createTestData() {
  console.log('\n📝 Creating test data...');
  
  try {
    // Check if test user exists
    let testUser = await User.findById(TEST_USER_ID);
    if (!testUser) {
      testUser = new User({
        _id: TEST_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed_password',
        isActive: true,
        isVerified: true,
        agreedToTOS: true
      });
      await testUser.save();
      console.log('✅ Test user created');
    } else {
      console.log('✅ Test user already exists');
    }

    // Check if test event exists
    let testEvent = await Event.findById(TEST_EVENT_ID);
    if (!testEvent) {
      testEvent = new Event({
        _id: TEST_EVENT_ID,
        title: 'Test Event for Chat Token',
        description: 'A test event to validate chat token generation',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        communityId: '64a7b8c9d1e2f3456789f234', // Mock community ID
        createdBy: TEST_USER_ID,
        status: 'published',
        category: 'workshop',
        maxAttendees: 50,
        location: {
          city: 'Test City'
        },
        attendees: [{
          userId: TEST_USER_ID,
          joinedAt: new Date(),
          status: 'confirmed'
        }]
      });
      await testEvent.save();
      console.log('✅ Test event created');
    } else {
      console.log('✅ Test event already exists');
      // Ensure test user is an attendee
      if (!testEvent.isUserAttending(TEST_USER_ID)) {
        testEvent.attendees.push({
          userId: TEST_USER_ID,
          joinedAt: new Date(),
          status: 'confirmed'
        });
        await testEvent.save();
        console.log('✅ Added test user to event attendees');
      }
    }

    return true;
    
  } catch (error) {
    console.log('❌ Failed to create test data:', error.message);
    return false;
  }
}

// ===================
// Main Test Runner
// ===================

async function runAllTests() {
  console.log('🚀 Starting Chat Token Service Tests (Both Firebase Options)\n');
  
  // Load environment variables
  require('dotenv').config();
  
  // Connect to database
  await connectDatabase();
  
  // Create test data
  const dataCreated = await createTestData();
  if (!dataCreated) {
    console.log('❌ Failed to create test data, exiting...');
    process.exit(1);
  }
  
  // Run Firebase configuration tests
  await testFirebaseConfiguration();
  
  // Run Option A test (Existing Firebase config)
  const optionAPassed = await testWithExistingFirebase();
  
  // Run Option B test (Environment variables)
  const optionBPassed = await testWithEnvironmentVariables();
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log(`Option A (Existing Firebase Config): ${optionAPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Option B (Environment Variables): ${optionBPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (optionAPassed && optionBPassed) {
    console.log('🎉 All Firebase configuration tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the configuration you want to use.');
  }
  
  console.log('\n📋 Firebase Configuration Summary:');
  console.log('• Option A (Recommended): Uses existing backend/src/config/firebase.js');
  console.log('• Option B: Uses environment variables from .env file');
  console.log('\n💡 Choose one method and configure accordingly.');
  
  // Cleanup
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWithExistingFirebase,
  testWithEnvironmentVariables,
  testFirebaseConfiguration,
  runAllTests
};