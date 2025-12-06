// Using Node.js built-in fetch (available in v18+)

/**
 * Location Service for extracting city information from coordinates
 * Uses OpenStreetMap Nominatim API for reverse geocoding
 */
class LocationService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'CommAPP/1.0';
    
    // Fallback city data for major Indian cities
    this.majorCities = {
      'Mumbai': { lat: 19.0760, lng: 72.8777, radius: 25000 },
      'Delhi': { lat: 28.7041, lng: 77.1025, radius: 20000 },
      'Bangalore': { lat: 12.9716, lng: 77.5946, radius: 20000 },
      'Hyderabad': { lat: 17.3850, lng: 78.4867, radius: 20000 },
      'Chennai': { lat: 13.0827, lng: 80.2707, radius: 20000 },
      'Pune': { lat: 18.5204, lng: 73.8567, radius: 20000 },
      'Kolkata': { lat: 22.5726, lng: 88.3639, radius: 20000 },
      'Ahmedabad': { lat: 23.0225, lng: 72.5714, radius: 15000 },
      'Jaipur': { lat: 26.9124, lng: 75.7873, radius: 15000 },
      'Surat': { lat: 21.1702, lng: 72.8311, radius: 15000 },
      'Lucknow': { lat: 26.8467, lng: 80.9462, radius: 15000 },
      'Kanpur': { lat: 26.4499, lng: 80.3319, radius: 15000 },
      'Nagpur': { lat: 21.1458, lng: 79.0882, radius: 15000 },
      'Visakhapatnam': { lat: 17.6868, lng: 83.2185, radius: 15000 },
      'Indore': { lat: 22.7196, lng: 75.8577, radius: 15000 },
      'Thane': { lat: 19.2183, lng: 72.9781, radius: 15000 },
      'Bhopal': { lat: 23.2599, lng: 77.4126, radius: 15000 },
      'Pimpri-Chinchwad': { lat: 18.6298, lng: 73.7997, radius: 15000 },
      'Ludhiana': { lat: 30.9010, lng: 75.8573, radius: 15000 },
      'Agra': { lat: 27.1767, lng: 78.0081, radius: 12000 },
      'Nashik': { lat: 19.9975, lng: 73.7898, radius: 12000 },
      'Faridabad': { lat: 28.4089, lng: 77.3178, radius: 12000 },
      'Meerut': { lat: 28.9845, lng: 77.7064, radius: 12000 },
      'Rajkot': { lat: 22.3039, lng: 70.8022, radius: 12000 },
      'Kalyan-Dombivali': { lat: 19.2308, lng: 73.1358, radius: 12000 },
      'Vasai-Virar': { lat: 19.3919, lng: 72.8397, radius: 12000 },
      'Varanasi': { lat: 25.3176, lng: 82.9739, radius: 12000 },
      'Srinagar': { lat: 34.0837, lng: 74.7973, radius: 12000 },
      'Dhanbad': { lat: 23.7957, lng: 86.4304, radius: 12000 },
      'Jodhpur': { lat: 26.2389, lng: 73.0243, radius: 12000 },
      // Mumbai Metropolitan Region (MMR) additional cities
      'Thakurli': { lat: 19.2080, lng: 73.0489, radius: 10000 },
      'Dombivali': { lat: 19.2183, lng: 73.0861, radius: 10000 },
      'Kalyan': { lat: 19.2437, lng: 73.1355, radius: 10000 },
      'Ulhasnagar': { lat: 19.2216, lng: 73.1642, radius: 10000 },
      'Ambernath': { lat: 19.2017, lng: 73.1867, radius: 10000 },
      'Badlapur': { lat: 19.1552, lng: 73.2653, radius: 10000 },
      'Virar': { lat: 19.4550, lng: 72.8120, radius: 10000 },
      'Nalasopara': { lat: 19.4256, lng: 72.7848, radius: 10000 },
      'Bhiwandi': { lat: 19.2947, lng: 73.0638, radius: 10000 }
    };
  }

  /**
   * Extract city information from coordinates
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @returns {Promise<{city: string, state: string, country: string, coordinates: object}>}
   */
  async getCityFromCoordinates(latitude, longitude) {
    try {
      // First try to find closest major city in our database
      const closestCity = this.findClosestMajorCity(latitude, longitude);
      if (closestCity && closestCity.distance <= closestCity.radius) {
        return {
          city: closestCity.name,
          state: 'State', // Would need expanded database for state info
          country: 'India',
          coordinates: { latitude, longitude },
          method: 'database_match'
        };
      }

      // If no major city match, use reverse geocoding API
      return await this.reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error getting city from coordinates:', error);
      return null;
    }
  }

  /**
   * Find closest major city from our database
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {object|null}
   */
  findClosestMajorCity(latitude, longitude) {
    let closestCity = null;
    let minDistance = Infinity;

    for (const [cityName, cityData] of Object.entries(this.majorCities)) {
      const distance = this.calculateDistance(
        latitude, longitude, 
        cityData.lat, cityData.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestCity = {
          name: cityName,
          lat: cityData.lat,
          lng: cityData.lng,
          radius: cityData.radius,
          distance: distance
        };
      }
    }

    return closestCity;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} - Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {number} deg 
   * @returns {number}
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Use OpenStreetMap Nominatim API for reverse geocoding
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<object>}
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `${this.baseUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.address) {
        throw new Error('No address data found');
      }

      // Extract city information using hierarchical approach
      const address = data.address;
      
      // Get location using hierarchical approach (most specific to most general)
      const getLocationName = (addr) => {
        return (
          addr.neighborhood ||
          addr.sublocality ||
          addr.sublocality_level_1 ||
          addr.sublocality_level_2 ||
          addr.locality ||
          addr.city ||
          addr.town ||
          addr.village ||
          addr.suburb ||
          'Unknown'
        );
      };
      
      let city = getLocationName(address);
      
      if (city === 'Unknown' && address.state) {
        // For states like Delhi, use state as city fallback
        city = address.state;
      }

      return {
        city: city || 'Unknown',
        state: address.state || '',
        country: address.country || '',
        coordinates: { latitude, longitude },
        method: 'api_geocoding',
        fullAddress: data.display_name
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to coordinates as string
      return {
        city: `Location ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
        state: '',
        country: 'Unknown',
        coordinates: { latitude, longitude },
        method: 'coordinates_only'
      };
    }
  }

  /**
   * Get nearby cities within a radius
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {number} radius - Search radius in meters
   * @returns {Array}
   */
  getNearbyCities(latitude, longitude, radius = 50000) {
    const nearbyCities = [];

    for (const [cityName, cityData] of Object.entries(this.majorCities)) {
      const distance = this.calculateDistance(
        latitude, longitude,
        cityData.lat, cityData.lng
      );

      if (distance <= radius) {
        nearbyCities.push({
          name: cityName,
          distance: Math.round(distance / 1000), // Convert to km
          coordinates: { latitude: cityData.lat, longitude: cityData.lng }
        });
      }
    }

    // Sort by distance
    return nearbyCities.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Validate coordinates
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' && 
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Get user's location from browser geolocation API
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  static async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

module.exports = LocationService;