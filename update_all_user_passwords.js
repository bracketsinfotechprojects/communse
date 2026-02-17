const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Import User model
const User = require('./backend/src/models/User');

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Update all user passwords
const updateAllPasswords = async () => {
  try {
    console.log('🔐 Starting password update for all users...');
    
    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to update`);
    
    const newPassword = 'CRM@123';
    let updatedCount = 0;
    
    for (const user of users) {
      // Set the password hash directly (it will be auto-hashed by pre-save middleware)
      user.passwordHash = newPassword;
      await user.save();
      updatedCount++;
      
      console.log(`✅ Updated password for user: ${user.username} (${user.email})`);
    }
    
    console.log(`🎉 Successfully updated passwords for ${updatedCount} users`);
    console.log(`🔑 All users now have password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await updateAllPasswords();
};

run();