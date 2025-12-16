const Community = require('../models/Community');
const LocationService = require('../services/locationService');

/**
 * @swagger
 * tags:
 *   name: Community Location
 *   description: Location-based community discovery APIs
 */

/**
 * Enhanced Community Controller with Nearby Discovery
 * Includes geolocation-based community finding
 */
class CommunityNearbyController {
  constructor() {
    this.locationService = new LocationService();
  }

  /**
   * @swagger
   * /api/communities/nearby:
   *   get:
   *     summary: Find communities near user's location
   *     tags: [Community Location]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: latitude
   *         required: true
   *         schema:
   *           type: number
   *         description: User's latitude
   *       - in: query
   *         name: longitude
   *         required: true
   *         schema:
   *           type: number
   *         description: User's longitude
   *       - in: query
   *         name: radius
   *         schema:
   *           type: integer
   *           default: 50000
   *         description: Search radius in meters (default 50km)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Nearby communities found successfully
   *       400:
   *         description: Latitude and longitude are required
   *       500:
   *         description: Server error
   */
  findNearbyCommunities = async (req, res) => {
    try {
      const { latitude, longitude, radius = 50000, limit = 20 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          message: 'Latitude and longitude are required',
          example: '?latitude=19.0760&longitude=72.8777&radius=25000'
        });
      }

