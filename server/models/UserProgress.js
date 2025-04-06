const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  cardsStudied: {
    type: Number,
    default: 0
  },
  masteryLevel: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  }
});

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  stats: {
    masteryPercentage: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    lastStudied: {
      type: Date,
      default: Date.now
    },
    studySessions: [studySessionSchema]
  },
  cardProgress: [{
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card' 
    },
    lastRating: Number,
    masteryLevel: Number,
    lastStudied: Date
  }]
});

// Create a compound index to ensure a user can only have one progress record per deck
userProgressSchema.index({ user: 1, deck: 1 }, { unique: true });

// Log daily mastery for a user
userProgressSchema.methods.logDailyMastery = async function(masteryPercentage, averageRating = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Initialize stats object if not exists
  if (!this.stats) {
    this.stats = {
      masteryPercentage: 0,
      averageRating: 0,
      studySessions: []
    };
  }
  
  // Make sure studySessions exists
  if (!this.stats.studySessions) {
    this.stats.studySessions = [];
  }

  // Find existing session for today
  const existingSessionIndex = this.stats.studySessions.findIndex(session => {
    if (!session || !session.date) return false;
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });
  
  // Debug
  console.log(`Adding study session for masteryPercentage=${masteryPercentage}, averageRating=${averageRating}`);
  console.log(`Found existing session: ${existingSessionIndex >= 0 ? 'yes' : 'no'}`);
  
  if (existingSessionIndex >= 0) {
    // Update existing session
    this.stats.studySessions[existingSessionIndex].masteryLevel = masteryPercentage;
    this.stats.studySessions[existingSessionIndex].date = new Date();
    console.log(`Updated existing session at index ${existingSessionIndex}`);
  } else {
    // Create new session
    const newSession = {
      date: new Date(),
      masteryLevel: masteryPercentage,
      cardsStudied: this.cardProgress?.length || 0
    };
    this.stats.studySessions.push(newSession);
    console.log(`Added new session: ${JSON.stringify(newSession)}`);
  }
  
  // Keep only last 30 days
  if (this.stats.studySessions.length > 30) {
    this.stats.studySessions = this.stats.studySessions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 30);
  }
  
  // Update overall stats
  this.stats.masteryPercentage = masteryPercentage;
  this.stats.averageRating = averageRating;
  this.stats.lastStudied = new Date();
  
  // Debug
  console.log(`After update: studySessions count = ${this.stats.studySessions.length}`);
  
  return this.save();
};

module.exports = mongoose.model('UserProgress', userProgressSchema);
