const mongoose = require('mongoose');
const Interest = require('./backend/src/models/Interest');

// Connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return testAutoSuggestion();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function testAutoSuggestion() {
  try {
    console.log('\n🧪 Testing Interest Auto-Suggestion...\n');

    // Clean up and seed test data
    await Interest.deleteMany({ name: { $in: ['Cricket', 'Photography', 'Technology', 'Sports', 'Reading'] } });
    
    const testInterests = ['Cricket', 'Photography', 'Technology', 'Sports', 'Reading'];
    for (const interestName of testInterests) {
      await new Interest({ name: interestName }).save();
    }
    console.log('✅ Seeded test interests:', testInterests);

    console.log('\n1. Testing all interests (no search)...');
    const allInterests = await Interest.find({}).sort({ name: 1 });
    console.log('All interests:', allInterests.map(i => i.name));

    console.log('\n2. Testing auto-suggestion with search...');
    
    // Test search for "Cricket"
    const searchResults1 = await Interest.find({
      name: { $regex: new RegExp('cricket', 'i') }
    }).sort({ name: 1 });
    console.log('Search "cricket":', searchResults1.map(i => i.name));

    // Test search for "Photo"
    const searchResults2 = await Interest.find({
      name: { $regex: new RegExp('photo', 'i') }
    }).sort({ name: 1 });
    console.log('Search "photo":', searchResults2.map(i => i.name));

    // Test search for "tech"
    const searchResults3 = await Interest.find({
      name: { $regex: new RegExp('tech', 'i') }
    }).sort({ name: 1 });
    console.log('Search "tech":', searchResults3.map(i => i.name));

    // Test search for "s" (multiple results)
    const searchResults4 = await Interest.find({
      name: { $regex: new RegExp('s', 'i') }
    }).sort({ name: 1 });
    console.log('Search "s":', searchResults4.map(i => i.name));

    // Test search for non-existent
    const searchResults5 = await Interest.find({
      name: { $regex: new RegExp('xyz', 'i') }
    }).sort({ name: 1 });
    console.log('Search "xyz":', searchResults5.map(i => i.name));

    console.log('\n3. Testing case-insensitive search...');
    
    // Test different case variations
    const searchResults6 = await Interest.find({
      name: { $regex: new RegExp('CRICKET', 'i') }
    }).sort({ name: 1 });
    console.log('Search "CRICKET":', searchResults6.map(i => i.name));

    const searchResults7 = await Interest.find({
      name: { $regex: new RegExp('CrIcKeT', 'i') }
    }).sort({ name: 1 });
    console.log('Search "CrIcKeT":', searchResults7.map(i => i.name));

    console.log('\n4. Testing with limit...');
    
    const searchResults8 = await Interest.find({
      name: { $regex: new RegExp('s', 'i') }
    }).sort({ name: 1 }).limit(2);
    console.log('Search "s" with limit 2:', searchResults8.map(i => i.name));

    console.log('\n🎉 Auto-suggestion tests completed successfully!');
    console.log('\n📋 API Usage Examples:');
    console.log('GET /api/interests                          → All interests');
    console.log('GET /api/interests?search=cricket           → Search "cricket"');
    console.log('GET /api/interests?search=photo&limit=5     → Search "photo" max 5 results');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Disconnected from MongoDB');
  }
}