const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./backend/src/models/User');

// Import database connection
const connectDB = require('./backend/src/config/database');

// Mumbai, Thane suburb location details
const MUMBAI_LOCATION = {
  coordinates: {
    latitude: 19.2183,
    longitude: 72.9781
  },
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  method: 'manual',
  lastUpdated: new Date()
};

// Sample user data for creating users if needed
const SAMPLE_USERS = [
  { username: 'user1_mumbai', email: 'user1@mumbai.com', firstName: 'Amit', lastName: 'Sharma' },
  { username: 'user2_mumbai', email: 'user2@mumbai.com', firstName: 'Priya', lastName: 'Patel' },
  { username: 'user3_mumbai', email: 'user3@mumbai.com', firstName: 'Rahul', lastName: 'Singh' },
  { username: 'user4_mumbai', email: 'user4@mumbai.com', firstName: 'Sneha', lastName: 'Kulkarni' },
  { username: 'user5_mumbai', email: 'user5@mumbai.com', firstName: 'Vikram', lastName: 'Joshi' },
  { username: 'user6_mumbai', email: 'user6@mumbai.com', firstName: 'Anjali', lastName: 'Mehta' },
  { username: 'user7_mumbai', email: 'user7@mumbai.com', firstName: 'Rohit', lastName: 'Gupta' },
  { username: 'user8_mumbai', email: 'user8@mumbai.com', firstName: 'Kavya', lastName: 'Reddy' },
  { username: 'user9_mumbai', email: 'user9@mumbai.com', firstName: 'Arjun', lastName: 'Nair' },
  { username: 'user10_mumbai', email: 'user10@mumbai.com', firstName: 'Neha', lastName: 'Agarwal' },
  { username: 'user11_mumbai', email: 'user11@mumbai.com', firstName: 'Saurabh', lastName: 'Verma' },
  { username: 'user12_mumbai', email: 'user12@mumbai.com', firstName: 'Riya', lastName: 'Jain' }
];

/**
 * Create sample users if needed
 */
