const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  stats: {
    masteryPercentage: Number,
    averageRating: Number,
    totalStudySessions: Number,
    lastStudied: Date
  }
});

// Add updateStats method to the schema
deckSchema.methods.updateStats = async function() {
  try {
    const Card = mongoose.model('Card');
    const cards = await Card.find({ deck: this._id });
    
    if (cards.length === 0) return;

    // Calculate stats from card ratings
    const stats = cards.reduce((acc, card) => {
      const cardRatings = card.ratings || [];
      if (cardRatings.length === 0) return acc;

      // Get average of last 3 ratings for each card
      const recentRatings = cardRatings.slice(-3);
      const cardAvg = recentRatings.reduce((sum, r) => sum + r.value, 0) / recentRatings.length;

      return {
        totalRatings: acc.totalRatings + recentRatings.length,
        ratingSum: acc.ratingSum + (cardAvg * recentRatings.length),
        masteredCards: acc.masteredCards + (card.mastered ? 1 : 0)
      };
    }, { totalRatings: 0, ratingSum: 0, masteredCards: 0 });

    // Update deck stats
    this.stats = {
      masteryPercentage: Math.round((stats.masteredCards / cards.length) * 100),
      averageRating: stats.totalRatings > 0 
        ? Math.round((stats.ratingSum / stats.totalRatings) * 10) / 10 
        : 0,
      totalStudySessions: (this.stats?.totalStudySessions || 0) + 1,
      lastStudied: new Date()
    };

    await this.save();
    return this.stats;
  } catch (error) {
    console.error('Error updating deck stats:', error);
    throw error;
  }
};

const Deck = mongoose.model('Deck', deckSchema);

module.exports = Deck;