      // Validate coordinates
      if (!this.locationService.isValidCoordinates(parseFloat(latitude), parseFloat(longitude))) {
        return res.status(400).json({ 
          message: 'Invalid coordinates provided' 
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const searchRadius = parseInt(radius);

      // Get user's city from coordinates
      const userLocation = await this.locationService.getCityFromCoordinates(lat, lng);
      
      if (!userLocation) {
        return res.status(500).json({ 
          message: 'Unable to determine location from coordinates' 
        });
      }

      // Enhanced geospatial search - get all communities and filter by distance
      const allCommunities = await Community.find({})
        .populate('ownerId', 'username firstName lastName');
      // Filter communities by distance using Haversine formula
      const nearbyCommunities = allCommunities.filter(community => {
        let communityLat, communityLng;
        
        if (community.location && community.location.coordinates) {
          communityLat = community.location.coordinates.latitude;
          communityLng = community.location.coordinates.longitude;
        } else if (community.latitude && community.longitude) {
          communityLat = community.latitude;
          communityLng = community.longitude;
        } else {
          // Fallback to city-based matching for communities without coordinates
          const searchPatterns = this.buildCitySearchPatterns(userLocation.city);
          return searchPatterns.some(pattern => {
            return (community.cityName && pattern.test(community.cityName)) ||
                   (community.location?.city && pattern.test(community.location.city));
          });
        }

        if (communityLat && communityLng) {
          const distance = this.calculateDistance(lat, lng, communityLat, communityLng);
          return distance <= searchRadius;
        }
        
        return false;
      });

      // Add distance information and sort
      const finalResults = nearbyCommunities.map(community => {
        let distance = 0;
        let communityLat, communityLng;
        
        if (community.location?.coordinates) {
          communityLat = community.location.coordinates.latitude;
          communityLng = community.location.coordinates.longitude;
          distance = this.calculateDistance(lat, lng, communityLat, communityLng);
        } else if (community.latitude && community.longitude) {
          communityLat = community.latitude;
          communityLng = community.longitude;
          distance = this.calculateDistance(lat, lng, communityLat, communityLng);
        }
        
        return {
          ...community.toObject(),
          calculatedDistance: Math.round(distance),
          matchType: distance === 0 ? 'exact_location' : 'nearby_location'
        };
      }).sort((a, b) => {
        // First sort by distance
        if (a.calculatedDistance !== b.calculatedDistance) {
          return a.calculatedDistance - b.calculatedDistance;
        }
        // Then by member count
        return b.memberCount - a.memberCount;
      }).slice(0, parseInt(limit));

      // Get nearby cities for reference
      const nearbyCities = this.locationService.getNearbyCities(lat, lng, searchRadius);
      
      res.json({
        message: 'Nearby communities found successfully using geospatial search',
        userLocation: {
          city: userLocation.city,
          state: userLocation.state,
          coordinates: userLocation.coordinates,
          method: userLocation.method
        },
        searchRadius: `${Math.round(searchRadius / 1000)}km`,
        searchMethod: 'Distance-based filtering using Haversine formula (no city name dependency)',
        results: {
          total: finalResults.length,
          communities: finalResults,
          breakdown: {
            exactLocation: finalResults.filter(c => c.matchType === 'exact_location').length,
            nearbyLocation: finalResults.filter(c => c.matchType === 'nearby_location').length,
            totalFound: allCommunities.length,
            totalWithinRadius: nearbyCommunities.length
          }
        },
        nearbyCities: nearbyCities.slice(0, 5) // Return top 5 nearby cities for reference
      });

    } catch (error) {
      console.error('Find nearby communities error:', error);
      res.status(500).json({ message: 'Server error finding nearby communities' });
    }
  };

  /**
   * Find communities by city name with flexible matching
   * @param {string} cityName 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async findCommunitiesByCity(cityName, limit = 20) {
    try {
      // Build flexible search patterns to handle city name variations
      // e.g., "Kalyan-Dombivali" should match "Kalyan", "Dombivali", "Dombivli"
      const searchPatterns = this.buildCitySearchPatterns(cityName);
      
      // Support both current and improved schema with flexible matching
      const communities = await Community.find({
        $or: [
          { cityName: { $in: searchPatterns } }, // Current schema
          { 'location.city': { $in: searchPatterns } } // Improved schema
        ]
      })
      .populate('ownerId', 'username firstName lastName')
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(limit);

      return communities.map(community => ({
        ...community.toObject(),
        matchType: 'city_exact',
        distance: 0 // Same city
      }));
    } catch (error) {
      console.error('Find communities by city error:', error);
      return [];
    }
  }

  /**
   * Build flexible search patterns for city name variations
   * @param {string} cityName 
   * @returns {Array<RegExp>}
   */
  buildCitySearchPatterns(cityName) {
    const patterns = [];

    // Exact match (case-insensitive)
    patterns.push(new RegExp('^' + this.escapeRegex(cityName) + '$', 'i'));

    // Handle hyphenated city names (e.g., "Kalyan-Dombivali")
    if (cityName.includes('-')) {
      const parts = cityName.split('-');
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.length >= 3) {
          patterns.push(new RegExp('^' + this.escapeRegex(trimmed), 'i'));
        }
      });
    }

    // Handle common spelling variations
    const variations = this.getCityNameVariations(cityName);
    variations.forEach(variation => {
      patterns.push(new RegExp('^' + this.escapeRegex(variation) + '$', 'i'));
    });
    
    // Partial match for compound names
    patterns.push(new RegExp(this.escapeRegex(cityName), 'i'));
    
    return patterns;
  }

  /**
   * Get common spelling variations for city names
   * @param {string} cityName 
   * @returns {Array<string>}
   */
  getCityNameVariations(cityName) {
    const variations = [];
    const lowerName = cityName.toLowerCase();
    
    // Common Indian city name variations
    const variationMap = {
      'dombivali': ['dombivli', 'dombivilli'],
      'dombivli': ['dombivali', 'dombivilli'],
      'kalyan-dombivali': ['kalyan', 'dombivali', 'dombivli', 'kalyan dombivali'],
      'kalyan-dombivli': ['kalyan', 'dombivali', 'dombivli', 'kalyan dombivli'],
      'pimpri-chinchwad': ['pimpri', 'chinchwad', 'pcmc', 'pimpri chinchwad'],
      'vasai-virar': ['vasai', 'virar', 'vasai virar'],
      'bangalore': ['bengaluru'],
      'bengaluru': ['bangalore'],
      'mumbai': ['bombay'],
      'bombay': ['mumbai'],
      'chennai': ['madras'],
      'madras': ['chennai'],
      'kolkata': ['calcutta'],
      'calcutta': ['kolkata'],
      'pune': ['poona'],
      'poona': ['pune'],
      'varanasi': ['banaras', 'benares'],
      'banaras': ['varanasi', 'benares'],
      'thiruvananthapuram': ['trivandrum'],
      'trivandrum': ['thiruvananthapuram']
    };
    
    if (variationMap[lowerName]) {
      variations.push(...variationMap[lowerName]);
    }
    
    return variations;
  }

  /**
   * Escape special regex characters
   * @param {string} str 
   * @returns {string}
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Find communities in multiple cities
   * @param {Array} cityNames 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async findCommunitiesByMultipleCities(cityNames, limit = 10) {
    if (cityNames.length === 0) return [];

    try {
      // Build patterns for all city names
      const allPatterns = [];
      cityNames.forEach(cityName => {
        const patterns = this.buildCitySearchPatterns(cityName);
        allPatterns.push(...patterns);
      });

      const communities = await Community.find({
        $or: [
          { cityName: { $in: allPatterns } },
          { 'location.city': { $in: allPatterns } }
        ]
      })
      .populate('ownerId', 'username firstName lastName')
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(limit);

      return communities.map(community => ({
        ...community.toObject(),
        matchType: 'nearby_city',
        distance: this.calculateDistanceToCity(community, cityNames)
      }));
    } catch (error) {
      console.error('Find communities by multiple cities error:', error);
      return [];
    }
  }

  /**
   * @swagger
   * /api/communities/within-radius:
   *   get:
   *     summary: Find communities within a specific radius
   *     tags: [Community Location]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: latitude
   *         required: true
   *         schema:
   *           type: number
   *         description: Center latitude
   *       - in: query
   *         name: longitude
   *         required: true
   *         schema:
   *           type: number
   *         description: Center longitude
   *       - in: query
   *         name: radius
   *         schema:
   *           type: integer
   *           default: 10000
   *         description: Search radius in meters (default 10km)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Communities within radius found successfully
   *       400:
   *         description: Latitude and longitude are required
   *       500:
   *         description: Server error
   */
  findCommunitiesWithinRadius = async (req, res) => {
    try {
      const { latitude, longitude, radius = 10000, limit = 20 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ 
          message: 'Latitude and longitude are required' 
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const searchRadius = parseInt(radius);

      // Get user's city from coordinates
      const userLocation = await this.locationService.getCityFromCoordinates(lat, lng);
      
      if (!userLocation) {
        return res.status(500).json({ 
          message: 'Unable to determine location from coordinates' 
        });
      }

      // Find communities in user's city
      const cityCommunities = await this.findCommunitiesByCity(userLocation.city, limit);

      // Get nearby cities and their communities
      const nearbyCities = this.locationService.getNearbyCities(lat, lng, searchRadius);
      const nearbyCityCommunities = await this.findCommunitiesByMultipleCities(
        nearbyCities.map(city => city.name), 
        limit
      );

      // Combine results
      const allCommunities = [
        ...cityCommunities,
        ...nearbyCityCommunities
      ];

      // Remove duplicates and sort by relevance
      const uniqueCommunities = this.removeDuplicates(allCommunities);
      const finalResults = uniqueCommunities.slice(0, parseInt(limit));

      res.json({
        message: 'Communities within radius found successfully',
        searchCenter: { latitude: lat, longitude: lng },
        userLocation: {
          city: userLocation.city,
          state: userLocation.state,
          coordinates: userLocation.coordinates,
          method: userLocation.method
        },
        radius: `${Math.round(searchRadius / 1000)}km`,
        results: {
          total: finalResults.length,
          communities: finalResults,
          breakdown: {
            sameCity: cityCommunities.length,
            nearbyCities: nearbyCityCommunities.length
          }
        },
        nearbyCities: nearbyCities.slice(0, 5)
      });

    } catch (error) {
      console.error('Find communities within radius error:', error);
      res.status(500).json({ message: 'Server error finding communities within radius' });
    }
  };

  /**
   * @swagger
   * /api/communities/location:
   *   post:
   *     summary: Get user's location info from coordinates
   *     tags: [Community Location]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - latitude
   *               - longitude
   *             properties:
   *               latitude:
   *                 type: number
   *                 description: User's latitude
   *               longitude:
   *                 type: number
   *                 description: User's longitude
   *     responses:
   *       200:
   *         description: Location information retrieved successfully
   *       400:
   *         description: Latitude and longitude are required
   *       500:
   *         description: Server error
   */
  getUserLocationInfo = async (req, res) => {
    try {
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ 
          message: 'Latitude and longitude are required in request body' 
        });
      }

      if (!this.locationService.isValidCoordinates(latitude, longitude)) {
        return res.status(400).json({ 
          message: 'Invalid coordinates provided' 
        });
      }

      // Get city information from coordinates
      const locationInfo = await this.locationService.getCityFromCoordinates(
        parseFloat(latitude), 
        parseFloat(longitude)
      );

      if (!locationInfo) {
        return res.status(500).json({ 
          message: 'Unable to extract location information' 
        });
      }

      // Get nearby cities
      const nearbyCities = this.locationService.getNearbyCities(
        parseFloat(latitude), 
        parseFloat(longitude), 
        50000 // 50km radius
      );

      // Get communities count for user's city using flexible matching
      const searchPatterns = this.buildCitySearchPatterns(locationInfo.city);
      const communityCount = await Community.countDocuments({
        $or: [
          { cityName: { $in: searchPatterns } },
          { 'location.city': { $in: searchPatterns } }
        ]
      });

      res.json({
        message: 'Location information retrieved successfully',
        location: locationInfo,
        nearbyCities: nearbyCities.slice(0, 10),
        communityStats: {
          totalCommunitiesInCity: communityCount
        }
      });

    } catch (error) {
      console.error('Get user location info error:', error);
      res.status(500).json({ message: 'Server error processing location' });
    }
  };

  /**
   * @swagger
   * /api/communities/search-location:
   *   get:
   *     summary: Search communities by interest and location
   *     tags: [Community Location]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: interest
   *         schema:
   *           type: string
   *         description: Single interest to search for
   *       - in: query
   *         name: interests
   *         schema:
   *           type: string
   *         description: Comma-separated list of interests (e.g., tech,music,gaming)
   *       - in: query
   *         name: latitude
   *         schema:
   *           type: number
   *         description: User's latitude (optional for location-based filtering)
   *       - in: query
   *         name: longitude
   *         schema:
   *           type: number
   *         description: User's longitude (optional for location-based filtering)
   *       - in: query
   *         name: radius
   *         schema:
   *           type: integer
   *           default: 50000
   *         description: Search radius in meters (default 50km)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Communities found successfully
   *       400:
   *         description: Interest parameter is required
   *       500:
   *         description: Server error
   */
  searchByInterestAndLocation = async (req, res) => {
    try {
      const { 
        interests, // Supports comma-separated list: "tech,music,gaming"
        interest, // Single interest (backward compatibility)
        latitude, 
        longitude, 
        radius = 50000, 
        limit = 20 
      } = req.query;

      // Support both multiple interests (comma-separated) and single interest
      const interestQuery = interests || interest;
      if (!interestQuery) {
        return res.status(400).json({ 
          message: 'Interest parameter is required (use "interests" for multiple: tech,music,gaming or "interest" for single)',
          examples: {
            multiple: '/api/communities/search-location?interests=tech,music,gaming&latitude=19.0760&longitude=72.8777',
            single: '/api/communities/search-location?interest=tech&latitude=19.0760&longitude=72.8777'
          }
        });
      }

      // Parse interests (comma-separated or single)
      const interestList = interestQuery.split(',').map(i => i.trim()).filter(i => i.length > 0);
      
      if (interestList.length === 0) {
        return res.status(400).json({ 
          message: 'At least one interest must be specified' 
        });
      }

      // Build interest regex patterns (OR condition)
      const interestPatterns = interestList.map(interest => new RegExp(interest, 'i'));

      let communities = [];
      let userLocation = null;

      if (latitude && longitude) {
        // Enhanced location-based search with radius filtering
        userLocation = await this.locationService.getCityFromCoordinates(
          parseFloat(latitude), 
          parseFloat(longitude)
        );

        // Get all communities with matching interests first, then filter by location
        const allMatchingCommunities = await Community.find({
          interest: { $in: interestPatterns }
        })
        .populate('ownerId', 'username firstName lastName');

        // Filter communities by distance from user's location
        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const searchRadius = parseInt(radius);

        const nearbyCommunities = allMatchingCommunities.filter(community => {
          // Handle different location schemas
          let communityLat, communityLng;
          
          if (community.location && community.location.coordinates) {
            communityLat = community.location.coordinates.latitude;
            communityLng = community.location.coordinates.longitude;
          } else if (community.latitude && community.longitude) {
            communityLat = community.latitude;
            communityLng = community.longitude;
          } else {
            // Try to match city-based communities
            const searchPatterns = this.buildCitySearchPatterns(userLocation.city);
            const cityMatch = searchPatterns.some(pattern => {
              return (community.cityName && pattern.test(community.cityName)) ||
                     (community.location?.city && pattern.test(community.location.city));
            });
            return cityMatch;
          }

          // Calculate distance using Haversine formula
          if (communityLat && communityLng) {
            const distance = this.calculateDistance(userLat, userLng, communityLat, communityLng);
            return distance <= searchRadius;
          }
          
          return false;
        });

        // Sort by distance and then by member count
        const sortedCommunities = nearbyCommunities.map(community => {
          let distance = 0;
          if (community.location?.coordinates) {
            distance = this.calculateDistance(
              userLat, userLng, 
              community.location.coordinates.latitude, 
              community.location.coordinates.longitude
            );
          } else if (community.latitude && community.longitude) {
            distance = this.calculateDistance(userLat, userLng, community.latitude, community.longitude);
          }
          
          return {
            ...community.toObject(),
            calculatedDistance: Math.round(distance)
          };
        }).sort((a, b) => {
          // First sort by distance
          if (a.calculatedDistance !== b.calculatedDistance) {
            return a.calculatedDistance - b.calculatedDistance;
          }
          // Then by member count
          return b.memberCount - a.memberCount;
        });

        communities = sortedCommunities.slice(0, parseInt(limit));
      } else {
        // Interest-only search with multiple interests
        communities = await Community.find({
          interest: { $in: interestPatterns }
        })
        .populate('ownerId', 'username firstName lastName')
        .sort({ memberCount: -1 })
        .limit(parseInt(limit));
      }

      res.json({
        message: 'Communities found successfully',
        searchParams: {
          interests: interestList,
          location: latitude && longitude ? { latitude, longitude } : null,
          radius: latitude && longitude ? `${Math.round(radius / 1000)}km` : null,
          searchMethod: latitude && longitude ? 'geospatial_radius' : 'interest_only'
        },
        userLocation: userLocation ? {
          city: userLocation.city,
          state: userLocation.state,
          coordinates: userLocation.coordinates,
          method: userLocation.method
        } : null,
        results: {
          total: communities.length,
          communities,
          searchMethod: latitude && longitude ? 'Distance-based filtering using Haversine formula' : 'Interest-based filtering only'
        }
      });

    } catch (error) {
      console.error('Search by interest and location error:', error);
      res.status(500).json({ message: 'Server error searching communities' });
    }
  };

  /**
   * Helper: Calculate distance between two coordinates
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
    return R * c;
  }

  /**
   * Helper: Convert degrees to radians
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Helper: Calculate distance to nearest matching city
   */
  calculateDistanceToCity(community, cityNames) {
    // This would need actual coordinates for accurate calculation
    // For now, return a placeholder
    return 0;
  }

  /**
   * Helper: Remove duplicate communities
   */
  removeDuplicates(communities) {
    const seen = new Set();
    return communities.filter(community => {
      const id = community._id.toString();
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  /**
   * Helper: Sort by distance and relevance
   */
  sortByDistanceAndRelevance(communities, userCoords) {
    return communities.sort((a, b) => {
      // Prioritize same city communities
      if (a.distance === 0 && b.distance > 0) return -1;
      if (b.distance === 0 && a.distance > 0) return 1;
      
      // Then by member count
      if (b.memberCount !== a.memberCount) {
        return b.memberCount - a.memberCount;
      }
      
      // Finally by creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
}

module.exports = new CommunityNearbyController();