async function createSampleUsers() {
  console.log('\n=== Creating Sample Users ===');
  const createdUsers = [];
  
  for (const userData of SAMPLE_USERS) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        console.log(`User ${userData.username} already exists`);
        createdUsers.push(existingUser);
        continue;
      }

      // Create new user
      const user = new User({
        ...userData,
        passwordHash: await bcrypt.hash('password123', 10),
        mobileNumber: `+91${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
        role: 'user',
        isActive: true,
        isVerified: true,
        agreedToTOS: true,
        interests: ['technology', 'music', 'sports'],
        lastLogin: new Date()
      });

      await user.save();
      createdUsers.push(user);
      console.log(`✓ Created user: ${userData.username} (${userData.email})`);
    } catch (error) {
      console.error(`✗ Failed to create user ${userData.username}:`, error.message);
    }
  }
  
  return createdUsers;
}

/**
 * Update user locations using bulk operations
 */
async function bulkUpdateUserLocations() {
  console.log('\n=== Bulk Update User Locations ===');
  
  try {
    // Get 12 users to update
    const usersToUpdate = await User.find({ 
      isActive: true 
    }).limit(12);
    
    if (usersToUpdate.length === 0) {
      console.log('No active users found in database');
      return [];
    }
    
    console.log(`Found ${usersToUpdate.length} active users to update`);
    
    // Prepare bulk operations
    const bulkOps = usersToUpdate.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            location: {
              ...MUMBAI_LOCATION,
              lastUpdated: new Date()
            }
          }
        }
      }
    }));
    
    // Execute bulk operation
    const result = await User.bulkWrite(bulkOps);
    
    console.log(`✓ Bulk update completed:`);
    console.log(`  - Matched: ${result.matchedCount || 0}`);
    console.log(`  - Modified: ${result.modifiedCount || 0}`);
    console.log(`  - Upserts: ${result.upsertedCount || 0}`);
    
    return usersToUpdate;
  } catch (error) {
    console.error('✗ Bulk update failed:', error.message);
    throw error;
  }
}

/**
 * Update user locations individually
 */
async function individualUpdateUserLocations() {
  console.log('\n=== Individual Update User Locations ===');
  
  try {
    // Get 12 users to update
    const usersToUpdate = await User.find({ 
      isActive: true 
    }).limit(12);
    
    if (usersToUpdate.length === 0) {
      console.log('No active users found in database');
      return [];
    }
    
    console.log(`Found ${usersToUpdate.length} active users to update`);
    
    const updateResults = [];
    
    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      try {
        // Update individual user
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              location: {
                ...MUMBAI_LOCATION,
                lastUpdated: new Date()
              }
            }
          },
          { new: true }
        );
        
        updateResults.push({
          userId: user._id,
          username: user.username,
          success: true,
          data: updatedUser
        });
        
        console.log(`✓ Updated user ${i + 1}/12: ${user.username} (${user.email})`);
      } catch (error) {
        updateResults.push({
          userId: user._id,
          username: user.username,
          success: false,
          error: error.message
        });
        
        console.error(`✗ Failed to update user ${user.username}:`, error.message);
      }
    }
    
    const successful = updateResults.filter(r => r.success).length;
    const failed = updateResults.filter(r => !r.success).length;
    
    console.log(`\nIndividual update summary:`);
    console.log(`  - Successful: ${successful}`);
    console.log(`  - Failed: ${failed}`);
    
    return updateResults;
  } catch (error) {
    console.error('✗ Individual update failed:', error.message);
    throw error;
  }
}

/**
 * Verify updates by checking updated users
 */
async function verifyUpdates() {
  console.log('\n=== Verifying Updates ===');
  
  try {
    const updatedUsers = await User.find({
      'location.city': 'Mumbai',
      'location.state': 'Maharashtra',
      'location.country': 'India'
    }).limit(12);
    
    console.log(`Found ${updatedUsers.length} users with Mumbai location:`);
    
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   Location: ${user.location.city}, ${user.location.state}, ${user.location.country}`);
      console.log(`   Coordinates: ${user.location.coordinates.latitude}, ${user.location.coordinates.longitude}`);
      console.log(`   Method: ${user.location.method}`);
      console.log(`   Last Updated: ${user.location.lastUpdated}`);
    });
    
    return updatedUsers;
  } catch (error) {
    console.error('✗ Verification failed:', error.message);
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  console.log('\n=== Database Statistics ===');
  
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const mumbaiUsers = await User.countDocuments({
      'location.city': 'Mumbai',
      'location.state': 'Maharashtra'
    });
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Active users: ${activeUsers}`);
    console.log(`Verified users: ${verifiedUsers}`);
    console.log(`Users in Mumbai: ${mumbaiUsers}`);
    
    return { totalUsers, activeUsers, verifiedUsers, mumbaiUsers };
  } catch (error) {
    console.error('✗ Failed to get database stats:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('=== MongoDB User Location Update Script ===');
  console.log('Target: Update 12 users to Mumbai, Thane suburbs');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Connect to database
    console.log('\n=== Connecting to Database ===');
    await connectDB();
    console.log('✓ Database connected successfully');
    
    // Get initial database stats
    await getDatabaseStats();
    
    // Check if we have enough users
    const userCount = await User.countDocuments({ isActive: true });
    console.log(`\nCurrent active users: ${userCount}`);
    
    if (userCount < 12) {
      console.log(`Need to create ${12 - userCount} more users...`);
      await createSampleUsers();
    }
    
    // Perform bulk update
    console.log('\n=== Choosing Update Method ===');
    console.log('Running BOTH bulk and individual updates for demonstration...');
    
    const bulkResults = await bulkUpdateUserLocations();
    await getDatabaseStats(); // Check stats after bulk update
    
    // Wait a bit between operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Perform individual update (on different users if possible)
    const individualResults = await individualUpdateUserLocations();
    
    // Final verification
    await verifyUpdates();
    await getDatabaseStats();
    
    console.log('\n=== Script Completed Successfully ===');
    
  } catch (error) {
    console.error('\n=== Script Failed ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

// Execute script if run directly
if (require.main === module) {
  main();
}

module.exports = {
  MUMBAI_LOCATION,
  bulkUpdateUserLocations,
  individualUpdateUserLocations,
  createSampleUsers,
  verifyUpdates,
  getDatabaseStats
};