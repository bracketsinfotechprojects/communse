const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
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