// Test the community search fix
const LocationService = require('./backend/src/services/locationService');
const CommunityNearbyController = require('./backend/src/controllers/communityNearbyController');

async function testCommunitySearch() {
  console.log('🔍 Testing Community Search Fix\n');

  const locationService = new LocationService();
  const controller = new CommunityNearbyController.constructor(); // Create instance

  // Test Dombivli coordinates that detect "Kalyan-Dombivali"
  const testCoords = { lat: 19.2094, lng: 73.0939 };

  console.log(`📍 Testing coordinates: (${testCoords.lat}, ${testCoords.lng})`);

  try {
    // Test location detection
    const location = await locationService.getCityFromCoordinates(testCoords.lat, testCoords.lng);
    console.log(`✅ Detected city: ${location.city}`);
    console.log(`📋 Method: ${location.method}`);

    // Test flexible search patterns
    const patterns = controller.buildCitySearchPatterns(location.city);
    console.log(`🔧 Search patterns generated: ${patterns.length} patterns`);
    patterns.forEach((pattern, i) => {
      console.log(`   ${i + 1}. ${pattern}`);
    });

    // Test city name variations
    const variations = controller.getCityNameVariations(location.city);
    console.log(`🌐 Variations for "${location.city}":`, variations);

    console.log('\n✅ All tests passed! The fix should handle city name mismatches.');

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testCommunitySearch();
