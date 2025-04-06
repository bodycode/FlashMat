const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/cards');
    console.log('Upload directory:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'card-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Only .jpeg, .png and .webp format allowed!'));
      return;
    }
    cb(null, true);
  }
});

// Get all cards for a deck
router.get('/deck/:deckId', auth, async (req, res) => {
  try {
    const cards = await Card.find({ deck: req.params.deckId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new card with image upload
router.post('/', auth, upload.single('questionImage'), async (req, res) => {
  try {
    console.log('Creating new card:', {
      body: req.body,
      type: req.body.type,
      hasOptions: !!req.body.options,
      rawOptions: req.body.options
    });

    const cardData = {
      question: req.body.question,
      type: req.body.type || 'text',
      deck: req.body.deck
    };

    // Handle multiple choice type specifically
    if (cardData.type === 'multipleChoice') {
      try {
        const options = JSON.parse(req.body.options);
        if (!Array.isArray(options) || options.length < 2) {
          return res.status(400).json({ 
            message: 'Multiple choice cards must have at least 2 options'
          });
        }
        cardData.options = options;
        cardData.answer = options[0]; // First option is correct answer
        console.log('Multiple choice data:', {
          options: cardData.options,
          answer: cardData.answer
        });
      } catch (e) {
        console.error('Options parsing error:', e);
        return res.status(400).json({ 
          message: 'Invalid options format'
        });
      }
    } else {
      cardData.answer = req.body.answer;
    }

    // Handle image upload if present
    if (req.file) {
      cardData.questionImage = {
        url: `/uploads/cards/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    const card = new Card(cardData);
    const savedCard = await card.save();

    console.log('Card saved:', {
      id: savedCard._id,
      type: savedCard.type,
      hasOptions: !!savedCard.options,
      optionsCount: savedCard.options?.length,
      answer: savedCard.answer
    });

    await Deck.findByIdAndUpdate(
      cardData.deck,
      { $push: { cards: savedCard._id } }
    );

    res.status(201).json(savedCard);
  } catch (error) {
    console.error('Card creation error:', error);
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/cards', req.file.filename);
      await fs.unlink(filePath).catch(console.error);
    }
    res.status(500).json({ message: error.message });
  }
});

// Get single card
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

// Update card
router.put('/:id', auth, upload.single('questionImage'), async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const updateData = {
      question: req.body.question,
      answer: req.body.answer,
      type: req.body.type,
      difficulty: req.body.difficulty
    };

    if (req.body.options) {
      try {
        updateData.options = JSON.parse(req.body.options);
      } catch (e) {
        console.error('Error parsing options:', e);
      }
    }

    if (req.file) {
      // Delete old image if exists
      if (card.questionImage?.filename) {
        const oldPath = path.join(__dirname, '../uploads/cards', card.questionImage.filename);
        await fs.unlink(oldPath).catch(console.error);
      }

      updateData.questionImage = {
        url: `/uploads/cards/${req.file.filename}`,
        filename: req.file.filename
      };
    }

    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('deck', 'name');

    res.json(updatedCard);
  } catch (error) {
    console.error('Update error:', error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(400).json({ message: error.message });
  }
});

// Rate card
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

    card.ratings.push({
      user: req.user._id,
      value: rating,
      date: new Date()
    });

    card.mastered = card.updateMasteryStatus();
    await card.save();

    res.json({
      message: 'Rating saved successfully',
      mastered: card.mastered,
      ratings: card.ratings
    });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete card
router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.questionImage?.filename) {
      const imagePath = path.join(__dirname, '../uploads/cards', card.questionImage.filename);
      await fs.unlink(imagePath).catch(console.error);
    }

    await Deck.findByIdAndUpdate(
      card.deck,
      { $pull: { cards: card._id } }
    );

    await card.deleteOne();
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
