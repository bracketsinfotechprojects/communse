const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Interest = require('../models/Interest');

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
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
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     // avatar: // Field commented out in User model
 *                     // bio: // Field commented out in User model
 *                     // followers: // Field commented out in User model
 *                     // following: // Field commented out in User model
 *                     // socialLinks: // Field commented out in User model
 *                     isVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const getUserById = async (req, res) => {
  try {
    // FIX: Remove populate for non-existent fields (followers/following are commented out in User model)
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        // Removed commented-out fields: avatar, bio, followers, following, socialLinks
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        // Include available fields
        interests: user.interests || [],
        joinedCommunities: user.joinedCommunities || [],
        location: user.location || {},
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               // bio: // Field commented out in User model
 *               // socialLinks: // Field commented out in User model
 *                 properties:
 *                   twitter:
 *                     type: string
 *                   linkedin:
 *                     type: string
 *                   github:
 *                     type: string
 *                   website:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const updateUserProfile = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  // Removed bio validation - field is commented out in User model
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName /*, bio, socialLinks - commented out fields */ } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update fields (only if fields exist in model)
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      // Removed bio and socialLinks updates - fields are commented out in User model
      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          // Removed avatar, bio, socialLinks - fields are commented out in User model
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          interests: user.interests || [],
          joinedCommunities: user.joinedCommunities || [],
          location: user.location || {},
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
];

/**
 * @swagger
 * /api/users/follow/{id}:
 *   post:
 *     summary: Follow or unfollow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to follow/unfollow
 *     responses:
 *       200:
 *         description: Follow/unfollow action completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Followed successfully" # or "Unfollowed successfully"
 *       400:
 *         description: Invalid request (following yourself or user not found)
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const followUser = async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Note: This function would need followers/following fields to be uncommented in User model
    return res.status(501).json({ 
      message: 'Follow functionality temporarily disabled - followers/following fields not implemented' 
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/users/search/{query}:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (username, first name, or last name)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       // avatar: // Field commented out in User model
 *                       // bio: // Field commented out in User model
 *       500:
 *         description: Server error
 */
const searchUsers = async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    })
    // FIX: Remove avatar and bio from select as they're commented out in User model
    .select('username firstName lastName')
    .limit(20);

    res.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @swagger
 * /api/users/{id}/interests:
 *   put:
 *     summary: Update user's interests
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
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of interest names
 *               action:
 *                 type: string
 *                 enum: [add, remove, replace]
 *                 default: replace
 *                 description: Action to perform on interests
 *     responses:
 *       200:
 *         description: Interests updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 interests:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - can only update own interests
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const updateUserInterests = [
  body('interests')
    .isArray({ min: 1 })
    .withMessage('Interests must be a non-empty array'),
  body('interests.*')
    .trim()
    .isLength({ min: 3, max: 25 })
    .matches(/^[A-Za-z0-9\s]+$/)
    .withMessage('Each interest must be 3-25 characters and contain only letters, numbers, and spaces'),
  body('action')
    .optional()
    .isIn(['add', 'remove', 'replace'])
    .withMessage('Action must be one of: add, remove, replace'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { interests, action = 'replace' } = req.body;

      // Check if user is updating their own interests
      if (req.user.userId !== id) {
        return res.status(403).json({ message: 'You can only update your own interests' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Validate and process interests
      const processedInterests = [];
      const failedInterests = [];

      for (const interestName of interests) {
        try {
          // Normalize interest name (same as Interest model)
          const normalizedName = interestName.trim().toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());

          // Check if interest exists in Interest collection
          let interest = await Interest.findOne({ name: normalizedName });
          
          // If interest doesn't exist, create it
          if (!interest) {
            interest = new Interest({ 
              name: normalizedName,
              createdBy: req.user.userId 
            });
            await interest.save();
          }

          processedInterests.push(normalizedName);
        } catch (error) {
          failedInterests.push({
            name: interestName,
            error: error.message
          });
        }
      }

      // Perform action based on request
      let currentInterests = user.interests || [];
      
      switch (action) {
        case 'add':
          // Add new interests that aren't already present
          const interestsToAdd = processedInterests.filter(
            interest => !currentInterests.includes(interest)
          );
          user.interests = [...currentInterests, ...interestsToAdd];
          break;
          
        case 'remove':
          // Remove specified interests
          user.interests = currentInterests.filter(
            interest => !processedInterests.includes(interest)
          );
          break;
          
        case 'replace':
        default:
          // Replace all interests
          user.interests = processedInterests;
          break;
      }

      await user.save();

      const response = {
        message: `Interests ${action}ed successfully`,
        interests: user.interests,
        summary: {
          requested: interests.length,
          processed: processedInterests.length,
          failed: failedInterests.length,
          action: action
        }
      };

      if (failedInterests.length > 0) {
        response.failed = failedInterests;
        return res.status(207).json(response); // 207 Multi-Status
      }

      res.json(response);

    } catch (error) {
      console.error('Update interests error:', error);
      res.status(500).json({ message: 'Error updating interests' });
    }
  }
];

/**
 * @swagger
 * /api/users/{id}/interests:
 *   get:
 *     summary: Get user's interests
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
 *         description: User interests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 interests:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: number
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const getUserInterests = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('interests');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      userId: user._id,
      interests: user.interests || [],
      count: (user.interests || []).length
    });

  } catch (error) {
    console.error('Get user interests error:', error);
    res.status(500).json({ message: 'Error retrieving user interests' });
  }
};

module.exports = {
  getUserById,
  updateUserProfile,
  followUser,
  searchUsers,
  updateUserInterests,
  getUserInterests
};