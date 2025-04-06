const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'text'
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  questionImage: {
    url: String,
    filename: String
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    value: {
      type: Number,
      min: 0,
      max: 5,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save middleware to clean up empty/invalid data
cardSchema.pre('save', function(next) {
  // Clean up empty image data
  if (this.questionImage && (!this.questionImage.url || !this.questionImage.filename)) {
    this.questionImage = undefined;
  }
  next();
});

cardSchema.methods.updateMasteryStatus = function() {
  if (!this.ratings || this.ratings.length === 0) return false;
  const recentRatings = this.ratings.slice(-3);
  const avgRating = recentRatings.reduce((sum, r) => sum + r.value, 0) / recentRatings.length;
  return avgRating >= 4;
};

// Add method to get user's rating average
cardSchema.methods.getUserRatingAverage = function(userId) {
  const userRatings = this.ratings.filter(r => r.user.toString() === userId.toString());
  if (userRatings.length === 0) return 0;
  
  return userRatings.reduce((sum, r) => sum + r.value, 0) / userRatings.length;
};

// Add method to add/update user rating
cardSchema.methods.addRating = function(userId, value) {
  const ratingIndex = this.ratings.findIndex(r => r.user.toString() === userId.toString());
  
  if (ratingIndex >= 0) {
    this.ratings[ratingIndex].value = value;
    this.ratings[ratingIndex].date = new Date();
  } else {
    this.ratings.push({
      user: userId,
      value: value,
      date: new Date()
    });
  }
};

module.exports = mongoose.model('Card', cardSchema);
