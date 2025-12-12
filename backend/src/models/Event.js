const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['confirmed', 'waitlist'],
    default: 'confirmed'
  }
});

const eventSchema = new mongoose.Schema({
  // Core Identification
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  
  // Community Relationship
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Community ID is required'],
    ref: 'Community'
  },
  
  // Event Basic Information
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [5, 'Event title must be at least 5 characters'],
    maxlength: [100, 'Event title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Event Timing
  startTime: {
    type: Date,
    required: [true, 'Event start time is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Event start time must be in the future'
    }
  },
  
  endTime: {
    type: Date,
    required: [true, 'Event end time is required'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'Event end time must be after start time'
    }
  },
  
  // Auto-expire after event ends + 7 days for chat retention
  expireAt: {
    type: Date,
    required: [true, 'Event expiration time is required'],
    default: function() {
      return new Date(this.endTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after end
    }
  },
  
  // Location Information
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [100, 'Landmark cannot exceed 100 characters']
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
    },
    fullAddress: {
      type: String,
      trim: true,
      maxlength: [300, 'Full address cannot exceed 300 characters']
    }
  },
  
  // Event Management
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Event creator is required'],
    ref: 'User'
  },
  
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
    default: 'draft'
  },
  
  // Event Categorization
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: [
      'interest-based-meetup',
      'skill-learning-session', 
      'sports',
      'networking',
      'workshop',
      'discussion',
      'social',
      'other'
    ]
  },
  
  // Attendance Management
  maxAttendees: {
    type: Number,
    required: [true, 'Maximum attendees limit is required'],
    min: [1, 'Must allow at least 1 attendee'],
    max: [1000, 'Cannot exceed 1000 attendees']
  },
  
  currentAttendees: {
    type: Number,
    default: 0,
    min: 0
  },
  
  attendees: [attendeeSchema],
  
  // Event Discovery & Visibility
  isPublic: {
    type: Boolean,
    default: false // Only visible to community members by default
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Chat Room Integration
  chatRoomId: {
    type: String,
    unique: true,
    sparse: true // Only created when event is published
  },
  
  chatRoomCreated: {
    type: Boolean,
    default: false
  },
  
  // Event Media
  coverImage: {
    type: String,
    trim: true
  },
  
  // Additional Information
  requirements: {
    type: String,
    trim: true,
    maxlength: [500, 'Requirements cannot exceed 500 characters']
  },
  
  contactInfo: {
    type: String,
    trim: true,
    maxlength: [200, 'Contact info cannot exceed 200 characters']
  },
  
  // Cancellation/Completion
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  
  completionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Completion notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attendee count
eventSchema.virtual('attendeeCount').get(function() {
  return this.attendees ? this.attendees.length : 0;
});

// Virtual for isFull
eventSchema.virtual('isFull').get(function() {
  return this.currentAttendees >= this.maxAttendees;
});

// Virtual for isUpcoming
eventSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.startTime;
});

// Virtual for isOngoing
eventSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
});

// Virtual for isPast
eventSchema.virtual('isPast').get(function() {
  return new Date() > this.endTime;
});

// Compound unique index to prevent duplicates within community
eventSchema.index({ 
  communityId: 1, 
  title: 1, 
  startTime: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    status: { $in: ['draft', 'published'] } 
  }
});

// Case-insensitive title validation
eventSchema.pre('save', async function(next) {
  if (this.isModified('title') || this.isNew) {
    const existingEvent = await this.constructor.findOne({
      communityId: this.communityId,
      title: { $regex: new RegExp(`^${this.title}$`, 'i') },
      startTime: {
        $gte: new Date(this.startTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
        $lte: new Date(this.startTime.getTime() + 24 * 60 * 60 * 1000)  // 24 hours after
      },
      status: { $in: ['draft', 'published'] },
      _id: { $ne: this._id }
    });
    
    if (existingEvent) {
      return next(new Error(`An event with similar title and timing already exists in this community`));
    }
  }
  next();
});

// Auto-archive events after they end
eventSchema.pre('save', function(next) {
  if (this.endTime && this.status === 'published') {
    const now = new Date();
    if (now > this.endTime && now < this.expireAt) {
      this.status = 'completed';
    } else if (now > this.expireAt) {
      this.status = 'archived';
    }
  }
  next();
});

// Method to join event
eventSchema.methods.joinEvent = async function(userId) {
  if (this.currentAttendees >= this.maxAttendees) {
    throw new Error('Event has reached maximum attendee capacity');
  }
  
  if (this.attendees.some(attendee => attendee.userId.toString() === userId.toString())) {
    throw new Error('User already registered for this event');
  }
  
  if (this.status !== 'published') {
    throw new Error('Cannot join unpublished or cancelled event');
  }
  
  this.attendees.push({
    userId: userId,
    joinedAt: new Date(),
    status: 'confirmed'
  });
  
  this.currentAttendees = this.attendees.length;
  
  return this.save();
};

// Method to leave event
eventSchema.methods.leaveEvent = async function(userId) {
  const initialLength = this.attendees.length;
  
  this.attendees = this.attendees.filter(attendee => 
    attendee.userId.toString() !== userId.toString()
  );
  
  if (this.attendees.length === initialLength) {
    throw new Error('User is not registered for this event');
  }
  
  this.currentAttendees = this.attendees.length;
  
  return this.save();
};

// Method to check if user is attending
eventSchema.methods.isUserAttending = function(userId) {
  return this.attendees.some(attendee => attendee.userId.toString() === userId.toString());
};

// Static method to find events for community
eventSchema.statics.findForCommunity = function(communityId, options = {}) {
  const {
    status = 'published',
    category = null,
    limit = 20,
    skip = 0
  } = options;
  
  const query = { 
    communityId,
    status,
    expireAt: { $gt: new Date() } // Only non-expired events
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('attendees.userId', 'firstName lastName')
    .sort({ startTime: 1 }) // Sort by upcoming events
    .limit(limit)
    .skip(skip);
};

// Static method to find events by interest
eventSchema.statics.findByInterest = function(interest, userLocation = null, limit = 20) {
  const query = {
    status: 'published',
    expireAt: { $gt: new Date() },
    $or: [
      { tags: interest.toLowerCase() },
      { category: { $regex: new RegExp(interest, 'i') } }
    ]
  };
  
  // Add location filtering if provided
  if (userLocation && userLocation.city) {
    query['location.city'] = userLocation.city;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('communityId', 'name location')
    .populate('attendees.userId', 'firstName lastName')
    .sort({ startTime: 1 })
    .limit(limit);
};

// Static method to find user's events
eventSchema.statics.findForUser = function(userId, options = {}) {
  const {
    status = null,
    limit = 20,
    skip = 0
  } = options;
  
  const query = {
    $or: [
      { createdBy: userId },
      { 'attendees.userId': userId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('communityId', 'name location')
    .populate('attendees.userId', 'firstName lastName')
    .sort({ startTime: -1 }) // Sort by most recent
    .limit(limit)
    .skip(skip);
};

// Essential indexes
eventSchema.index({ communityId: 1, status: 1, startTime: 1 });
eventSchema.index({ status: 1, expireAt: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ category: 1, startTime: 1 });
eventSchema.index({ 'location.city': 1, startTime: 1 });

// Geospatial index for location-based queries
eventSchema.index({ 'location.coordinates': '2dsphere' });

// Text search index
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Compound index for discovery queries
eventSchema.index({ status: 1, category: 1, startTime: 1, expireAt: 1 });

module.exports = mongoose.model('Event', eventSchema);