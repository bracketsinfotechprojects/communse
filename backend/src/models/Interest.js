const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Interest name is required'],
    trim: true,
    minlength: [3, 'Interest must be at least 3 characters'],
    maxlength: [25, 'Interest cannot exceed 25 characters'],
    match: [/^[A-Za-z0-9\s]+$/, 'Interest can only contain letters, numbers, and spaces']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator information is required']
  }
}, { timestamps: true });

// Case-insensitive unique index
interestSchema.index({ name: 1 }, { 
  unique: true, 
  collation: { locale: 'en', strength: 2 } 
});

// Pre-save: normalize to Title Case
interestSchema.pre('save', function(next) {
  this.name = this.name.trim().toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
  next();
});

module.exports = mongoose.model('Interest', interestSchema);