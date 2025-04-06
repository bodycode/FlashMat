const Card = require('../models/Card');
const Deck = require('../models/Deck');
const UserProgress = require('../models/UserProgress');

const cardController = {
  getAllCards: async (req, res) => {
    try {
      const cards = await Card.find({ deck: req.params.deckId })
        .sort('createdAt');
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  createCard: async (req, res) => {
    try {
      const deck = await Deck.findById(req.body.deck);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      const card = new Card({
        ...req.body,
        creator: req.user.userId
      });
      await card.save();

      deck.cards.push(card._id);
      await deck.save();

      res.status(201).json(card);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  updateCard: async (req, res) => {
    try {
      const card = await Card.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('deck', 'name creator');

      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }

      // Check if user has permission to update
      const deck = await Deck.findById(card.deck);
      if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      res.json(card);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteCard: async (req, res) => {
    try {
      const card = await Card.findById(req.params.id);
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }

      const deck = await Deck.findById(card.deck);
      if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Deck.findByIdAndUpdate(card.deck, {
        $pull: { cards: card._id }
      });

      await card.deleteOne();

      res.json({ message: 'Card deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  rateCard: async (req, res) => {
    try {
      const cardId = req.params.id;
      const userId = req.user.userId;
      
      console.log(`User ${userId} rating card ${cardId} with value ${req.body.rating}`);
      
      const card = await Card.findById(cardId);
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }

      const { rating } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Invalid rating value' });
      }

      // Find or create user's progress for this card's deck
      let userProgress = await UserProgress.findOne({
        user: userId,
        deck: card.deck
      });

      if (!userProgress) {
        console.log(`Creating NEW UserProgress for user ${userId} and deck ${card.deck}`);
        userProgress = new UserProgress({
          user: userId,
          deck: card.deck,
          cardProgress: [],
          stats: {
            masteryPercentage: 0,
            averageRating: 0,
            studySessions: []
          }
        });
      }

      // Update card progress for this user
      const cardProgressIndex = userProgress.cardProgress.findIndex(
        cp => cp.card && cp.card.toString() === cardId
      );

      if (cardProgressIndex >= 0) {
        userProgress.cardProgress[cardProgressIndex].lastRating = rating;
        userProgress.cardProgress[cardProgressIndex].lastStudied = new Date();
      } else {
        userProgress.cardProgress.push({
          card: cardId,
          lastRating: rating,
          masteryLevel: rating >= 4 ? 50 : 25,
          lastStudied: new Date()
        });
      }

      // Save the progress so far
      await userProgress.save();
      console.log(`Saved progress for user ${userId}, card ${cardId}`);

      // Calculate new average for deck stats
      if (userProgress.cardProgress.length > 0) {
        const avgRating = userProgress.cardProgress.reduce((sum, cp) => sum + (cp.lastRating || 0), 0) / 
                          userProgress.cardProgress.length;

        const masteryPoints = userProgress.cardProgress.reduce((sum, cp) => sum + (cp.masteryLevel || 0), 0) / 
                            (userProgress.cardProgress.length * 100);

        const masteryPercentage = Math.round(masteryPoints * 100);

        // Update user's overall progress for this deck
        userProgress.stats.averageRating = Math.round(avgRating * 10) / 10;
        userProgress.stats.masteryPercentage = masteryPercentage;
        userProgress.stats.lastStudied = new Date();
        
        await userProgress.save();
        
        console.log(`Updated stats for user ${userId}: Mastery=${masteryPercentage}%, AvgRating=${avgRating}`);
      }

      res.json({
        message: 'Rating saved successfully',
        cardProgress: userProgress.cardProgress.find(cp => cp.card.toString() === cardId),
        deckStats: userProgress.stats
      });
    } catch (error) {
      console.error('Error rating card:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = cardController;
