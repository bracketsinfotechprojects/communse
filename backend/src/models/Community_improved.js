const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  // Core Information
  name: {
    type: String,
    trim: true,
    minlength: [8, 'Community name must be at least 8 characters long'],
    maxlength: [50, 'Community name cannot exceed 50 characters'],
    match: [/^[A-Za-z0-9\s]+$/, 'Name can only contain letters, numbers, and spaces'],
    unique: true // Ensure unique community names globally
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },

  // Location Information (Improved Structure)
  location: {
    city: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      minlength: [3, 'City name must be at least 3 characters long'],
      maxlength: [25, 'City name cannot exceed 25 characters'],
      match: [/^[A-Za-z0-9\s]+$/, 'City name can only contain letters, numbers, and spaces']
    },
    fullAddress: {
      type: String,
      trim: true,
      maxlength: [200, 'Full address cannot exceed 200 characters'],
      default: ''
    },
    venueDetails: {
      type: String,
      trim: true,
      maxlength: [100, 'Venue details cannot exceed 100 characters'],
      default: ''
    },
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
    }
  },

  // Interest/Topic for community identification
  interest: {
    type: String,
    required: [true, 'Community interest/topic is required'],
    trim: true,
    minlength: [3, 'Interest/topic must be at least 3 characters long'],
    maxlength: [25, 'Interest/topic cannot exceed 25 characters'],
    match: [/^[A-Za-z0-9\s]+$/, 'Interest can only contain letters, numbers, and spaces']
  },

  // Ownership and Access Control
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Community owner is required'],
    ref: 'User'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },

  // Community Content
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Membership Management
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingMembers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      maxlength: 500
    }
  }],
  bannedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Community Statistics
  memberCount: {
    type: Number,
    default: 0
  },

  // Community Settings
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      default: 1000,
      min: [1, 'Maximum members must be at least 1'],
      max: [10000, 'Maximum members cannot exceed 10,000']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for actual member count
communitySchema.virtual('actualMemberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual to check if community is at max capacity
communitySchema.virtual('isAtMaxCapacity').get(function() {
  return this.settings && this.memberCount >= this.settings.maxMembers;
});

// Virtual for formatted location display
communitySchema.virtual('displayLocation').get(function() {
  const parts = [];
  if (this.location?.venueDetails) parts.push(this.location.venueDetails);
  if (this.location?.fullAddress) parts.push(this.location.fullAddress);
  if (this.location?.city) parts.push(this.location.city);
  return parts.join(', ');
});

// Virtual to check if has coordinates
communitySchema.virtual('hasCoordinates').get(function() {
  return this.location?.coordinates?.latitude && this.location?.coordinates?.longitude;
});

// Indexes for efficient querying and scalability
communitySchema.index({ name: 'text', description: 'text', tags: 'text' });
communitySchema.index({ ownerId: 1 });
communitySchema.index({ 'members': 1 });
communitySchema.index({ 'pendingMembers.userId': 1 });
communitySchema.index({ isPrivate: 1 });
communitySchema.index({ createdAt: -1 });
communitySchema.index({ memberCount: -1 });
communitySchema.index({ tags: 1, isPrivate: 1 });
communitySchema.index({ 'location.city': 1 });
communitySchema.index({ 'location.coordinates': '2dsphere' });

// Unique name index for faster duplicate detection
communitySchema.index({ name: 1 }, { unique: true });

// Compound index for interest and city queries
communitySchema.index({ interest: 1, 'location.city': 1 });

// Compound indexes for common query patterns
communitySchema.index({ isPrivate: 1, createdAt: -1 });
communitySchema.index({ tags: 1, createdAt: -1 });

// For very large communities, consider separate membership collections
// This index helps with large member arrays (for sharding strategy)
communitySchema.index({ _id: 1, 'members': 1 });

// Pre-save middleware to auto-generate name from interest and city
communitySchema.pre('save', async function(next) {
  try {
    // Update member count
    if (this.isModified('members')) {
      this.memberCount = this.members ? this.members.length : 0;
    }
    
    // Auto-generate name from interest and location.city
    if (this.isNew || this.isModified('interest') || this.isModified('location.city') || !this.name) {
      if (!this.interest || !this.location?.city) {
        return next(new Error('Both interest and city are required to generate community name'));
      }
      
      const cleanInterest = this.interest.trim().replace(/\s+/g, ' ');
      const cleanCity = this.location.city.trim().replace(/\s+/g, ' ');
      const generatedName = `${cleanInterest} ${cleanCity}`;
      
      // Validate generated name length
      if (generatedName.length < 8) {
        return next(new Error('Generated community name is too short. Interest and city name combined must be at least 8 characters.'));
      }
      
      if (generatedName.length > 50) {
        return next(new Error('Generated community name is too long. Interest and city name combined cannot exceed 50 characters.'));
      }
      
      // Check if the generated name already exists
      const existingCommunity = await this.constructor.findOne({ 
        name: { $regex: new RegExp(`^${generatedName}$`, 'i') },
        _id: { $ne: this._id } // Exclude current document
      });
      
      if (existingCommunity) {
        return next(new Error(`A community named "${generatedName}" already exists`));
      }
      
      this.name = generatedName;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to check if community name exists
communitySchema.statics.isNameTaken = async function(name, excludeId = null) {
  const query = { name: name.trim() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return await this.findOne(query);
};

// Method to add member
communitySchema.methods.addMember = function(userId) {
  if (this.members.includes(userId)) {
    throw new Error('User is already a member');
  }
  if (this.bannedMembers.includes(userId)) {
    throw new Error('User is banned from this community');
  }
  if (this.isAtMaxCapacity) {
    throw new Error('Community has reached maximum member capacity');
  }
  
  this.members.push(userId);
  this.memberCount = this.members.length;
  return this.save();
};

// Method to remove member
communitySchema.methods.removeMember = function(userId) {
  if (!this.members.includes(userId)) {
    throw new Error('User is not a member of this community');
  }
  
  this.members.pull(userId);
  this.memberCount = this.members.length;
  return this.save();
};

// Static method to find communities by location
communitySchema.statics.findByLocation = function(city, limit = 20) {
  return this.find({ 'location.city': new RegExp(city, 'i') })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('ownerId', 'username firstName lastName avatar');
};

// Static method to find communities within radius
communitySchema.statics.findNearby = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  }).populate('ownerId', 'username firstName lastName avatar');
};

module.exports = mongoose.model('Community', communitySchema);