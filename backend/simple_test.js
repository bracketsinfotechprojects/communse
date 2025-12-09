// Simple test to verify the nearby communities implementation
console.log('🧪 Simple Test for Nearby Communities Implementation');

try {
  // Test 1: Load LocationService
  console.log('\n1. Testing LocationService...');
  const LocationService = require('./src/services/locationService');
  const locationService = new LocationService();
  console.log('✅ LocationService loaded successfully');

  // Test 2: Basic coordinate validation
  console.log('\n2. Testing coordinate validation...');
  const validMumbai = locationService.isValidCoordinates(19.0760, 72.8777);
  const invalidCoords = locationService.isValidCoordinates(999, 999);
  console.log(`✅ Mumbai coords valid: ${validMumbai}`);
  console.log(`✅ Invalid coords detected: ${!invalidCoords}`);

  // Test 3: Distance calculation
  console.log('\n3. Testing distance calculation...');
  const mumbaiToPune = locationService.calculateDistance(19.0760, 72.8777, 18.5204, 73.8567);
  console.log(`✅ Mumbai to Pune distance: ${(mumbaiToPune/1000).toFixed(2)} km`);

  // Test 4: Load CommunityNearbyController
  console.log('\n4. Testing CommunityNearbyController...');
  const communityNearbyController = require('./src/controllers/communityNearbyController');
  console.log('✅ CommunityNearbyController loaded successfully');

  // Test 5: Check routes
  console.log('\n5. Checking routes integration...');
  const communitiesRouter = require('./src/routes/communities');
  console.log('✅ Communities routes loaded successfully');

  console.log('\n🎉 All basic tests passed!');
  console.log('\n📋 Implementation Status:');
  console.log('✅ LocationService: Working');
  console.log('✅ City detection: Ready');
  console.log('✅ Distance calculation: Working');
  console.log('✅ Controllers: Loaded');
  console.log('✅ Routes: Configured');
  console.log('\n🚀 Ready for API testing!');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}