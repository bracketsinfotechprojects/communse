/**
 * Test file for Chat Token Service
 * 
 * This file demonstrates how to use the chat token service and tests its functionality.
 * 
 * Prerequisites:
 * 1. Set up MongoDB connection
 * 2. Configure Firebase environment variables
 * 3. Create test user and event in MongoDB
 * 
 * Run: node test-chat-token-service.js
 */

const chatTokenService = require('./src/services/chatTokenService');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');

// MongoDB connection
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Test data - Replace with actual MongoDB ObjectIds from your database
const TEST_USER_ID = '64a7b8c9d1e2f3456789abcd'; // Replace with actual user ID
const TEST_EVENT_ID = '64a7b8c9d1e2f3456789ef01'; // Replace with actual event ID

/**
 * Test 1: Generate chat token with valid user and event
 */
async function testValidTokenGeneration() {
  console.log('\n🧪 Test 1: Generate token with valid user and event');
  
  try {
    const token = await chatTokenService.generateChatToken(TEST_USER_ID, TEST_EVENT_ID);
    
    if (token && token.length > 100) {
      console.log('✅ Token generated successfully');
      console.log('Token length:', token.length);
      
      // Verify the token
      const claims = await chatTokenService.verifyCustomToken(token);
      console.log('✅ Token verified');
      console.log('Claims:', {
        eventId: claims.eventId,
        role: claims.role,
        userId: claims.userId,
        communityId: claims.communityId
      });
      
      return true;
    } else {
      console.log('❌ Token generation failed - invalid token');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Check chat permission
 */
async function testChatPermission() {
  console.log('\n🧪 Test 2: Check chat permission');
  
  try {
    const permission = await chatTokenService.checkChatPermission(TEST_USER_ID, TEST_EVENT_ID);
    
    console.log('Permission result:', permission);
    
    if (permission.hasAccess) {
      console.log('✅ User has chat access');
      console.log('Role:', permission.role);
      return true;
    } else {
      console.log('❌ User does not have chat access');
      console.log('Error:', permission.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Permission check failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Generate token with invalid user ID
 */
async function testInvalidUser() {
  console.log('\n🧪 Test 3: Generate token with invalid user ID');
  
  try {
    await chatTokenService.generateChatToken('invalid_user_id', TEST_EVENT_ID);
    console.log('❌ Should have failed with invalid user ID');
    return false;
    
  } catch (error) {
    console.log('✅ Correctly rejected invalid user ID:', error.message);
    return true;
  }
}

/**
 * Test 4: Generate token with non-existent event
 */
async function testInvalidEvent() {
  console.log('\n🧪 Test 4: Generate token with non-existent event');
  
  try {
    await chatTokenService.generateChatToken(TEST_USER_ID, '64a7b8c9d1e2f3456789ffff');
    console.log('❌ Should have failed with non-existent event');
    return false;
    
  } catch (error) {
    console.log('✅ Correctly rejected non-existent event:', error.message);
    return true;
  }
}

/**
 * Test 5: Generate token with invalid ObjectId format
 */
async function testInvalidObjectId() {
  console.log('\n🧪 Test 5: Generate token with invalid ObjectId format');
  
  try {
    await chatTokenService.generateChatToken('invalid_id', 'also_invalid');
    console.log('❌ Should have failed with invalid ObjectId');
    return false;
    
  } catch (error) {
    console.log('✅ Correctly rejected invalid ObjectId:', error.message);
    return true;
  }
}

/**
 * Test 6: Missing parameters
 */
async function testMissingParameters() {
  console.log('\n🧪 Test 6: Generate token with missing parameters');
  
  try {
    await chatTokenService.generateChatToken(null, TEST_EVENT_ID);
    console.log('❌ Should have failed with missing userId');
    return false;
    
  } catch (error) {
    console.log('✅ Correctly rejected missing parameters:', error.message);
    return true;
  }
}

/**
 * Create sample test data
 */
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

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Chat Token Service Tests\n');
  
  // Connect to database
  await connectDatabase();
  
  // Create test data
  const dataCreated = await createTestData();
  if (!dataCreated) {
    console.log('❌ Failed to create test data, exiting...');
    process.exit(1);
  }
  
  // Run tests
  const tests = [
    { name: 'Valid Token Generation', test: testValidTokenGeneration },
    { name: 'Chat Permission Check', test: testChatPermission },
    { name: 'Invalid User ID', test: testInvalidUser },
    { name: 'Invalid Event ID', test: testInvalidEvent },
    { name: 'Invalid ObjectId Format', test: testInvalidObjectId },
    { name: 'Missing Parameters', test: testMissingParameters }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const passed = await test.test();
    if (passed) {
      passedTests++;
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
  
  // Cleanup
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testValidTokenGeneration,
  testChatPermission,
  testInvalidUser,
  testInvalidEvent,
  testInvalidObjectId,
  testMissingParameters,
  runAllTests
};