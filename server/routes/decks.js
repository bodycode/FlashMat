const express = require('express');
const router = express.Router();
const Deck = require('../models/Deck');
const Card = require('../models/Card');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Get all decks
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /decks - User:', {
      _id: req.user._id,
      role: req.user.role,
      username: req.user.username
    });

    let query = {};
    if (req.user.role !== 'admin') {
      query.creator = req.user._id;
    }

    console.log('Query:', query);

    const decks = await Deck.find(query)
      .populate('creator', 'username')
      .populate('cards')
      .sort('-createdAt');

    console.log('Found decks:', decks.length);

    res.json(decks);
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new deck
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST /decks - Creating deck for user:', {
      _id: req.user._id,
      role: req.user.role,
      body: req.body
    });

    const deck = new Deck({
      name: req.body.name,
      description: req.body.description,
      subject: req.body.subject,
      creator: req.user._id || req.user.userId, // Handle both formats
      cards: [],
      stats: {
        masteryPercentage: 0,
        averageRating: 0,
        totalStudySessions: 0,
        lastStudied: null
      }
    });

    await deck.save();
    console.log('Deck created:', deck);

    const populatedDeck = await Deck.findById(deck._id)
      .populate('creator', 'username');
    
    res.status(201).json(populatedDeck);
  } catch (error) {
    console.error('Deck creation error:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors
    });
  }
});

// Get deck by ID with selective population
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching deck with ID:', req.params.id);
    
    const deck = await Deck.findById(req.params.id)
      .populate({
        path: 'cards',
        select: 'question answer type questionImage options mastered ratings'
      })
      .populate('creator', 'username');

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    // Debug log without file system check
    console.log('Deck data:', {
      id: deck._id,
      name: deck.name,
      cardCount: deck.cards.length,
      cardsWithImages: deck.cards
        .filter(card => card.questionImage)
        .map(card => ({
          id: card._id,
          imageUrl: card.questionImage.url
        }))
    });

    // Check cards with images
    const cardsWithImages = deck.cards.filter(card => card.questionImage);
    if (cardsWithImages.length > 0) {
      console.log('Found cards with images:', 
        cardsWithImages.map(card => ({
          cardId: card._id,
          imageUrl: card.questionImage.url
        }))
      );
    }

    res.json(deck);
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update deck with authorization
router.put('/:id', auth, async (req, res) => {
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
});

// Update deck stats with detailed tracking
router.put('/:id/stats', auth, async (req, res) => {
  try {
    const { masteryPercentage, averageRating } = req.body;
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    deck.stats = {
      ...deck.stats,
      lastStudied: new Date(),
      masteryPercentage: masteryPercentage || deck.stats.masteryPercentage,
      averageRating: averageRating || deck.stats.averageRating,
      totalStudySessions: (deck.stats.totalStudySessions || 0) + 1
    };

    await deck.save();
    
    const updatedDeck = await Deck.findById(deck._id)
      .populate('creator', 'username')
      .populate('cards');
      
    res.json(updatedDeck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete deck with cleanup and authorization
router.delete('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Card.deleteMany({ deck: req.params.id });
    await deck.deleteOne();
    res.json({ message: 'Deck deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
