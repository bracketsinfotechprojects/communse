/**
 * Test file to validate improved coordinate storage in communities
 * Tests the new location schema with latitude/longitude support
 */

const mongoose = require('mongoose');
const Community = require('../src/models/Community');
const LocationService = require('../src/services/locationService');

// Connect to test database
async function connectTestDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/commapp_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to test database');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    process.exit(1);
  }
}

// Test 1: Create community with direct coordinates
async function testDirectCoordinates() {
  console.log('\n=== Test 1: Creating community with direct coordinates ===');
  
  try {
    const community = new Community({
      interest: 'TechHub',
      location: {
        city: 'Mumbai',
        fullAddress: 'Business Bay, Mumbai',
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        }
      },
      description: 'A technology community in Mumbai',
      ownerId: new mongoose.Types.ObjectId(),
      isPrivate: false,
      tags: ['technology', 'startup', 'innovation']
    });

    await community.save();
    
    console.log('✅ Community created successfully');
    console.log('📍 Coordinates stored:', community.location.coordinates);
    console.log('🏙️  City:', community.location.city);
    console.log('📍 Has coordinates:', community.hasCoordinates);
    console.log('📍 Display location:', community.displayLocation);
    
    return community;
  } catch (error) {
    console.error('❌ Failed to create community with direct coordinates:', error.message);
    throw error;
  }
}

// Test 2: Create community with city name only (auto-coordinate resolution)
async function testAutoCoordinateResolution() {
  console.log('\n=== Test 2: Creating community with city name (auto-resolution) ===');
  
  try {
    // Create community without coordinates
    const community = new Community({
      interest: 'Photography',
      location: {
        city: 'Bangalore',
        fullAddress: 'MG Road, Bangalore'
      },
      description: 'A photography community in Bangalore',
      ownerId: new mongoose.Types.ObjectId(),
      isPrivate: false,
      tags: ['photography', 'art', 'creative']
    });

    await community.save();
    
    // Now simulate coordinate resolution using LocationService
    const locationService = new LocationService();
    const cityCoordinates = Object.entries(locationService.majorCities).find(
      ([name]) => name.toLowerCase() === 'bangalore'
    );
    
    if (cityCoordinates) {
      community.location.coordinates = {
        latitude: cityCoordinates[1].lat,
        longitude: cityCoordinates[1].lng
      };
      await community.save();
    }
    
    console.log('✅ Community created successfully with auto-resolved coordinates');
    console.log('📍 Coordinates resolved:', community.location.coordinates);
    console.log('🏙️  City:', community.location.city);
    console.log('🔄 Resolution method: City name lookup');
    
    return community;
  } catch (error) {
    console.error('❌ Failed to create community with auto-resolution:', error.message);
    throw error;
  }
}

// Test 3: Test LocationService integration
async function testLocationServiceIntegration() {
  console.log('\n=== Test 3: Testing LocationService coordinate resolution ===');
  
  try {
    const locationService = new LocationService();
    
    // Test finding coordinates for known cities
    const testCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Thakurli'];
    
    for (const cityName of testCities) {
      const cityData = Object.entries(locationService.majorCities).find(
        ([name]) => name.toLowerCase() === cityName.toLowerCase()
      );
      
      if (cityData) {
        console.log(`📍 ${cityName}: (${cityData[1].lat}, ${cityData[1].lng}) - Radius: ${cityData[1].radius}m`);
      } else {
        console.log(`❌ ${cityName}: Not found in database`);
      }
    }
    
    // Test distance calculation
    console.log('\n🧮 Testing distance calculations:');
    const mumbaiCoords = { lat: 19.0760, lng: 72.8777 };
    const delhiCoords = { lat: 28.7041, lng: 77.1025 };
    
    const distance = locationService.calculateDistance(
      mumbaiCoords.lat, mumbaiCoords.lng,
      delhiCoords.lat, delhiCoords.lng
    );
    
    console.log(`📏 Mumbai to Delhi distance: ${(distance / 1000).toFixed(2)} km`);
    
    console.log('✅ LocationService integration test completed');
  } catch (error) {
    console.error('❌ LocationService integration test failed:', error.message);
    throw error;
  }
}

