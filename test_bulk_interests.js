const mongoose = require('mongoose');
const Interest = require('./backend/src/models/Interest');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    testBulkInterests();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function testBulkInterests() {
  try {
    console.log('\n🧪 Testing Bulk Interest Creation...\n');

    console.log('1. Testing bulk creation...');
    
    const interests = ['Hiking', 'Cooking', 'Music', 'Travel', 'Art'];
    const createdInterests = [];
    const errors = [];

    for (let i = 0; i < interests.length; i++) {
      try {
        const interest = new Interest({
          name: interests[i].trim(),
          createdBy: new mongoose.Types.ObjectId()
        });
        await interest.save();
        createdInterests.push(interest);
        console.log(`✅ Created: ${interest.name}`);
      } catch (error) {
        if (error.code === 11000) {
          errors.push({
            index: i,
            name: interests[i],
            error: 'Interest already exists'
          });
          console.log(`⚠️ Duplicate: ${interests[i]}`);
        } else {
          errors.push({
            index: i,
            name: interests[i],
            error: error.message
          });
          console.log(`❌ Failed: ${interests[i]} - ${error.message}`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  - Requested: ${interests.length}`);
    console.log(`  - Created: ${createdInterests.length}`);
    console.log(`  - Failed: ${errors.length}`);

    if (createdInterests.length > 0) {
      console.log('\n📋 Created interests:');
      createdInterests.forEach(interest => {
        console.log(`  - "${interest.name}" (${interest._id})`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ Failed interests:');
      errors.forEach(error => {
        console.log(`  - "${error.name}": ${error.error}`);
      });
    }

    console.log('\n🎉 Bulk interest test completed!');

    // Cleanup
    await Interest.deleteMany({ name: { $in: ['Hiking', 'Cooking', 'Music', 'Travel', 'Art'] } });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Disconnected from MongoDB');
  }
}