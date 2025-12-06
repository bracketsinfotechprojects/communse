// MongoDB Script to Empty joinedCommunities Array
// Usage: node empty_user_communities.js <user_id_or_username>

const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
require('dotenv').config({ path: './backend/.env' });

async function emptyUserCommunities(identifier) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
    console.log('✅ Connected to MongoDB');

    let user;
    
    // Check if identifier is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
      console.log(`🔍 Searching by ObjectId: ${identifier}`);
    } else {
      user = await User.findOne({ username: identifier });
      console.log(`🔍 Searching by username: ${identifier}`);
    }

    if (!user) {
      console.log(`❌ User not found: ${identifier}`);
      return;
    }

    console.log(`👤 Found user: ${user.username} (${user.email})`);
    console.log(`📊 Current communities count: ${user.joinedCommunities?.length || 0}`);

    // Empty the joinedCommunities array
    user.joinedCommunities = [];
    await user.save();

    console.log(`✅ Successfully emptied joinedCommunities for ${user.username}`);
    console.log(`📊 New communities count: ${user.joinedCommunities?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get identifier from command line arguments
const identifier = process.argv[2];

if (!identifier) {
  console.log('❌ Please provide a user ID or username');
  console.log('Usage: node empty_user_communities.js <user_id_or_username>');
  console.log('Example: node empty_user_communities.js 507f1f77bcf86cd799439011');
  console.log('Example: node empty_user_communities.js john_doe');
  process.exit(1);
}

emptyUserCommunities(identifier);

// Alternative: Function to empty all users' communities (use with caution)
async function emptyAllUsersCommunities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/commapp');
    console.log('✅ Connected to MongoDB');

    const result = await User.updateMany(
      { joinedCommunities: { $exists: true, $ne: [] } },
      { $set: { joinedCommunities: [] } }
    );

    console.log(`✅ Emptied joinedCommunities for ${result.modifiedCount} users`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// To run empty all users communities, uncomment the line below:
// emptyAllUsersCommunities();