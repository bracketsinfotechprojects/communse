const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Core Identification Fields
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  mobileNumber: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid mobile number']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    select: false
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  // avatar: {
  //   type: String,
  //   default: ''
  // },
  // bio: {
  //   type: String,
  //   maxlength: [500, 'Bio cannot exceed 500 characters'],
  //   default: ''
  // },

  // Account Management
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  agreedToTOS: {
    type: Boolean,
    required: [true, 'User must agree to Terms of Service'],
    default: false
  },

  // Social Features
  // followers: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User'
  // }],
  // following: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User'
  // }],
  interests: [{
    type: String,
    trim: true
  }],
  joinedCommunities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  }],

  // Social Links
  // socialLinks: {
  //   twitter: String,
  //   linkedin: String,
  //   website: String
  // },

  // Activity Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimal query performance and scalability
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ mobileNumber: 1 }, { sparse: true, unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Compound indexes for common query patterns
userSchema.index({ isActive: 1, isVerified: 1, createdAt: -1 });
userSchema.index({ role: 1, isActive: 1 });

// Text search index for user discovery
userSchema.index({ 
  username: 'text', 
  firstName: 'text', 
  lastName: 'text',
  interests: 'text' 
});

// For large-scale joined communities (sharding consideration)
userSchema.index({ joinedCommunities: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for community count (more efficient than counting array)
userSchema.virtual('communityCount').get(function() {
  return this.joinedCommunities ? this.joinedCommunities.length : 0;
});

// Virtual to check if user is verified
userSchema.virtual('isFullyVerified').get(function() {
  return this.isVerified && this.agreedToTOS;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword || typeof candidatePassword !== 'string') {
    throw new Error('Password is required and must be a string');
  }
  
  if (!this.passwordHash || typeof this.passwordHash !== 'string') {
    throw new Error('Password hash not found or invalid for user');
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    console.error('Bcrypt comparison error:', error);
    throw new Error('Password comparison failed');
  }
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

module.exports = mongoose.model('User', userSchema);