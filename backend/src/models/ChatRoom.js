const mongoose = require('mongoose');

const chatParticipantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  pushToken: {
    type: String,
    default: null
  }
});

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() {
      return this.type === 'group';
    }
  },
  type: {
    type: String,
    enum: ['community', 'private'],
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  participants: [chatParticipantSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: function() {
      return this.type === 'community';
    }
  },
  lastMessage: {
    type: String,
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  lastMessageBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowMessageEditing: {
      type: Boolean,
      default: true
    },
    allowMessageDeletion: {
      type: Boolean,
      default: true
    },
    autoDeleteMessages: {
      type: Boolean,
      default: false
    },
    autoDeleteAfterDays: {
      type: Number,
      default: 0
    }
  },
  avatar: {
    type: String,
    default: null
  },
  firebaseRoomId: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
chatRoomSchema.index({ 'participants.userId': 1 });
chatRoomSchema.index({ type: 1, isActive: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });
chatRoomSchema.index({ communityId: 1 });

// Virtual for active participant count
chatRoomSchema.virtual('activeParticipantCount').get(function() {
  return this.participants.filter(p => p.isOnline).length;
});

// Virtual for unread message count for a user
chatRoomSchema.methods.getUnreadCount = function(userId) {
  const participant = this.participants.id(userId);
  if (!participant) return 0;
  
  // This would need to be calculated based on messages
  return 0; // Placeholder - would be calculated from Message collection
};

// Method to check if user is participant
chatRoomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.userId.toString() === userId.toString());
};

// Method to add participant
chatRoomSchema.methods.addParticipant = function(userId, role = 'member') {
  if (!this.isParticipant(userId)) {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date(),
      isOnline: false
    });
  }
  return this.save();
};

// Method to remove participant
chatRoomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId.toString() !== userId.toString());
  return this.save();
};

// Method to update user online status
chatRoomSchema.methods.updateUserOnlineStatus = function(userId, isOnline) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.isOnline = isOnline;
    return this.save();
  }
  return Promise.resolve(this);
};

// Pre-save middleware to generate firebaseRoomId
chatRoomSchema.pre('save', function(next) {
  if (!this.firebaseRoomId) {
    this.firebaseRoomId = `chat_${this._id}_${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);