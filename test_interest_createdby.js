const mongoose = require('mongoose');
const Interest = require('./backend/src/models/Interest');
const User = require('./backend/src/models/User');

// Connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return testInterestCreatedBy();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function testInterestCreatedBy() {
  try {
    console.log('\n🧪 Testing Interest CreatedBy Functionality...\n');

    // Create a test user
    const testUser = new User({
      username: 'testuser123',
      email: 'testuser@example.com',
      passwordHash: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      agreedToTOS: true
    });
    await testUser.save();
    console.log('✅ Created test user:', testUser._id);

    console.log('\n1. Testing interest creation with createdBy...');
    
    // Test 1: Create interest as the test user
    const interest1 = new Interest({
      name: 'Test Interest',
      createdBy: testUser._id  // Direct MongoDB ObjectId for testing
    });
    await interest1.save();
    console.log('✅ Created interest with createdBy:', {
      name: interest1.name,
      createdBy: interest1.createdBy,
      creator: testUser.username
    });

    // Test 2: Create another interest as the same user
    const interest2 = new Interest({
      name: 'Another Test Interest',
      createdBy: testUser._id  // Direct MongoDB ObjectId for testing
    });
    await interest2.save();
    console.log('✅ Created second interest with same creator:', {
      name: interest2.name,
      createdBy: interest2.createdBy,
      creator: testUser.username
    });

    console.log('\n2. Testing interest queries with populate...');
    
    // Test 3: Query interests with populated creator info
    const interestsWithCreator = await Interest.find({})
      .populate('createdBy', 'username firstName lastName')
      .sort({ createdAt: -1 });

    console.log('📋 Interests with creator details:');
    interestsWithCreator.forEach(interest => {
      console.log(`  - "${interest.name}" by ${interest.createdBy.firstName} ${interest.createdBy.lastName} (@${interest.createdBy.username})`);
    });

    console.log('\n3. Testing createdBy field validation...');
    
    // Test 4: Try to create interest without createdBy (should fail)
    try {
      const invalidInterest = new Interest({
        name: 'Invalid Interest'
      });
      await invalidInterest.save();
      console.log('❌ ERROR: Should have failed without createdBy!');
    } catch (error) {
      console.log('✅ Correctly rejected interest without createdBy:', error.message);
    }

    console.log('\n4. Testing createdBy references...');
    
    // Test 5: Verify createdBy is ObjectId
    const rawInterest = await Interest.findOne({ name: 'Test Interest' });
    console.log('✅ Raw interest createdBy field:', {
      value: rawInterest.createdBy,
      type: typeof rawInterest.createdBy,
      isObjectId: mongoose.Types.ObjectId.isValid(rawInterest.createdBy)
    });

    console.log('\n5. Testing user can see their created interests...');
    
    // Test 6: Find all interests created by our test user
    const userCreatedInterests = await Interest.find({
      createdBy: testUser._id
    }).sort({ createdAt: -1 });

    console.log('📋 Interests created by test user:');
    userCreatedInterests.forEach(interest => {
      console.log(`  - "${interest.name}" (created: ${interest.createdAt.toISOString()})`);
    });

    console.log('\n🎉 CreatedBy functionality tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Total interests created: ${interestsWithCreator.length}`);
    console.log(`  - Interests by test user: ${userCreatedInterests.length}`);
    console.log(`  - CreatedBy field working: ${rawInterest.createdBy ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    try {
      await Interest.deleteMany({ name: { $in: ['Test Interest', 'Another Test Interest'] } });
      await User.deleteMany({ username: 'testuser123' });
      console.log('\n🧹 Cleaned up test data');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError);
    }
    
    await mongoose.connection.close();
    console.log('\n📡 Disconnected from MongoDB');
  }
}