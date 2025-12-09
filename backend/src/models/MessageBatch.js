const mongoose = require('mongoose');

const messageBatchSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: [true, 'Community ID is required'],
    index: true
  },
  batchNumber: {
    type: Number,
    required: [true, 'Batch number is required'],
    index: true
  },
  messages: [{
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
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
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: [true, 'Message createdAt is required']
    }
  }],
  messageCount: {
    type: Number,
    default: 0
  },
  batchStartTime: {
    type: Date,
    required: [true, 'Batch start time is required'],
    index: true
  },
  batchEndTime: {
    type: Date,
    required: [true, 'Batch end time is required'],
    index: true
  },
  isClosed: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total attachments in batch
messageBatchSchema.virtual('totalAttachments').get(function() {
  return this.messages.reduce((total, msg) => total + (msg.attachments ? msg.attachments.length : 0), 0);
});

// Virtual for total read receipts in batch
messageBatchSchema.virtual('totalReadReceipts').get(function() {
  return this.messages.reduce((total, msg) => total + (msg.readBy ? msg.readBy.length : 0), 0);
});

// Indexes for better query performance
messageBatchSchema.index({ communityId: 1, batchStartTime: -1 });
messageBatchSchema.index({ communityId: 1, batchNumber: -1 });
messageBatchSchema.index({ communityId: 1, isClosed: 1, batchStartTime: -1 });

// Static method to get next batch number for a community
messageBatchSchema.statics.getNextBatchNumber = async function(communityId) {
  const lastBatch = await this.findOne({ communityId })
    .sort({ batchNumber: -1 })
    .lean();
  
  return lastBatch ? lastBatch.batchNumber + 1 : 1;
};

// Static method to find active batch for a community
messageBatchSchema.statics.findActiveBatch = async function(communityId, maxBatchAgeMinutes = 5, maxMessagesPerBatch = 100) {
  const cutoffTime = new Date(Date.now() - maxBatchAgeMinutes * 60 * 1000);
  
  console.log('🔍 findActiveBatch called:', { communityId, cutoffTime, maxBatchAgeMinutes, maxMessagesPerBatch });
  
  // First, try to find a recent active batch
  let batch = await this.findOne({
    communityId,
    isClosed: false,
    batchStartTime: { $gte: cutoffTime }
  }).sort({ batchNumber: -1 });

  console.log('🔍 Recent active batch:', batch ? { _id: batch._id, batchNumber: batch.batchNumber, messageCount: batch.messageCount } : 'None found');

  // If no recent batch found, try to find any active batch (even if older)
  if (!batch) {
    console.log('🔍 No recent batch found, searching for any active batch...');
    batch = await this.findOne({
      communityId,
      isClosed: false
    }).sort({ batchNumber: -1 });
    
    console.log('🔍 Any active batch:', batch ? { _id: batch._id, batchNumber: batch.batchNumber, messageCount: batch.messageCount } : 'None found');
  }

  // If no active batch found or batch is full or closed, create a new one
  if (!batch || batch.isClosed || batch.messageCount >= maxMessagesPerBatch) {
    console.log('🔍 Creating new batch...');
    batch = await this.createNewBatch(communityId);
    console.log('🔍 New batch created:', { _id: batch._id, batchNumber: batch.batchNumber });
  } else {
    console.log('🔍 Using existing active batch');
  }

  return batch;
};

// Static method to create a new batch
messageBatchSchema.statics.createNewBatch = async function(communityId) {
  const batchNumber = await this.getNextBatchNumber(communityId);
  const now = new Date();
  
  console.log('🏗️ createNewBatch called:', { communityId, batchNumber, now });
  
  const batch = await this.create({
    communityId,
    batchNumber,
    messages: [],
    messageCount: 0,
    batchStartTime: now,
    batchEndTime: now,
    isClosed: false
  });
  
  console.log('🏗️ New batch created successfully:', { _id: batch._id, batchNumber: batch.batchNumber });
  return batch;
};

// Static method to add message to batch
messageBatchSchema.statics.addMessageToBatch = async function(communityId, messageData) {
  const maxBatchAgeMinutes = 5;
  const maxMessagesPerBatch = 100;
  
  console.log('📦 addMessageToBatch called:', { communityId, messageData: { ...messageData, text: messageData.text?.substring(0, 50) } });
  
  const batch = await this.findActiveBatch(communityId, maxBatchAgeMinutes, maxMessagesPerBatch);
  console.log('📦 Active batch found:', { _id: batch._id, batchNumber: batch.batchNumber, currentCount: batch.messageCount });
  
  // Add message to batch
  const messageObj = {
    ...messageData,
    createdAt: new Date()
  };
  
  batch.messages.push(messageObj);
  batch.messageCount += 1;
  batch.batchEndTime = new Date();
  
  console.log('📦 Message added to batch:', {
    messageId: messageObj.messageId,
    text: messageObj.text?.substring(0, 50),
    batchCount: batch.messageCount
  });
  
  // Close batch if it reaches the limit
  if (batch.messageCount >= maxMessagesPerBatch) {
    batch.isClosed = true;
    console.log('📦 Batch closed due to size limit');
  }
  
  await batch.save();
  console.log('📦 Batch saved successfully');
  
  const result = {
    batchId: batch._id,
    messageId: batch.messages[batch.messages.length - 1].messageId,
    batchNumber: batch.batchNumber,
    messageIndex: batch.messages.length - 1
  };
  
  console.log('📦 addMessageToBatch result:', result);
  return result;
};