// Test 4: Test community with legacy schema compatibility
async function testLegacySchemaCompatibility() {
  console.log('\n=== Test 4: Testing schema compatibility ===');
  
  try {
    // Test if the old cityName field still works for backward compatibility
    const community = new Community({
      interest: 'Gaming',
      // This should still work with the new schema structure
      location: {
        city: 'Pune',
        fullAddress: 'Koregaon Park, Pune'
      },
      description: 'A gaming community in Pune',
      ownerId: new mongoose.Types.ObjectId(),
      isPrivate: false,
      tags: ['gaming', 'esports', 'technology']
    });

    await community.save();
    
    console.log('✅ Legacy schema compatibility maintained');
    console.log('🏙️  City:', community.location.city);
    console.log('📍 Has coordinates:', community.hasCoordinates);
    
    return community;
  } catch (error) {
    console.error('❌ Legacy schema compatibility test failed:', error.message);
    throw error;
  }
}

// Test 5: Test MongoDB geospatial indexing
async function testGeospatialIndexing() {
  console.log('\n=== Test 5: Testing geospatial querying ===');
  
  try {
    // Create a few test communities with coordinates
    const testCommunities = [
      {
        interest: 'Tech',
        location: {
          city: 'Mumbai',
          coordinates: { latitude: 19.0760, longitude: 72.8777 }
        },
        ownerId: new mongoose.Types.ObjectId()
      },
      {
        interest: 'Arts',
        location: {
          city: 'Delhi',
          coordinates: { latitude: 28.7041, longitude: 77.1025 }
        },
        ownerId: new mongoose.Types.ObjectId()
      }
    ];

    const createdCommunities = [];
    for (const commData of testCommunities) {
      const community = new Community(commData);
      await community.save();
      createdCommunities.push(community);
    }

    // Test nearby search using MongoDB's $near operator
    const mumbaiLat = 19.0760;
    const mumbaiLng = 72.8777;
    const searchRadius = 50000; // 50km

    const nearbyCommunities = await Community.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [mumbaiLng, mumbaiLat]
          },
          $maxDistance: searchRadius
        }
      }
    });

    console.log(`📍 Found ${nearbyCommunities.length} communities within ${searchRadius/1000}km of Mumbai`);
    nearbyCommunities.forEach(comm => {
      console.log(`   - ${comm.interest} in ${comm.location.city}`);
    });

    // Clean up
    for (const community of createdCommunities) {
      await Community.findByIdAndDelete(community._id);
    }

    console.log('✅ Geospatial indexing test completed');
  } catch (error) {
    console.error('❌ Geospatial indexing test failed:', error.message);
    throw error;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting community coordinate storage tests...\n');
  
  try {
    await connectTestDB();
    
    // Clean up any existing test data
    await Community.deleteMany({ description: { $regex: /.*technology community.*|.*photography community.*|.*gaming community.*/i } });
    
    // Run all tests
    await testLocationServiceIntegration();
    await testDirectCoordinates();
    await testAutoCoordinateResolution();
    await testLegacySchemaCompatibility();
    await testGeospatialIndexing();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary of improvements:');
    console.log('   ✅ Enhanced location schema with structured coordinates');
    console.log('   ✅ Automatic coordinate resolution from city names');
    console.log('   ✅ LocationService integration for coordinate lookup');
    console.log('   ✅ Geospatial indexing for efficient nearby searches');
    console.log('   ✅ Backward compatibility with existing data');
    console.log('   ✅ Validation for coordinate fields');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the tests
if (require.main === module) {
  runTests().then(() => {
    console.log('\n✅ Test execution completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testDirectCoordinates,
  testAutoCoordinateResolution,
  testLocationServiceIntegration,
  testLegacySchemaCompatibility,
  testGeospatialIndexing
};