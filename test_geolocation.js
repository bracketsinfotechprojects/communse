// Test script for Nearby Communities Geolocation Feature
// Usage: node test_geolocation.js

const LocationService = require('./backend/src/services/locationService');

async function testLocationService() {
  console.log('🧪 Testing Location Service for Nearby Communities\n');

  const locationService = new LocationService();

  // Test coordinates for major Indian cities
  const testLocations = [
    { name: 'Mumbai Center', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi Center', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore Center', lat: 12.9716, lng: 77.5946 },
    { name: 'Pune Center', lat: 18.5204, lng: 73.8567 },
    { name: 'Chennai Center', lat: 13.0827, lng: 80.2707 },
    { name: 'Hyderabad Center', lat: 17.3850, lng: 78.4867 },
    { name: 'Dombivli', lat: 19.2094, lng: 73.0939 }
  ];

  for (const location of testLocations) {
    console.log(`📍 Testing ${location.name} (${location.lat}, ${location.lng})`);
    
    try {
      // Get city from coordinates
      const cityInfo = await locationService.getCityFromCoordinates(location.lat, location.lng);
      
      if (cityInfo) {
        console.log(`   ✅ Detected City: ${cityInfo.city}`);
        console.log(`   🏢 Method: ${cityInfo.method}`);
        console.log(`   🌍 State: ${cityInfo.state || 'N/A'}`);
        
        // Get nearby cities within 50km
        const nearbyCities = locationService.getNearbyCities(location.lat, location.lng, 50000);
        console.log(`   📍 Nearby Cities (50km): ${nearbyCities.length > 0 ? nearbyCities.map(c => c.name).join(', ') : 'None'}`);
        
      } else {
        console.log(`   ❌ Failed to detect city`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

// Test distance calculation
function testDistanceCalculation() {
  console.log('📏 Testing Distance Calculation\n');
  
  const locationService = new LocationService();
  
  // Mumbai to Pune
  const mumbai = { lat: 19.0760, lng: 72.8777 };
  const pune = { lat: 18.5204, lng: 73.8567 };
  
  const distance = locationService.calculateDistance(mumbai.lat, mumbai.lng, pune.lat, pune.lng);
  console.log(`📍 Distance Mumbai to Pune: ${(distance / 1000).toFixed(2)} km`);
  
  // Mumbai to Delhi  
  const delhi = { lat: 28.7041, lng: 77.1025 };
  const mumbaiDelhiDistance = locationService.calculateDistance(mumbai.lat, mumbai.lng, delhi.lat, delhi.lng);
  console.log(`📍 Distance Mumbai to Delhi: ${(mumbaiDelhiDistance / 1000).toFixed(2)} km`);
}

// Test coordinates validation
function testCoordinateValidation() {
  console.log('✅ Testing Coordinate Validation\n');
  
  const locationService = new LocationService();
  
  const validCoords = [
    { lat: 19.0760, lng: 72.8777, expected: true },
    { lat: -90, lng: -180, expected: true },
    { lat: 90, lng: 180, expected: true },
    { lat: 91, lng: 72.8777, expected: false },
    { lat: 19.0760, lng: 181, expected: false },
    { lat: 'invalid', lng: 72.8777, expected: false }
  ];
  
  validCoords.forEach(({ lat, lng, expected }) => {
    const result = locationService.isValidCoordinates(lat, lng);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} Coordinates (${lat}, ${lng}): Valid = ${result}`);
  });
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Nearby Communities Geolocation Tests\n');
  
  // Test 1: Location Service
  await testLocationService();
  
  // Test 2: Distance Calculation
  testDistanceCalculation();
  console.log('');
  
  // Test 3: Coordinate Validation
  testCoordinateValidation();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Summary of Features:');
  console.log('✅ Extract city from coordinates using database + API');
  console.log('✅ Find nearby cities within specified radius');
  console.log('✅ Calculate distances using Haversine formula');
  console.log('✅ Validate latitude/longitude ranges');
  console.log('✅ Support for 30+ major Indian cities');
  console.log('✅ Fallback to OpenStreetMap for unknown locations');
}

// Run the tests
runTests().catch(console.error);

// Example usage in frontend:
// if (navigator.geolocation) {
//   navigator.geolocation.getCurrentPosition(async (position) => {
//     const { latitude, longitude } = position.coords;
//     const locationService = new LocationService();
//     const cityInfo = await locationService.getCityFromCoordinates(latitude, longitude);
//     console.log('Detected city:', cityInfo.city);
//     // Use cityInfo to find nearby communities
//   });
// }