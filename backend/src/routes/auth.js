const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth'); // 'auth' here correctly references the auth function
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/emailService');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - agreedToTOS
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               agreedToTOS:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('agreedToTOS').isBoolean().custom(value => {
    if (value !== true) {
      throw new Error('User must agree to Terms of Service');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName, agreedToTOS } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      passwordHash: password, // Will be auto-hashed by pre-save middleware
      firstName,
      lastName,
      agreedToTOS
    });
    
    console.log('Creating user with data:', {
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash ? 'present' : 'missing',
      firstName: user.firstName,
      lastName: user.lastName,
      agreedToTOS: user.agreedToTOS
    });

    await user.save();

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user._id, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, just log it
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account before logging in.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verify user email with token (direct link from email)
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired verification token
 *       500:
 *         description: Server error
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    // Find and verify user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Email already verified. You can login.' });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    res.json({
      message: 'Email verified successfully. You can now login.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email with token (POST method)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid verification token or email already verified
 *       500:
 *         description: Server error
 */
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    // Find and verify user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    res.json({
      message: 'Email verified successfully. You can now login.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: Invalid credentials or validation error
 *       401:
 *         description: Account not verified or deactivated
 *       500:
 *         description: Server error
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }

    // Check if password hash exists
    if (!user.passwordHash) {
      console.error('Password hash missing for user:', user.email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    let isMatch = false;
    try {
      console.log('Attempting password comparison...');
      console.log('Password provided:', password ? 'YES' : 'NO');
      console.log('User passwordHash exists:', !!user.passwordHash);
      console.log('User passwordHash length:', user.passwordHash ? user.passwordHash.length : 0);
      
      isMatch = await user.comparePassword(password);
      
      console.log('Password comparison result:', isMatch);
    } catch (error) {
      console.error('Password comparison error:', error.message);
      console.error('Password comparison stack:', error.stack);
      return res.status(400).json({ message: 'Invalid credentials', debug: error.message });
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await user.updateLastLogin().catch(error => {
      console.error('Failed to update last login:', error);
      // Don't fail login if last login update fails
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        lastLogin: user.lastLogin,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    // Log more detailed error information for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Check for specific common errors
    if (error.message.includes('password')) {
      return res.status(400).json({ message: 'Password comparison failed' });
    }
    
    if (error.message.includes('JWT')) {
      return res.status(400).json({ message: 'Token generation failed' });
    }
    
    res.status(500).json({ 
      message: 'Server error during login', 
      details: error.message,
      errorName: error.name
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     followers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     following:
 *                       type: array
 *                       items:
 *                         type: object
 *                     socialLinks:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('joinedCommunities', 'name description');
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
        interests: user.interests,
        joinedCommunities: user.joinedCommunities,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send password reset email
    try {
      // TODO: Implement password reset email sending
      // await sendPasswordResetEmail(user.email, resetToken);
      console.log(`Password reset token for ${email}: ${resetToken}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Include token in response for development/testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid token or validation error
 *       500:
 *         description: Server error
 */
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Find and update user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Update password (will be hashed by pre-save middleware)
    user.passwordHash = newPassword;
    await user.save();

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// @route   GET /api/auth/test-login
// @desc    Test endpoint to check database and create test user
// @access  Public
router.get('/test-login', async (req, res) => {
  try {
    // Try to find an existing test user
    let user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      // Create a test user - note the field name should be 'passwordHash'
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123', // This will be hashed by the pre-save middleware
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        agreedToTOS: true
      });
      
      await user.save();
      console.log('Test user created successfully');
    }
    
    // Check if password hash exists and is not empty
    const hasPassword = !!user.passwordHash && user.passwordHash.length > 0;
    
    res.json({
      message: 'Test endpoint working',
      userExists: !!user,
      userId: user._id,
      email: user.email,
      isVerified: user.isVerified,
      hasPassword: hasPassword,
      passwordLength: user.passwordHash ? user.passwordHash.length : 0,
      isPasswordHashed: user.passwordHash && user.passwordHash.length > 20
    });
    
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ 
      message: 'Test endpoint error', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// @route   POST /api/auth/reset-test
// @desc    Reset test user (delete and recreate)
// @access  Public
router.post('/reset-test', async (req, res) => {
  try {
    // Delete existing test user
    await User.deleteOne({ email: 'test@example.com' });
    
    // Create fresh test user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'password123', // This will be hashed by the pre-save middleware
      firstName: 'Test',
      lastName: 'User',
      isVerified: true,
      agreedToTOS: true
    });
    
    await user.save();
    
    res.json({
      message: 'Test user reset successfully',
      userId: user._id,
      email: user.email,
      hasPassword: !!user.passwordHash
    });
    
  } catch (error) {
    console.error('Reset test error:', error);
    res.status(500).json({ 
      message: 'Reset test error', 
      error: error.message 
    });
  }
});

// @route   POST /api/auth/create-debug-user
// @desc    Create user with custom credentials for debugging
// @access  Public
router.post('/create-debug-user', async (req, res) => {
  try {
    const { email, password, username = 'debuguser', firstName = 'Debug', lastName = 'User' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Delete existing user with same email
    await User.deleteOne({ email });
    
    // Create new user
    const user = new User({
      username,
      email,
      passwordHash: password, // This will be hashed by the pre-save middleware
      firstName,
      lastName,
      isVerified: true,
      agreedToTOS: true
    });
    
    await user.save();
    
    res.json({
      message: 'Debug user created successfully',
      userId: user._id,
      email: user.email,
      password: password, // Return password for testing
      isVerified: user.isVerified
    });
    
  } catch (error) {
    console.error('Create debug user error:', error);
    res.status(500).json({ 
      message: 'Create debug user error', 
      error: error.message 
    });
  }
});

// @route   GET /api/auth/debug-login
// @desc    Debug login with specific credentials
// @access  Public
router.get('/debug-login', async (req, res) => {
  try {
    const { email, password } = req.query;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log('Debug login attempt:', { email, password });
    
    // Find user
    const user = await User.findOne({ email }).select('+passwordHash');
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'User not found' });
    }
    
    console.log('User found:', { 
      id: user._id, 
      email: user.email, 
      isVerified: user.isVerified,
      hasPassword: !!user.passwordHash,
      passwordLength: user.passwordHash ? user.passwordHash.length : 0
    });
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }
    
    if (!user.passwordHash) {
      console.log('No password hash found');
      return res.status(400).json({ message: 'No password hash found' });
    }
    
    // Try password comparison
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
      console.log('Password comparison result:', isMatch);
    } catch (error) {
      console.error('Password comparison failed:', error.message);
      return res.status(400).json({ message: 'Password comparison failed', error: error.message });
    }
    
    if (isMatch) {
      console.log('Login successful!');
      return res.json({ 
        message: 'Login successful', 
        userId: user._id,
        email: user.email 
      });
    } else {
      console.log('Password does not match');
      return res.status(400).json({ message: 'Password does not match' });
    }
    
  } catch (error) {
    console.error('Debug login error:', error);
    res.status(500).json({ 
      message: 'Debug login error', 
      error: error.message 
    });
  }
});

// @route   POST /api/auth/bulk-create-users
// @desc    Create multiple test users with common password
// @access  Public (for testing only)
router.post('/bulk-create-users', async (req, res) => {
  try {
    const { count = 10, password = 'password123', baseUsername = 'testuser' } = req.body;

    const users = [];
    const existingEmails = new Set();
    
    // Check how many users already exist to avoid conflicts
    const existingCount = await User.countDocuments();
    console.log(`Existing users count: ${existingCount}`);

    for (let i = 1; i <= count; i++) {
      const username = `${baseUsername}${existingCount + i}`;
      const email = `testuser${existingCount + i}@example.com`;
      
      // Ensure unique email
      let finalEmail = email;
      let counter = 1;
      while (existingEmails.has(finalEmail) || await User.findOne({ email: finalEmail })) {
        finalEmail = `testuser${existingCount + i}_${counter}@example.com`;
        counter++;
      }
      existingEmails.add(finalEmail);

      const user = new User({
        username,
        email: finalEmail,
        passwordHash: password, // Will be hashed by pre-save middleware
        firstName: `Test${existingCount + i}`,
        lastName: 'User',
        isVerified: true,
        agreedToTOS: true
      });

      users.push(user);
    }

    // Save all users
    await Promise.all(users.map(user => user.save()));

    const createdUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified
    }));

    res.json({
      message: `${count} users created successfully`,
      users: createdUsers,
      password: password,
      totalCreated: count,
      existingCount: existingCount
    });

  } catch (error) {
    console.error('Bulk create users error:', error);
    res.status(500).json({ 
      message: 'Error creating users', 
      error: error.message 
    });
  }
});

module.exports = router;