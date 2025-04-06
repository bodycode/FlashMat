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
    enum: ['text', 'multipleChoice', 'math'],
    default: 'text'
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  questionImage: {
    type: new mongoose.Schema({
      url: String,
      filename: String
    }, { _id: false })
  },
  options: {
    type: [String],
    validate: {
      validator: function(v) {
        return this.type !== 'multipleChoice' || (Array.isArray(v) && v.length >= 2);
      },
      message: 'Multiple choice cards must have at least 2 options'
    }
  },
  mastered: {
    type: Boolean,
    default: false
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    value: {
      type: Number,
      min: 1,
      max: 5
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

  // Clean up options for non-multiple choice cards
  if (this.type !== 'multipleChoice') {
    this.options = undefined;
  }

  next();
});

cardSchema.methods.updateMasteryStatus = function() {
  if (!this.ratings || this.ratings.length === 0) return false;
  const recentRatings = this.ratings.slice(-3);
  const avgRating = recentRatings.reduce((sum, r) => sum + r.value, 0) / recentRatings.length;
  return avgRating >= 4;
};

module.exports = mongoose.model('Card', cardSchema);
