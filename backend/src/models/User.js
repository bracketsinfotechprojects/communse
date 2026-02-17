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

  // Location Information
  location: {
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State name cannot exceed 100 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    method: {
      type: String,
      enum: ['database_match', 'api_geocoding', 'coordinates_only', 'manual'],
      default: 'manual'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

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
  },

  // Firebase Cloud Messaging Tokens
  fcmTokens: [{
    token: {
      type: String,
      required: true,
      unique: true
    },
    platform: {
      type: String,
      enum: ['web', 'android', 'ios'],
      required: true
    },
    deviceId: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],

  // Notification Preferences
  notificationSettings: {
    communityUpdates: {
      type: Boolean,
      default: true
    },
    eventUpdates: {
      type: Boolean,
      default: true
    },
    nearbyCommunities: {
      type: Boolean,
      default: true
    },
    nearbyEvents: {
      type: Boolean,
      default: true
    },
    radius: {
      type: Number,
      default: 25, // Default radius in kilometers
      min: [1, 'Radius must be at least 1 km'],
      max: [100, 'Radius cannot exceed 100 km']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimal query performance and scalability
// Note: email, username, and mobileNumber indexes are auto-created by unique: true in field definitions
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

// Location indexes for geospatial queries
userSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });
userSchema.index({ 'location.city': 1 });
userSchema.index({ 'location.state': 1 });
userSchema.index({ 'location.country': 1 });
userSchema.index({ 'location.lastUpdated': -1 });

// FCM Token indexes
userSchema.index({ 'fcmTokens.token': 1 }, { unique: true });
userSchema.index({ 'fcmTokens.isActive': 1 });
userSchema.index({ 'fcmTokens.platform': 1 });

// Notification settings indexes
userSchema.index({ 'notificationSettings.communityUpdates': 1 });
userSchema.index({ 'notificationSettings.eventUpdates': 1 });
userSchema.index({ 'notificationSettings.nearbyCommunities': 1 });
userSchema.index({ 'notificationSettings.nearbyEvents': 1 });
userSchema.index({ 'notificationSettings.radius': 1 });

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

// FCM Token Management Methods
userSchema.methods.addFcmToken = function(token, platform, deviceId = null) {
  // Check if token already exists
  const existingTokenIndex = this.fcmTokens.findIndex(t => t.token === token);
  
  if (existingTokenIndex !== -1) {
    // Update existing token
    this.fcmTokens[existingTokenIndex].lastUsed = new Date();
    this.fcmTokens[existingTokenIndex].isActive = true;
    this.fcmTokens[existingTokenIndex].platform = platform;
    this.fcmTokens[existingTokenIndex].deviceId = deviceId;
  } else {
    // Add new token
    this.fcmTokens.push({
      token,
      platform,
      deviceId,
      isActive: true,
      registeredAt: new Date(),
      lastUsed: new Date()
    });
  }
  
  return this.save();
};

userSchema.methods.removeFcmToken = function(token) {
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);
  return this.save();
};

userSchema.methods.deactivateFcmToken = function(token) {
  const tokenIndex = this.fcmTokens.findIndex(t => t.token === token);
  if (tokenIndex !== -1) {
    this.fcmTokens[tokenIndex].isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

userSchema.methods.getActiveFcmTokens = function() {
  return this.fcmTokens.filter(token => token.isActive).map(token => token.token);
};

userSchema.methods.updateNotificationSettings = function(settings) {
  if (settings.communityUpdates !== undefined) {
    this.notificationSettings.communityUpdates = settings.communityUpdates;
  }
  if (settings.eventUpdates !== undefined) {
    this.notificationSettings.eventUpdates = settings.eventUpdates;
  }
  if (settings.nearbyCommunities !== undefined) {
    this.notificationSettings.nearbyCommunities = settings.nearbyCommunities;
  }
  if (settings.nearbyEvents !== undefined) {
    this.notificationSettings.nearbyEvents = settings.nearbyEvents;
  }
  if (settings.radius !== undefined) {
    this.notificationSettings.radius = settings.radius;
  }
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);