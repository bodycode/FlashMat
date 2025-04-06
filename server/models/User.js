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

// Update method to ensure streak is at least 1 day when studying
userSchema.methods.updateStudyStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Debug initial state
  console.log('Before streak update:', {
    userId: this._id,
    currentStreak: this.studyStreak || 0,
    lastStudied: this.lastStudied || 'Never'
  });
  
  // Initialize lastStudied if not set
  if (!this.lastStudied) {
    this.lastStudied = today;
    this.studyStreak = 1; // Always at least 1 when studying
    console.log('First time studying, set streak to 1');
    return;
  }

  // Convert lastStudied to date with time zeroed out for comparison
  const lastStudied = new Date(this.lastStudied);
  lastStudied.setHours(0, 0, 0, 0);
  
  // Calculate the difference in days
  const diffTime = today.getTime() - lastStudied.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Always set lastStudied to today when they study
  this.lastStudied = today;

  console.log('Day difference calculation:', {
    today: today.toISOString(),
    lastStudied: lastStudied.toISOString(),
    diffDays: diffDays
  });

  // Handle streak logic
  if (diffDays === 0) {
    // Same day, already counted in streak
    this.studyStreak = Math.max(1, this.studyStreak || 0);
    console.log('Same day studying, ensuring minimum streak of 1');
  } 
  else if (diffDays === 1) {
    // Consecutive day, increment streak
    this.studyStreak = Math.max(1, (this.studyStreak || 0) + 1);
    console.log('Consecutive day, incrementing streak to', this.studyStreak);
  }
  else {
    // More than a day since last study, reset streak
    this.studyStreak = 1; // Start with 1 since they studied today
    console.log('Gap in study days, resetting streak to 1');
  }

  // Ensure it's never less than 1 when studying
  if (this.studyStreak < 1) {
    console.log('Correcting invalid streak value', this.studyStreak);
    this.studyStreak = 1;
  }

  console.log('Final study streak update:', {
    userId: this._id,
    newStreak: this.studyStreak,
    lastStudied: this.lastStudied
  });
};

module.exports = mongoose.model('User', userSchema);
