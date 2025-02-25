const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
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
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  ratings: [{
    value: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  mastered: {
    type: Boolean,
    default: false
  },
  lastStudied: {
    type: Date,
    default: Date.now
  },
  nextReviewDate: {
    type: Date
  }
});

// Calculate next review date based on spaced repetition
progressSchema.methods.calculateNextReview = function() {
  const lastRating = this.ratings[this.ratings.length - 1]?.value || 0;
  const daysToAdd = Math.pow(2, lastRating - 1); // 1, 2, 4, 8, or 16 days
  
  this.nextReviewDate = new Date();
  this.nextReviewDate.setDate(this.nextReviewDate.getDate() + daysToAdd);
  
  return this.nextReviewDate;
};

// Update mastery status
progressSchema.methods.updateMastery = function() {
  const recentRatings = this.ratings.slice(-3);
  this.mastered = recentRatings.length >= 3 && 
    recentRatings.every(r => r.value >= 4);
  
  return this.mastered;
};

module.exports = mongoose.model('Progress', progressSchema);
