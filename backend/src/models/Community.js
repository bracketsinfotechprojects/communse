const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  // Core Information
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    minlength: [3, 'Community name must be at least 3 characters long'],
    maxlength: [100, 'Community name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
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
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
    default: ''
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
    requireApproval: {
      type: Boolean,
      default: false
    },
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

// Indexes for efficient querying and scalability
communitySchema.index({ name: 'text', description: 'text', tags: 'text' });
communitySchema.index({ ownerId: 1 });
communitySchema.index({ 'members': 1 });
communitySchema.index({ 'pendingMembers.userId': 1 });
communitySchema.index({ isPrivate: 1 });
communitySchema.index({ createdAt: -1 });
communitySchema.index({ memberCount: -1 });
communitySchema.index({ tags: 1, isPrivate: 1 });

// Compound indexes for common query patterns
communitySchema.index({ isPrivate: 1, createdAt: -1 });
communitySchema.index({ tags: 1, createdAt: -1 });

// For very large communities, consider separate membership collections
// This index helps with large member arrays (for sharding strategy)
communitySchema.index({ _id: 1, 'members': 1 });

// Pre-save middleware to update memberCount
communitySchema.pre('save', function(next) {
  if (this.isModified('members')) {
    this.memberCount = this.members.length;
  }
  next();
});

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

// Method to ban member
communitySchema.methods.banMember = function(userId) {
  if (!this.members.includes(userId)) {
    throw new Error('User is not a member of this community');
  }
  
  this.members.pull(userId);
  this.bannedMembers.push(userId);
  this.memberCount = this.members.length;
  return this.save();
};

// Method to unban member and automatically restore as member
communitySchema.methods.unbanMember = function(userId) {
  if (!this.bannedMembers.includes(userId)) {
    throw new Error('User is not banned from this community');
  }
  
  // Check if community is at max capacity
  if (this.isAtMaxCapacity) {
    throw new Error('Community has reached maximum member capacity');
  }
  
  // Remove from banned list and add back to members
  this.bannedMembers.pull(userId);
  this.members.push(userId);
  this.memberCount = this.members.length;
  
  return this.save();
};

// Method to check if user is member
communitySchema.methods.isMember = function(userId) {
  return this.members.includes(userId);
};

// Method to check if user is banned
communitySchema.methods.isBanned = function(userId) {
  return this.bannedMembers.includes(userId);
};

// Method to check if user has pending request
communitySchema.methods.hasPendingRequest = function(userId) {
  return this.pendingMembers.some(pending => pending.userId.toString() === userId.toString());
};

// Method to add pending member request
communitySchema.methods.addPendingRequest = function(userId, message = '') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member');
  }
  if (this.isBanned(userId)) {
    throw new Error('User is banned from this community');
  }
  if (this.hasPendingRequest(userId)) {
    throw new Error('User already has a pending request');
  }
  
  this.pendingMembers.push({
    userId: userId,
    message: message,
    requestedAt: new Date()
  });
  return this.save();
};

// Method to approve member
communitySchema.methods.approveMember = function(userId) {
  const pendingIndex = this.pendingMembers.findIndex(pending => pending.userId.toString() === userId.toString());
  
  if (pendingIndex === -1) {
    throw new Error('No pending request found for this user');
  }
  
  if (this.isMember(userId)) {
    throw new Error('User is already a member');
  }
  
  if (this.isBanned(userId)) {
    throw new Error('User is banned from this community');
  }
  
  if (this.isAtMaxCapacity) {
    throw new Error('Community has reached maximum member capacity');
  }
  
  // Remove from pending and add to members
  this.pendingMembers.splice(pendingIndex, 1);
  this.members.push(userId);
  this.memberCount = this.members.length;
  
  return this.save();
};

// Method to reject member request
communitySchema.methods.rejectMember = function(userId) {
  const pendingIndex = this.pendingMembers.findIndex(pending => pending.userId.toString() === userId.toString());
  
  if (pendingIndex === -1) {
    throw new Error('No pending request found for this user');
  }
  
  this.pendingMembers.splice(pendingIndex, 1);
  return this.save();
};

// Method to check if user is owner
communitySchema.methods.isOwner = function(userId) {
  return this.ownerId.toString() === userId.toString();
};

// Static method to find public communities
communitySchema.statics.findPublic = function(limit = 20, skip = 0) {
  return this.find({ isPrivate: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('ownerId', 'username firstName lastName avatar');
};

// Static method to search communities
communitySchema.statics.searchCommunities = function(query, limit = 20) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .populate('ownerId', 'username firstName lastName avatar');
};

module.exports = mongoose.model('Community', communitySchema);