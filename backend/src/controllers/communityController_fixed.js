const { body, validationResult } = require('express-validator');
const Community = require('../models/Community');
const User = require('../models/User');

/**
 * @swagger
 * /api/communities/{id}:
 *   get:
 *     summary: Get single community by ID
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
 *     responses:
 *       200:
 *         description: Community retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 community:
 *                   $ref: '#/components/schemas/Community'
 *       403:
 *         description: This community is private
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const getCommunityById = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('ownerId', 'username firstName lastName avatar')
      .populate('members', 'username firstName lastName avatar')
      .populate('bannedMembers', 'username firstName lastName avatar');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user can view this community
    const userId = req.user?.userId;
    if (community.isPrivate && !community.isMember(userId) && !community.isOwner(userId)) {
      return res.status(403).json({ message: 'This community is private' });
    }

    res.json({ community });

  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities:
 *   post:
 *     summary: Create a new community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interest
 *               - cityName
 *             properties:
 *               interest:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 25
 *                 description: Community interest/topic (e.g., TechHub, Photography, Startup)
 *               cityName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 25
 *                 description: City name where community is located (e.g., Mumbai, Bangalore)
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               location:
 *                 type: string
 *                 maxLength: 200
 *                 description: Detailed location/address
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *               settings:
 *                 type: object
 *                 properties:
 *                   requireApproval:
 *                     type: boolean
 *                     default: false
 *                   allowMemberInvites:
 *                     type: boolean
 *                     default: true
 *                   maxMembers:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10000
 *                     default: 1000
 *     responses:
 *       201:
 *         description: Community created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 community:
 *                   $ref: '#/components/schemas/Community'
 *       400:
 *         description: Validation error, duplicate community name, or name generation failed
 *       409:
 *         description: Community name already exists
 *       500:
 *         description: Server error
 */
const createCommunity = [
  body('interest').trim().isLength({ min: 3, max: 25 }).withMessage('Interest/topic must be 3-25 characters long').matches(/^[A-Za-z0-9\s]+$/).withMessage('Interest can only contain letters, numbers, and spaces'),
  body('cityName').trim().isLength({ min: 3, max: 25 }).withMessage('City name must be 3-25 characters long').matches(/^[A-Za-z0-9\s]+$/).withMessage('City name can only contain letters, numbers, and spaces'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { interest, cityName, description, location, tags, isPrivate, settings } = req.body;

      // Generate the full community name from interest and cityName
      const generatedName = `${interest.trim()} ${cityName.trim()}`;

      // Check if user already owns a community with the same interest + city combination
      const existingCommunity = await Community.findOne({ 
        name: { $regex: new RegExp(`^${generatedName}$`, 'i') },
        ownerId: req.user.userId 
      });

      if (existingCommunity) {
        return res.status(409).json({ 
          message: 'You already own a community for this interest in this city',
          existingCommunity: {
            id: existingCommunity._id,
            name: existingCommunity.name,
            interest: existingCommunity.interest,
            cityName: existingCommunity.cityName
          }
        });
      }

      // Check if any community exists with the same generated name (across all users)
      const duplicateName = await Community.findOne({ name: generatedName });
      if (duplicateName) {
        return res.status(409).json({ 
          message: `A community named "${generatedName}" already exists`,
          existingCommunity: {
            id: duplicateName._id,
            name: duplicateName.name,
            interest: duplicateName.interest,
            cityName: duplicateName.cityName,
            owner: duplicateName.ownerId
          }
        });
      }

      const community = new Community({
        interest: interest.trim(),
        cityName: cityName.trim(),
        description: description || '',
        location: location || '',
        tags: tags || [],
        isPrivate: isPrivate || false,
        ownerId: req.user.userId,
        members: [req.user.userId], // Owner is automatically a member
        memberCount: 1,
        settings: {
          requireApproval: settings?.requireApproval || false,
          allowMemberInvites: settings?.allowMemberInvites !== false,
          maxMembers: settings?.maxMembers || 1000
        }
      });

      await community.save();
      await community.populate('ownerId', 'username firstName lastName avatar');

      // Add community to owner's joined communities
      await User.findByIdAndUpdate(req.user.userId, {
        $push: { joinedCommunities: community._id }
      });

      res.status(201).json({
        message: 'Community created successfully',
        community
      });

    } catch (error) {
      console.error('Create community error:', error);
      if (error.message && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error during community creation' });
    }
  }
];

module.exports = {
  getCommunityById,
  createCommunity
};