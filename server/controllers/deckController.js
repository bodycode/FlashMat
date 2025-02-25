const Deck = require('../models/Deck');
const Card = require('../models/Card');
const User = require('../models/User');

const deckController = {
  getAllDecks: async (req, res) => {
    try {
      const decks = await Deck.find({ creator: req.user.userId })
        .populate('creator', 'username')
        .populate('cards')
        .sort('-createdAt');
      res.json(decks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  createDeck: async (req, res) => {
    try {
      const deck = new Deck({
        ...req.body,
        creator: req.user.userId
      });
      await deck.save();
      res.status(201).json(await deck.populate('creator', 'username'));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getDeck: async (req, res) => {
    try {
      const deck = await Deck.findById(req.params.id)
        .populate('creator', 'username')
        .populate({
          path: 'cards',
          select: 'question answer type options difficulty mastered'
        });
      
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      res.json(deck);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateDeck: async (req, res) => {
    try {
      const deck = await Deck.findById(req.params.id);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      Object.assign(deck, req.body);
      await deck.save();
      
      const updatedDeck = await Deck.findById(deck._id)
        .populate('creator', 'username')
        .populate('cards');
        
      res.json(updatedDeck);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteDeck: async (req, res) => {
    try {
      const deck = await Deck.findById(req.params.id);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Delete all cards in the deck
      await Card.deleteMany({ deck: deck._id });
      await deck.deleteOne();

      res.json({ message: 'Deck and associated cards deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateStats: async (req, res) => {
    try {
      const deck = await Deck.findById(req.params.id);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      // Update deck stats
      await deck.updateStats();
      
      // Update user study streak
      const user = await User.findById(req.user.userId);
      user.updateStudyStreak();
      await user.save();

      res.json(deck.stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = deckController;