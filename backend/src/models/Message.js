const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: [true, 'Community ID is required']
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
    minlength: [1, 'Message cannot be empty']
  },
  attachments: [{
    type: String,
    validate: {
      validator: function(v) {
        // Basic URL validation for attachments
        return !v || /^https?:\/\/.+/.test(v) || /^data:.+/.test(v);
      },
      message: 'Attachment must be a valid URL or data URI'
    }
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attachment count
messageSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Virtual for read count
messageSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for checking if message has been read by specific user
messageSchema.virtual('checkReadByUser').get(function() {
  return function(userId) {
    return this.readBy && this.readBy.some(id => id.equals(userId));
  };
});

// Update editedAt when message is modified
messageSchema.pre('save', function(next) {
  if (this.isModified('text') && !this.isNew) {
    this.edited = true;
    this.editedAt = new Date();
  }
  next();
});

// Method to mark message as read by a user
messageSchema.methods.markAsReadBy = function(userId) {
  if (!this.readBy.some(id => id.equals(userId))) {
    this.readBy.push(userId);
  }
  return this.save();
};

// Method to check if message is read by a specific user
messageSchema.methods.isReadByUser = function(userId) {
  return this.readBy.some(id => id.equals(userId));
};

// Indexes for better query performance
messageSchema.index({ communityId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'readBy': 1 });

module.exports = mongoose.model('Message', messageSchema);