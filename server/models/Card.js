const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'multipleChoice', 'math'],
    default: 'text'
  },
  options: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
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
  }
});

// Add method to check if card is mastered
cardSchema.methods.updateMasteryStatus = function() {
  const recentRatings = this.ratings.slice(-3); // Look at last 3 ratings
  this.mastered = recentRatings.length >= 3 && 
    recentRatings.every(rating => rating.value >= 4);
  return this.mastered;
};

module.exports = mongoose.model('Card', cardSchema);
