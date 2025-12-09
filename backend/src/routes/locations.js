const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  updateUserLocation,
  getUserLocation,
  getNearbyUsers
} = require('../controllers/locationController');

// All routes require authentication
router.use(auth);

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
router.put('/users/:id/location', updateUserLocation);

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
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/users/:id/location', getUserLocation);

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
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/locations/nearby', getNearbyUsers);

module.exports = router;