// Method to mark message as read by user
messageBatchSchema.methods.markMessageAsRead = function(messageId, userId) {
  const message = this.messages.find(msg => msg.messageId.equals(messageId));
  if (message && !message.readBy.some(id => id.equals(userId))) {
    message.readBy.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to edit message
messageBatchSchema.methods.editMessage = function(messageId, newText) {
  const message = this.messages.find(msg => msg.messageId.equals(messageId));
  if (message) {
    message.text = newText;
    message.edited = true;
    message.editedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to soft delete message
messageBatchSchema.methods.deleteMessage = function(messageId) {
  const message = this.messages.find(msg => msg.messageId.equals(messageId));
  if (message) {
    message.text = '';
    message.attachments = [];
    message.deleted = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get messages with pagination (similar to original API)
messageBatchSchema.statics.getMessages = async function(communityId, options = {}) {
  const {
    limit = 50,
    before,
    includeDeleted = false
  } = options;

  console.log('🔍 MessageBatch.getMessages called:', {
    communityId,
    communityIdType: typeof communityId,
    limit,
    before,
    includeDeleted
  });

  // Convert communityId to string for consistent comparison
  const communityIdStr = communityId.toString();
  console.log('🔍 Community ID as string:', communityIdStr);

  // First, let's check what batches exist for this community
  console.log('🔍 Checking existing batches for community...');
  let existingBatches = [];
  try {
    // Try both direct match and string conversion
    existingBatches = await this.find({
      $or: [
        { communityId: communityId },
        { communityId: communityIdStr }
      ]
    }).lean();
    console.log('📦 Existing batches:', existingBatches.length);
    
    // Also try a more general query to see if ANY batches exist
    const totalBatches = await this.countDocuments({});
    console.log('📊 Total batches in database:', totalBatches);
    
  } catch (error) {
    console.error('❌ Error querying batches:', error);
  }
  
  if (existingBatches.length > 0) {
    for (let i = 0; i < existingBatches.length; i++) {
      const batch = existingBatches[i];
      console.log(`📦 Batch ${i + 1}:`, {
        _id: batch._id,
        batchNumber: batch.batchNumber,
        messageCount: batch.messageCount,
        messages: batch.messages ? batch.messages.length : 0,
        isClosed: batch.isClosed,
        batchStartTime: batch.batchStartTime,
        communityId: batch.communityId,
        communityIdType: typeof batch.communityId,
        sampleMessages: batch.messages ? batch.messages.slice(0, 2).map(msg => ({
          messageId: msg.messageId,
          text: msg.text?.substring(0, 30),
          senderId: msg.senderId,
          createdAt: msg.createdAt,
          deleted: msg.deleted
        })) : []
      });
    }
  } else {
    console.log('❌ No batches found for community:', communityIdStr);
    console.log('🔍 This means either:');
    console.log('  1. Messages are not being stored at all');
    console.log('  2. Messages are being stored in a different community');
    console.log('  3. Database query is failing');
    console.log('  4. CommunityId type mismatch');
  }

  const pipeline = [
    { $match: { communityId: new mongoose.Types.ObjectId(communityId) } },
    { $unwind: '$messages' },
    ...(includeDeleted ? [] : [{ $match: { 'messages.deleted': { $ne: true } } }]),
    ...(before ? [{ $match: { 'messages.createdAt': { $lt: new Date(before) } } }] : []),
    { $sort: { 'messages.createdAt': -1 } },
    { $limit: limit },
    {
      $project: {
        _id: '$messages.messageId',
        communityId: 1,
        senderId: '$messages.senderId',
        text: '$messages.text',
        attachments: '$messages.attachments',
        readBy: '$messages.readBy',
        edited: '$messages.edited',
        editedAt: '$messages.editedAt',
        createdAt: '$messages.createdAt',
        updatedAt: '$messages.updatedAt'
      }
    },
    { $sort: { createdAt: 1 } } // Sort oldest first for display
  ];

  console.log('🔍 Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

  try {
    const messages = await this.aggregate(pipeline);
    console.log('📦 Aggregation result:', messages.length, 'messages');
    
    // Log first few messages for debugging
    if (messages.length > 0) {
      console.log('📋 First message sample:', {
        _id: messages[0]._id,
        text: messages[0].text?.substring(0, 50),
        senderId: messages[0].senderId,
        createdAt: messages[0].createdAt
      });
    } else {
      console.log('❌ No messages found in aggregation');
      console.log('🔍 Possible issues:');
      console.log('  - No batches exist for community');
      console.log('  - All messages are deleted');
      console.log('  - Pipeline filter is too restrictive');
      console.log('  - Date filters exclude all messages');
    }
    
    return messages;
  } catch (error) {
    console.error('❌ Aggregation failed:', error);
    throw error;
  }
};

module.exports = mongoose.model('MessageBatch', messageBatchSchema);