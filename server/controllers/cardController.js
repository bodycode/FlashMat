const Card = require('../models/Card');
const Deck = require('../models/Deck');

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
      await deck.updateStats();

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

      await deck.updateStats();
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
      await deck.updateStats();

      res.json({ message: 'Card deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  rateCard: async (req, res) => {
    try {
      const card = await Card.findById(req.params.id);
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }

      const { rating } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Invalid rating value' });
      }

      card.ratings.push({
        user: req.user.userId,
        value: rating
      });

      card.updateMasteryStatus();
      await card.save();

      const deck = await Deck.findById(card.deck);
      await deck.updateStats();

      res.json({
        message: 'Rating saved successfully',
        mastered: card.mastered,
        ratings: card.ratings
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = cardController;
