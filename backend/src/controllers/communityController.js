const { body, validationResult } = require('express-validator');
const Community = require('../models/Community');
const User = require('../models/User');
const LocationService = require('../services/locationService');

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
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     minLength: 3
 *                     maxLength: 25
 *                     description: City name (alternative to cityName)
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         minimum: -90
 *                         maximum: 90
 *                       longitude:
 *                         type: number
 *                         minimum: -180
 *                         maximum: 180
 *               latitude:
 *                 type: number
 *                 description: Community latitude (alternative to coordinates in location)
 *               longitude:
 *                 type: number
 *                 description: Community longitude (alternative to coordinates in location)
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
  body('cityName').optional().trim().isLength({ min: 3, max: 25 }).withMessage('City name must be 3-25 characters long').matches(/^[A-Za-z0-9\s]+$/).withMessage('City name can only contain letters, numbers, and spaces'),
  body('location.city').optional().trim().isLength({ min: 3, max: 25 }).withMessage('City name must be 3-25 characters long').matches(/^[A-Za-z0-9\s]+$/).withMessage('City name can only contain letters, numbers, and spaces'),
  body('location.coordinates.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('location.coordinates.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { interest, cityName, location, latitude, longitude, description, tags, isPrivate, settings } = req.body;

      // Determine city name from various possible inputs
      const finalCityName = location?.city || cityName;
      if (!finalCityName) {
        return res.status(400).json({ message: 'City name is required (either cityName or location.city)' });
      }

      // Generate the full community name from interest and city
      const generatedName = `${interest.trim()} ${finalCityName.trim()}`;

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
            cityName: existingCommunity.location?.city
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
            cityName: duplicateName.location?.city,
            owner: duplicateName.ownerId
          }
        });
      }

      // Process coordinates and location information
      let finalLocation = {
        city: finalCityName.trim()
      };

      // Determine final coordinates
      let finalCoordinates = null;
      if (location?.coordinates?.latitude && location?.coordinates?.longitude) {
        finalCoordinates = {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude
        };
      } else if (latitude && longitude) {
        finalCoordinates = { latitude, longitude };
      } else {
        // Try to get coordinates from city name using LocationService
        try {
          const locationService = new LocationService();
          // Use our major cities database for coordinate resolution
          const cityCoordinates = Object.entries(locationService.majorCities).find(
            ([name]) => name.toLowerCase() === finalCityName.toLowerCase()
          );
          
          if (cityCoordinates) {
            finalCoordinates = {
              latitude: cityCoordinates[1].lat,
              longitude: cityCoordinates[1].lng
            };
          }
        } catch (error) {
          console.warn('Could not resolve coordinates for city:', finalCityName);
        }
      }

      if (finalCoordinates) {
        finalLocation.coordinates = finalCoordinates;
      }

      const community = new Community({
        interest: interest.trim(),
        location: finalLocation,
        description: description || '',
        tags: tags || [],
        isPrivate: isPrivate || false,
        ownerId: req.user.userId,
        members: [req.user.userId], // Owner is automatically a member
        memberCount: 1,
        settings: {
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

/**
 * @swagger
 * /api/communities:
 *   get:
 *     summary: Get all communities with filtering and pagination
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of communities per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in community names and descriptions
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: isPrivate
 *         schema:
 *           type: boolean
 *         description: Filter by privacy setting
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, memberCount]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Communities retrieved successfully
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
const getAllCommunities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const tags = req.query.tags;
    const isPrivate = req.query.isPrivate;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    let query = {};

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Privacy filter
    if (isPrivate !== undefined && isPrivate !== null && isPrivate !== '') {
      query.isPrivate = isPrivate === 'true';
    }

    const skip = (page - 1) * limit;

    const communities = await Community.find(query)
      .populate('ownerId', 'username firstName lastName avatar')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Community.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      communities,
      pagination: {
        currentPage: page,
        totalPages,
        totalCommunities: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get all communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/join:
 *   post:
 *     summary: Join a community
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
 *         description: Successfully joined the community
 *       400:
 *         description: Already a member, banned, or community at max capacity
 *       403:
 *         description: Private community requiring approval or banned user
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const joinCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if community is private - private communities always require approval
    if (community.isPrivate && !community.isOwner(req.user.userId)) {
      // Add user to pending requests
      try {
        await community.addPendingRequest(req.user.userId, req.body.message || '');
        return res.status(403).json({ 
          message: 'This community is private and requires approval to join. Your request has been sent.',
          status: 'pending_approval'
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    // Check if user is already a member
    if (community.isMember(req.user.userId)) {
      return res.status(400).json({ message: 'You are already a member of this community' });
    }

    // Check if user is banned
    if (community.isBanned(req.user.userId)) {
      return res.status(403).json({ message: 'You are banned from this community' });
    }

    // Check if community is at max capacity
    if (community.isAtMaxCapacity) {
      return res.status(403).json({ message: 'Community has reached maximum member capacity' });
    }

    // Add user to community
    await community.addMember(req.user.userId);

    // Add community to user's joined communities
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { joinedCommunities: community._id }
    });

    res.json({
      message: 'Successfully joined the community',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Join community error:', error);
    if (error.message.includes('already a member') || 
        error.message.includes('banned') || 
        error.message.includes('maximum member capacity')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/leave:
 *   post:
 *     summary: Leave a community
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
 *         description: Successfully left the community
 *       400:
 *         description: Not a member or owner trying to leave
 *       403:
 *         description: Community owner cannot leave their own community
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const leaveCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is a member
    if (!community.isMember(req.user.userId)) {
      return res.status(400).json({ message: 'You are not a member of this community' });
    }

    // Check if user is the owner
    if (community.isOwner(req.user.userId)) {
      return res.status(403).json({ message: 'Community owner cannot leave their own community' });
    }

    // Remove user from community
    await community.removeMember(req.user.userId);

    // Remove community from user's joined communities
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { joinedCommunities: community._id }
    });

    res.json({
      message: 'Successfully left the community',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Leave community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/my/joined:
 *   get:
 *     summary: Get communities joined by current user
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retrieved user's communities successfully
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
const getMyCommunities = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const communities = await Community.find({
      $or: [
        { members: userId },
        { ownerId: userId }
      ]
    })
    .populate('ownerId', 'username firstName lastName avatar')
    .sort({ createdAt: -1 });

    res.json({ communities });

  } catch (error) {
    console.error('Get my communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}:
 *   put:
 *     summary: Update a community
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interest:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 25
 *               cityName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 25
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Community updated successfully
 *       403:
 *         description: Only community owner can update
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const updateCommunity = async (req, res) => {
  try {
    const { interest, cityName, description, location, tags, isPrivate } = req.body;
    
    // Validate interest if provided
    if (interest) {
      if (interest.length < 3 || interest.length > 25 || !/^[A-Za-z0-9\s]+$/.test(interest)) {
        return res.status(400).json({ message: 'Interest must be 3-25 characters long and contain only letters, numbers, and spaces' });
      }
    }
    
    // Validate city name if provided
    if (location?.city) {
      if (location.city.length < 3 || location.city.length > 25 || !/^[A-Za-z0-9\s]+$/.test(location.city)) {
        return res.status(400).json({ message: 'City name must be 3-25 characters long and contain only letters, numbers, and spaces' });
      }
    } else if (cityName) {
      if (cityName.length < 3 || cityName.length > 25 || !/^[A-Za-z0-9\s]+$/.test(cityName)) {
        return res.status(400).json({ message: 'City name must be 3-25 characters long and contain only letters, numbers, and spaces' });
      }
    }
    
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is the owner
    if (!community.isOwner(req.user.userId)) {
      return res.status(403).json({ message: 'Only community owner can update' });
    }

    // Update fields
    if (interest !== undefined) community.interest = interest.trim();
    
    if (location?.city) {
      community.location = community.location || {};
      community.location.city = location.city.trim();
    } else if (cityName !== undefined) {
      community.location = community.location || {};
      community.location.city = cityName.trim();
    }
    
    if (location?.coordinates) {
      community.location = community.location || {};
      community.location.coordinates = location.coordinates;
    }
    
    if (description !== undefined) community.description = description;
    if (tags !== undefined) community.tags = tags;
    if (isPrivate !== undefined) community.isPrivate = isPrivate;

    await community.save();
    await community.populate('ownerId', 'username firstName lastName avatar');

    res.json({
      message: 'Community updated successfully',
      community
    });

  } catch (error) {
    console.error('Update community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}:
 *   delete:
 *     summary: Delete a community
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
 *         description: Community deleted successfully
 *       403:
 *         description: Only community owner can delete
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is the owner
    if (!community.isOwner(req.user.userId)) {
      return res.status(403).json({ message: 'Only community owner can delete' });
    }

    await Community.findByIdAndDelete(req.params.id);

    // Remove community from all users' joined communities
    await User.updateMany(
      { joinedCommunities: req.params.id },
      { $pull: { joinedCommunities: req.params.id } }
    );

    res.json({ message: 'Community deleted successfully' });

  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/members:
 *   get:
 *     summary: Get community members
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
 *         description: Community members retrieved successfully
 *       401:
 *         description: Unauthorized - No token provided or invalid token
 *       403:
 *         description: This community is private or user is not a member
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const getCommunityMembers = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('members', 'username firstName lastName avatar createdAt')
      .populate('ownerId', 'username firstName lastName avatar');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // For private communities, check access permissions
    if (community.isPrivate) {
      const userId = req.user?.userId;
      
      // For private communities, unauthenticated users cannot access
      if (!userId) {
        return res.status(403).json({ 
          message: 'This community is private. Please log in to view members.',
          requiresAuth: true 
        });
      }
      
      // Check if user is member or owner with proper null checks
      const isOwner = userId && community.ownerId && community.ownerId._id.toString() === userId.toString();
      const isMember = userId && community.members.some(member => member._id.toString() === userId.toString());
      
      if (!isOwner && !isMember) {
        return res.status(403).json({ 
          message: 'This community is private. Only members can view the member list.',
          requiresMembership: true 
        });
      }
    }

    res.json({
      members: community.members,
      owner: community.ownerId,
      memberCount: community.memberCount
    });

  } catch (error) {
    console.error('Get community members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/settings:
 *   put:
 *     summary: Update community settings
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allowMemberInvites:
 *                 type: boolean
 *                 description: Whether members can invite others
 *               maxMembers:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 description: Maximum number of members allowed
 *     responses:
 *       200:
 *         description: Community settings updated successfully
 *       400:
 *         description: Max members cannot be less than current member count
 *       403:
 *         description: Only community owner can update settings
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const updateCommunitySettings = async (req, res) => {
  try {
    const { allowMemberInvites, maxMembers } = req.body;
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is the owner
    if (!community.isOwner(req.user.userId)) {
      return res.status(403).json({ message: 'Only community owner can update settings' });
    }

    // Update settings
    if (allowMemberInvites !== undefined) {
      community.settings.allowMemberInvites = allowMemberInvites;
    }
    if (maxMembers !== undefined) {
      if (maxMembers < community.memberCount) {
        return res.status(400).json({ 
          message: 'Max members cannot be less than current member count' 
        });
      }
      community.settings.maxMembers = maxMembers;
    }

    await community.save();

    res.json({
      message: 'Community settings updated successfully',
      settings: community.settings
    });

  } catch (error) {
    console.error('Update community settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/pending-requests:
 *   get:
 *     summary: Get pending join requests (owner/admin only)
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
 *         description: Pending requests retrieved successfully
 *       403:
 *         description: Only community owner or admin can view pending requests
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const getPendingRequests = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('pendingMembers.userId', 'username firstName lastName avatar');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can view pending requests' });
    }

    res.json({ 
      community: {
        _id: community._id,
        name: community.name,
        description: community.description
      },
      pendingRequests: community.pendingMembers.map(pending => ({
        _id: pending._id,
        userId: pending.userId,
        requestedAt: pending.requestedAt,
        message: pending.message
      }))
    });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/approve/{userId}:
 *   post:
 *     summary: Approve a user join request (owner/admin only)
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
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to approve
 *     responses:
 *       200:
 *         description: User approved successfully
 *       400:
 *         description: No pending request found or user already a member
 *       403:
 *         description: Only community owner or admin can approve users
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const approveUserRequest = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can approve users' });
    }

    const { userId: approveUserId } = req.params;

    // Approve the user
    await community.approveMember(approveUserId);

    // Add community to user's joined communities
    await User.findByIdAndUpdate(approveUserId, {
      $push: { joinedCommunities: community._id }
    });

    res.json({ 
      message: 'User approved successfully',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Approve user error:', error);
    if (error.message.includes('No pending request found') || 
        error.message.includes('already a member') ||
        error.message.includes('banned') ||
        error.message.includes('maximum member capacity')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/reject/{userId}:
 *   post:
 *     summary: Reject a user join request (owner/admin only)
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
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to reject
 *     responses:
 *       200:
 *         description: User request rejected successfully
 *       400:
 *         description: No pending request found
 *       403:
 *         description: Only community owner or admin can reject users
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const rejectUserRequest = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can reject users' });
    }

    const { userId: rejectUserId } = req.params;

    // Reject the user
    await community.rejectMember(rejectUserId);

    res.json({ 
      message: 'User request rejected successfully'
    });

  } catch (error) {
    console.error('Reject user error:', error);
    if (error.message.includes('No pending request found')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/remove/{userId}:
 *   post:
 *     summary: Remove a user from community (owner/admin only)
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
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: User removed successfully
 *       400:
 *         description: User is not a member
 *       403:
 *         description: Only community owner or admin can remove users, or cannot remove community owner
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const removeUserFromCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    const { userId: removeUserId } = req.params;

    // Cannot remove community owner
    if (community.isOwner(removeUserId)) {
      return res.status(403).json({ message: 'Cannot remove community owner' });
    }

    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can remove users' });
    }

    // Remove user from community
    await community.removeMember(removeUserId);

    // Remove community from user's joined communities
    await User.findByIdAndUpdate(removeUserId, {
      $pull: { joinedCommunities: community._id }
    });

    res.json({ 
      message: 'User removed successfully',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Remove user error:', error);
    if (error.message.includes('not a member of this community')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/ban/{userId}:
 *   post:
 *     summary: Ban a user from community (owner/admin only)
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
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to ban
 *     responses:
 *       200:
 *         description: User banned successfully
 *       400:
 *         description: User is not a member or already banned
 *       403:
 *         description: Only community owner or admin can ban users, or cannot ban community owner
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const banUserFromCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    const { userId: banUserId } = req.params;

    // Cannot ban community owner
    if (community.isOwner(banUserId)) {
      return res.status(403).json({ message: 'Cannot ban community owner' });
    }

    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can ban users' });
    }

    // Ban user from community
    await community.banMember(banUserId);

    // Remove community from user's joined communities
    await User.findByIdAndUpdate(banUserId, {
      $pull: { joinedCommunities: community._id }
    });

    res.json({ 
      message: 'User banned successfully',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Ban user error:', error);
    if (error.message.includes('not a member of this community') || 
        error.message.includes('already banned')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/unban/{userId}:
 *   post:
 *     summary: Unban a user from community (owner/admin only)
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
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unban
 *     responses:
 *       200:
 *         description: User unbanned and restored as member successfully
 *       400:
 *         description: User is not banned or community at maximum capacity
 *       403:
 *         description: Only community owner or admin can unban users
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const unbanUserFromCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    const { userId: unbanUserId } = req.params;

    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can unban users' });
    }

    // Unban user from community and restore as member
    await community.unbanMember(unbanUserId);

    // Add community back to user's joined communities
    await User.findByIdAndUpdate(unbanUserId, {
      $push: { joinedCommunities: community._id }
    });

    res.json({ 
      message: 'User unbanned and restored as member successfully',
      community: {
        id: community._id,
        name: community.name,
        memberCount: community.memberCount
      }
    });

  } catch (error) {
    console.error('Unban user error:', error);
    if (error.message.includes('not banned from this community') || 
        error.message.includes('maximum member capacity')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/communities/{id}/banned-users:
 *   get:
 *     summary: Get banned users (owner/admin only)
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
 *         description: Banned users retrieved successfully
 *       403:
 *         description: Only community owner or admin can view banned users
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
const getBannedUsers = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('bannedMembers', 'username firstName lastName avatar');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is owner or admin
    const userId = req.user.userId;
    if (!community.isOwner(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only community owner or admin can view banned users' });
    }

    res.json({ 
      bannedUsers: community.bannedMembers
    });

  } catch (error) {
    console.error('Get banned users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
};