const User = require('./src/models/User');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Check if test user already exists
    let testUser = await User.findOne({ email: 'test@firebase.com' });
    
    if (!testUser) {
      testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@firebase.com',
        mobileNumber: '+1234567890',
        password: 'test123',
        isActive: true,
        isVerified: true
      });
      
      await testUser.save();
      console.log('✅ Test user created successfully!');
      console.log(`User ID: ${testUser._id}`);
      console.log(`Email: ${testUser.email}`);
    } else {
      console.log('✅ Test user already exists!');
      console.log(`User ID: ${testUser._id}`);
      console.log(`Email: ${testUser.email}`);
    }
    
    return testUser;
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
}

// Run the function
createTestUser()
  .then((user) => {
    console.log('\n🎉 Test user setup completed!');
    console.log(`Use this user ID for testing: ${user._id}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  });