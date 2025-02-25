const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const auth = require('../middleware/auth');

// Get all cards for a deck
router.get('/deck/:deckId', auth, async (req, res) => {
  try {
    const cards = await Card.find({ deck: req.params.deckId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new card
router.post('/', auth, async (req, res) => {
  try {
    const card = new Card({
      ...req.body,
      creator: req.user.userId
    });
    await card.save();

    // Update the deck's cards array with proper options
    await Deck.findByIdAndUpdate(
      req.body.deck,
      { $push: { cards: card._id } },
      { new: true }
    );

    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get single card with population
router.get('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('deck', 'name');
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update card with validation
router.put('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('deck', 'name');

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Rate a card with validation
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating value' });
    }

    // Add new rating
    card.ratings.push({
      user: req.user.userId,
      value: rating
    });

    // Update mastery status
    card.updateMasteryStatus();
    await card.save();

    // Update deck stats after rating
    const deck = await Deck.findById(card.deck);
    await deck.updateStats();

    res.json({
      message: 'Rating saved successfully',
      mastered: card.mastered,
      ratings: card.ratings
    });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ message: 'Failed to save rating' });
  }
});

// Delete card with cleanup
router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Remove card reference from deck
    await Deck.findByIdAndUpdate(
      card.deck,
      { $pull: { cards: card._id } }
    );

    await card.deleteOne();
    res.json({ message: 'Card deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
