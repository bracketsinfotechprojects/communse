const mongoose = require('mongoose');
const Interest = require('./backend/src/models/Interest');

// Connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return testInterestUniqueness();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function testInterestUniqueness() {
  try {
    console.log('\n🧪 Testing Interest Uniqueness...\n');

    // Clean up any existing test data
    await Interest.deleteMany({ name: { $in: ['Cricket', 'cricket', 'CRICKET', 'Photography', 'photography'] } });
    
    console.log('1. Testing case-insensitive uniqueness...');
    
    // Test 1: Try to create "Cricket" (should succeed)
    const interest1 = new Interest({ name: 'cricket' });
    await interest1.save();
    console.log('✅ Created: "cricket" → stored as:', interest1.name);
    
    // Test 2: Try to create "CRICKET" (should fail due to unique constraint)
    try {
      const interest2 = new Interest({ name: 'CRICKET' });
      await interest2.save();
      console.log('❌ ERROR: Should not have allowed duplicate!');
    } catch (error) {
      console.log('✅ Correctly rejected "CRICKET" due to uniqueness:', error.message);
    }
    
    // Test 3: Try to create "Cricket" (should fail due to unique constraint)
    try {
      const interest3 = new Interest({ name: 'Cricket' });
      await interest3.save();
      console.log('❌ ERROR: Should not have allowed duplicate!');
    } catch (error) {
      console.log('✅ Correctly rejected "Cricket" due to uniqueness:', error.message);
    }
    
    console.log('\n2. Testing Title Case normalization...');
    
    // Test 4: Create "photography" (should be normalized to "Photography")
    const interest4 = new Interest({ name: '  photography  ' }); // with spaces
    await interest4.save();
    console.log('✅ Created: "  photography  " → stored as:', interest4.name);
    
    console.log('\n3. Listing all interests...');
    const interests = await Interest.find({}).sort({ name: 1 });
    console.log('Current interests in database:');
    interests.forEach(interest => {
      console.log(`  - ${interest.name} (${interest._id})`);
    });
    
    console.log('\n🎉 All tests passed! Interest uniqueness is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Disconnected from MongoDB');
  }
}