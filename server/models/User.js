const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  decks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck'
  }],
  createdDecks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck'
  }],
  studyStreak: {
    type: Number,
    default: 0
  },
  lastStudied: {
    type: Date
  },
  profile: {
    avatar: String,
    bio: String,
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
      },
      emailNotifications: {
        type: Boolean,
        default: true
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateStudyStreak = function() {
  const today = new Date().toDateString();
  const lastStudied = this.lastStudied?.toDateString();

  if (today === lastStudied) {
    return this.studyStreak;
  }

  if (lastStudied === new Date(Date.now() - 86400000).toDateString()) {
    this.studyStreak += 1;
  } else {
    this.studyStreak = 1;
  }

  this.lastStudied = new Date();
  return this.studyStreak;
};

module.exports = mongoose.model('User', userSchema);
