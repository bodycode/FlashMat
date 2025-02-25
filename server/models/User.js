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
    minlength: 6
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
  assignedDecks: [{
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    progress: {
      masteryLevel: {
        type: Number,
        default: 0
      },
      lastStudied: Date,
      completedCards: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
      }]
    }
  }],
  studyStreak: {
    type: Number,
    default: 0
  },
  lastStudied: {
    type: Date
  },
  achievementPoints: {
    type: Number,
    default: 0
  },
  achievements: [{
    title: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    points: Number
  }],
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

userSchema.methods.addAchievement = async function(achievement) {
  this.achievements.push(achievement);
  this.achievementPoints += achievement.points;
  await this.save();
  return this.achievements;
};

userSchema.methods.assignDeck = async function(deckId, classId) {
  const existingAssignment = this.assignedDecks.find(
    assignment => assignment.deck?.toString() === deckId
  );

  if (!existingAssignment) {
    this.assignedDecks.push({
      deck: deckId,
      assignedBy: classId,
      progress: {
        masteryLevel: 0,
        lastStudied: null,
        completedCards: []
      }
    });
    await this.save();
  }
  return this.assignedDecks;
};

userSchema.methods.updateDeckProgress = async function(deckId, cardId, masteryLevel) {
  const assignment = this.assignedDecks.find(
    a => a.deck?.toString() === deckId
  );

  if (assignment) {
    if (cardId && !assignment.progress.completedCards.includes(cardId)) {
      assignment.progress.completedCards.push(cardId);
    }
    if (masteryLevel !== undefined) {
      assignment.progress.masteryLevel = masteryLevel;
    }
    assignment.progress.lastStudied = new Date();
    await this.save();
  }

  return assignment?.progress;
};

module.exports = mongoose.model('User', userSchema);
