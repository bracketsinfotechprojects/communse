const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LocationService = require('../services/locationService');

/**
 * @swagger
 * /api/users/{id}/location:
 *   put:
 *     summary: Update user's location information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               city:
 *                 type: string
 *                 description: Optional manual city override
 *               state:
 *                 type: string
 *                 description: Optional manual state override
 *               country:
 *                 type: string
 *                 description: Optional manual country override
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     location:
 *                       type: object
 *                       properties:
 *                         coordinates:
 *                           type: object
 *                           properties:
 *                             latitude:
 *                               type: number
 *                             longitude:
 *                               type: number
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         country:
 *                           type: string
 *                         method:
 *                           type: string
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or invalid coordinates
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - can only update own location
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const updateUserLocation = [
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City name must be between 1 and 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('State name must be between 1 and 100 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country name must be between 1 and 100 characters'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { latitude, longitude, city, state, country } = req.body;

      // Check if user is updating their own location
      if (req.user.userId !== id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own location'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const locationService = new LocationService();
      let locationData = {};

      // If coordinates are provided, process them through LocationService
      if (latitude !== undefined && longitude !== undefined) {
        if (!locationService.isValidCoordinates(latitude, longitude)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid coordinates provided'
          });
        }

        // Get city information from coordinates
        const cityInfo = await locationService.getCityFromCoordinates(latitude, longitude);
        
        locationData.coordinates = { latitude, longitude };
        locationData.city = city || cityInfo?.city || '';
        locationData.state = state || cityInfo?.state || '';
        locationData.country = country || cityInfo?.country || '';
        locationData.method = cityInfo?.method || 'manual';
      } else {
        // Manual location update without coordinates
        locationData.method = 'manual';
        if (city) locationData.city = city;
        if (state) locationData.state = state;
        if (country) locationData.country = country;
      }

      locationData.lastUpdated = new Date();

      // Update user's location
      user.location = { ...user.location, ...locationData };
      await user.save();

      res.json({
        success: true,
        message: 'Location updated successfully',
        user: {
          id: user._id,
          location: user.location
        }
      });

    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating location'
      });
    }
  }
];

/**
 * @swagger
 * /api/users/{id}/location:
 *   get:
 *     summary: Get user's location information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Location retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 location:
 *                   type: object
 *                   properties:
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     country:
 *                       type: string
 *                     method:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const getUserLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('location');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      location: user.location
    });

  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving location'
    });
  }
};

/**
 * @swagger
 * /api/locations/nearby:
 *   get:
 *     summary: Get nearby users based on location
 *     tags: [Locations]
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
 *         required: false
 *         schema:
 *           type: number
 *           default: 50000
 *         description: Search radius in meters, default is 50000 meters (50km)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: number
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Nearby users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           country:
 *                             type: string
 *                           distance:
 *                             type: number
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
const getNearbyUsers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50000, limit = 20 } = req.query;

    // Validate parameters
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const searchRadius = parseInt(radius);
    const maxResults = parseInt(limit);

    if (isNaN(lat) || isNaN(lng) || isNaN(searchRadius) || isNaN(maxResults)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters provided'
      });
    }

    const locationService = new LocationService();
    if (!locationService.isValidCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Find users within the radius using 2dsphere index
    const users = await User.find({
      'location.coordinates.latitude': {
        $gte: lat - (searchRadius / 111000), // Rough conversion: 1 degree ≈ 111km
        $lte: lat + (searchRadius / 111000)
      },
      'location.coordinates.longitude': {
        $gte: lng - (searchRadius / (111000 * Math.cos(lat * Math.PI / 180))),
        $lte: lng + (searchRadius / (111000 * Math.cos(lat * Math.PI / 180)))
      },
      _id: { $ne: req.user.userId } // Exclude current user
    })
    .select('username firstName lastName location')
    .limit(maxResults);

    // Calculate distance for each user and sort
    const usersWithDistance = users
      .map(user => {
        const userLat = user.location?.coordinates?.latitude;
        const userLng = user.location?.coordinates?.longitude;
        
        if (!userLat || !userLng) return null;

        const distance = locationService.calculateDistance(
          lat, lng, userLat, userLng
        );

        return {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          location: {
            city: user.location?.city || '',
            state: user.location?.state || '',
            country: user.location?.country || '',
            distance: Math.round(distance) // Distance in meters
          }
        };
      })
      .filter(user => user !== null)
      .sort((a, b) => a.location.distance - b.location.distance);

    res.json({
      success: true,
      users: usersWithDistance,
      count: usersWithDistance.length
    });

  } catch (error) {
    console.error('Get nearby users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding nearby users'
    });
  }
};

module.exports = {
  updateUserLocation,
  getUserLocation,
  getNearbyUsers
};