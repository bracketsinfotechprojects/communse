const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Community = require('../models/Community');
const {
  getCommunityById,
  createCommunity,
  getAllCommunities,
  joinCommunity,
  leaveCommunity,
  getMyCommunities,
  updateCommunity,
  deleteCommunity,
  getCommunityMembers,
  updateCommunitySettings,
  getPendingRequests,
  approveUserRequest,
  rejectUserRequest,
  removeUserFromCommunity,
  banUserFromCommunity,
  unbanUserFromCommunity,
  getBannedUsers
} = require('../controllers/communityController');

const {
  findNearbyCommunities,
  findCommunitiesWithinRadius,
  getUserLocationInfo,
  searchByInterestAndLocation
} = require('../controllers/communityNearbyController');

// @route   GET /api/communities/nearby
// @desc    Find communities near user's current location
// @access  Private
router.get('/nearby', auth, findNearbyCommunities);

// @route   GET /api/communities/within-radius
// @desc    Find communities within a specific radius
// @access  Private
router.get('/within-radius', auth, findCommunitiesWithinRadius);

// @route   POST /api/communities/location
// @desc    Extract city from user coordinates
// @access  Private
router.post('/location', auth, getUserLocationInfo);

// @route   GET /api/communities/search-location
// @desc    Search communities by interest and location
// @access  Private
router.get('/search-location', auth, searchByInterestAndLocation);

/**
 * @swagger
 * /api/communities/{id}/distance:
 *   get:
 *     summary: Calculate distance from user location to a specific community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Community ID
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
 *     responses:
 *       200:
 *         description: Distance calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 community:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     location:
 *                       type: object
 *                 userLocation:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                 distance:
 *                   type: object
 *                   properties:
 *                     meters:
 *                       type: number
 *                     kilometers:
 *                       type: number
 *                     miles:
 *                       type: number
 *       400:
 *         description: Invalid parameters or community without coordinates
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
// @route   GET /api/communities/:id/distance
// @desc    Calculate distance from user location to a specific community
// @access  Private
router.get('/:id/distance', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Latitude and longitude are required',
        example: '/api/communities/123/distance?latitude=19.0760&longitude=72.8777'
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    // Find the community
    const community = await Community.findById(id)
      .populate('ownerId', 'username firstName lastName avatar');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    let communityLat, communityLng;
    
    // Handle different location schemas
    if (community.location && community.location.coordinates) {
      communityLat = community.location.coordinates.latitude;
      communityLng = community.location.coordinates.longitude;
    } else if (community.latitude && community.longitude) {
      communityLat = community.latitude;
      communityLng = community.longitude;
    } else {
      return res.status(400).json({ 
        message: 'Community does not have location coordinates set',
        communityId: id,
        communityName: community.name
      });
    }

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = (communityLat - userLat) * Math.PI / 180;
    const dLon = (communityLng - userLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLat * Math.PI / 180) * Math.cos(communityLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    res.json({
      message: 'Distance calculated successfully',
      community: {
        id: community._id,
        name: community.name,
        location: community.location || {
          coordinates: { latitude: communityLat, longitude: communityLng }
        }
      },
      userLocation: {
        latitude: userLat,
        longitude: userLng
      },
      distance: {
        meters: Math.round(distance),
        kilometers: Math.round(distance / 1000 * 100) / 100,
        miles: Math.round(distance / 1609.34 * 100) / 100
      },
      calculation: {
        method: 'Haversine formula',
        earthRadius: '6371000 meters'
      }
    });

  } catch (error) {
    console.error('Calculate community distance error:', error);
    console.error('Error stack:', error.stack);
    console.error('Community ID:', id);
    console.error('User coordinates:', { latitude: userLat, longitude: userLng });
    res.status(500).json({ 
      message: 'Server error calculating distance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/communities/:id
// @desc    Get single community by ID
// @access  Private
router.get('/:id', auth, getCommunityById);

// @route   POST /api/communities
// @desc    Create a new community
// @access  Private
router.post('/', auth, createCommunity);

// @route   GET /api/communities
// @desc    Get all communities with filtering and pagination
// @access  Private
router.get('/', auth, getAllCommunities);

// @route   POST /api/communities/:id/join
// @desc    Join a community
// @access  Private
router.post('/:id/join', auth, joinCommunity);

// @route   POST /api/communities/:id/leave
// @desc    Leave a community
// @access  Private
router.post('/:id/leave', auth, leaveCommunity);

// @route   GET /api/communities/my/joined
// @desc    Get communities joined by current user
// @access  Private
router.get('/my/joined', auth, getMyCommunities);

// @route   PUT /api/communities/:id
// @desc    Update a community
// @access  Private (owner only)
router.put('/:id', auth, updateCommunity);

// @route   DELETE /api/communities/:id
// @desc    Delete a community
// @access  Private (owner only)
router.delete('/:id', auth, deleteCommunity);

// @route   GET /api/communities/:id/members
// @desc    Get community members
// @access  Private (authentication required)
router.get('/:id/members', auth, getCommunityMembers);

// @route   PUT /api/communities/:id/settings
// @desc    Update community settings
// @access  Private (owner only)
router.put('/:id/settings', auth, updateCommunitySettings);

// @route   GET /api/communities/:id/pending-requests
// @desc    Get pending join requests
// @access  Private (owner/admin only)
router.get('/:id/pending-requests', auth, getPendingRequests);

// @route   POST /api/communities/:id/approve/:userId
// @desc    Approve a user join request
// @access  Private (owner/admin only)
router.post('/:id/approve/:userId', auth, approveUserRequest);

// @route   POST /api/communities/:id/reject/:userId
// @desc    Reject a user join request
// @access  Private (owner/admin only)
router.post('/:id/reject/:userId', auth, rejectUserRequest);

// @route   POST /api/communities/:id/remove/:userId
// @desc    Remove a user from community
// @access  Private (owner/admin only)
router.post('/:id/remove/:userId', auth, removeUserFromCommunity);

// @route   POST /api/communities/:id/ban/:userId
// @desc    Ban a user from community
// @access  Private (owner/admin only)
router.post('/:id/ban/:userId', auth, banUserFromCommunity);

// @route   POST /api/communities/:id/unban/:userId
// @desc    Unban a user from community
// @access  Private (owner/admin only)
router.post('/:id/unban/:userId', auth, unbanUserFromCommunity);

// @route   GET /api/communities/:id/banned-users
// @desc    Get banned users
// @access  Private (owner/admin only)
router.get('/:id/banned-users', auth, getBannedUsers);

module.exports = router;