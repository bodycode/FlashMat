const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const User = require('../models/User'); // Add User model import
const Class = require('../models/Class'); // Add Class model import
const UserProgress = require('../models/UserProgress');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log('Processing uploaded file:', file.fieldname);
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
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

// Create a new card
router.post('/', auth, upload.single('questionImage'), async (req, res) => {
  try {
    console.log('Received card creation request:', {
      body: req.body,
      file: req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file uploaded'
    });

    let cardData = { ...req.body, creator: req.user.userId };
    
    // If image was uploaded, add it to card data
    if (req.file) {
      cardData.questionImage = {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        alt: req.body.alt || 'Question image'
      };
      
      console.log('Adding image data to card:', cardData.questionImage);
    }
    
    // Create and save the card
    const card = new Card(cardData);
    const savedCard = await card.save();
    
    console.log('Card saved with data:', {
      id: savedCard._id,
      question: savedCard.question.substring(0, 20),
      hasImage: !!savedCard.questionImage,
      imageUrl: savedCard.questionImage?.url
    });
    
    // Add card to deck
    await Deck.findByIdAndUpdate(
      card.deck, 
      { $push: { cards: card._id } }
    );
    
    res.status(201).json(savedCard);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get a specific card
router.get('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to check if a teacher is assigned to a deck
const isTeacherAssignedToDeck = async (userId, deckId) => {
  // Check direct assignment
  const teacher = await User.findById(userId).select('decks');
  if (teacher && teacher.decks) {
    const teacherDeckIds = teacher.decks.map(id => id.toString());
    if (teacherDeckIds.includes(deckId.toString())) {
      return true;
    }
  }
  
  // Check team assignment
  const teacherTeams = await Class.find({ 
    $or: [
      { teacher: userId },
      { students: userId }
    ]
  }).select('decks');
  
  for (const team of teacherTeams) {
    if (team.decks && team.decks.some(id => id.toString() === deckId.toString())) {
      return true;
    }
  }
  
  return false;
};

// Update a card
router.put('/:id', auth, upload.single('questionImage'), async (req, res) => {
  try {
    console.log('PUT /cards/:id - Updating card:', req.params.id);
    console.log('Request body:', req.body);
    console.log('File received:', req.file);
    
    // Check if the card exists
    const existingCard = await Card.findById(req.params.id);
    if (!existingCard) {
      return res.status(404).json({ message: 'Card not found' });
    }
    
    // Check permissions
    const deck = await Deck.findById(existingCard.deck);
    if (!deck) {
      return res.status(404).json({ message: 'Associated deck not found' });
    }
    
    // UPDATED PERMISSION CHECK: Include teacher assignment
    let hasPermission = false;
    const isAdmin = req.user.role === 'admin';
    const isCreator = deck.creator.toString() === req.user.userId;
    
    // Handle teacher permission based on assignment
    let isAssignedTeacher = false;
    if (req.user.role === 'teacher' && !isCreator && !isAdmin) {
      isAssignedTeacher = await isTeacherAssignedToDeck(req.user.userId, deck._id);
    }
    
    hasPermission = isAdmin || isCreator || isAssignedTeacher;
    
    // Log permission details for debugging
    console.log('Permission check for card edit:', {
      cardId: req.params.id,
      deckId: deck._id.toString(),
      isAdmin,
      isCreator,
      isTeacher: req.user.role === 'teacher',
      isAssignedTeacher,
      requestUserId: req.user.userId,
      creatorId: deck.creator.toString(),
      hasPermission
    });
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Not authorized to edit this card' });
    }
    
    // Process image - default to keeping existing image
    let questionImage = existingCard.questionImage;
    
    // Check keepImage parameter with clear logging
    const keepImageParam = req.body.keepImage;
    const keepImage = keepImageParam !== 'false'; // true unless explicitly 'false'
    
    console.log('Image handling decision:', {
      keepImageParam: keepImageParam,
      keepImage: keepImage,
      hasNewFile: !!req.file,
      existingImageFilename: existingCard.questionImage?.filename || 'none'
    });
    
    if (req.file) {
      // New image uploaded - replace existing
      questionImage = {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename
      };
      
      // Delete old image if it exists
      if (existingCard.questionImage?.filename) {
        try {
          const oldImagePath = path.join(__dirname, '../uploads/', existingCard.questionImage.filename);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`Deleted old image: ${oldImagePath}`);
          }
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    } else if (!keepImage) {
      // No new image + don't keep existing = remove image
      questionImage = null;
      
      // Delete old image if it exists
      if (existingCard.questionImage?.filename) {
        try {
          const oldImagePath = path.join(__dirname, '../uploads/', existingCard.questionImage.filename);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`Deleted old image: ${oldImagePath}`);
          }
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    }
    
    // Update the card with proper error handling
    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      {
        question: req.body.question,
        answer: req.body.answer,
        type: req.body.type || 'basic',
        difficulty: req.body.difficulty || 1,
        questionImage
      },
      { new: true }
    );
    
    if (!updatedCard) {
      throw new Error('Failed to update card data');
    }
    
    console.log('Card updated successfully:', {
      id: updatedCard._id,
      hasImage: !!updatedCard.questionImage
    });
    
    res.json(updatedCard);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(error.name === 'CastError' ? 404 : 400).json({ 
      message: error.message || 'Failed to update card'
    });
  }
});

// Delete a card
router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    
    // Get the associated deck
    const deck = await Deck.findById(card.deck);
    if (!deck) {
      return res.status(404).json({ message: 'Associated deck not found' });
    }
    
    // UPDATED PERMISSION CHECK: Include teacher assignment
    let hasPermission = false;
    const isAdmin = req.user.role === 'admin';
    const isCreator = deck.creator.toString() === req.user.userId;
    
    // Handle teacher permission based on assignment
    let isAssignedTeacher = false;
    if (req.user.role === 'teacher' && !isCreator && !isAdmin) {
      isAssignedTeacher = await isTeacherAssignedToDeck(req.user.userId, deck._id);
    }
    
    hasPermission = isAdmin || isCreator || isAssignedTeacher;
    
    // Log permission details for debugging
    console.log('Permission check for card deletion:', {
      cardId: req.params.id,
      deckId: deck._id.toString(),
      isAdmin,
      isCreator,
      isTeacher: req.user.role === 'teacher',
      isAssignedTeacher,
      requestUserId: req.user.userId,
      creatorId: deck.creator.toString(),
      hasPermission
    });
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Not authorized to delete this card' });
    }
    
    // Remove card from deck
    await Deck.findByIdAndUpdate(
      card.deck,
      { $pull: { cards: card._id } }
    );
    
    // Delete any associated image
    if (card.questionImage && card.questionImage.url) {
      const imagePath = path.join(__dirname, '..', card.questionImage.url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await card.deleteOne();
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ message: error.message });
  }
});

// User rating for a card - updated to use UserProgress
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.userId;
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating' });
    }
    
    console.log('Card rating:', {
      cardId: new mongoose.Types.ObjectId(cardId),
      type: 'text',
      rating,
      user: req.user.username
    });
    
    // Get the card
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }
    
    // Important: Find or create user's progress for this deck
    let userProgress = await UserProgress.findOne({
      user: userId,
      deck: card.deck
    });
    
    if (!userProgress) {
      userProgress = new UserProgress({
        user: userId,
        deck: card.deck,
        stats: {
          masteryPercentage: 0,
          averageRating: 0,
          studySessions: []
        },
        cardProgress: []
      });
    }
    
    // Update card progress for this user
    const cardIndex = userProgress.cardProgress.findIndex(
      cp => cp.card && cp.card.toString() === cardId
    );
    
    if (cardIndex >= 0) {
      userProgress.cardProgress[cardIndex].lastRating = rating;
      userProgress.cardProgress[cardIndex].lastStudied = new Date();
    } else {
      userProgress.cardProgress.push({
        card: cardId,
        lastRating: rating,
        masteryLevel: rating >= 4 ? 50 : 25,
        lastStudied: new Date()
      });
    }
    
    await userProgress.save();
    
    // Calculate new average and update user progress
    if (userProgress.cardProgress.length > 0) {
      // Recalculate average
      const cardRatings = userProgress.cardProgress.map(cp => cp.lastRating || 0);
      const avgRating = cardRatings.reduce((sum, r) => sum + r, 0) / cardRatings.length;
      
      // Calculate mastery percentage based on ratings
      const masteryPercentage = userProgress.cardProgress.reduce((sum, cp) => {
        const rating = cp.lastRating || 0;
        // Convert rating to mastery percentage
        let masteryPoints = 0;
        if (rating >= 5) masteryPoints = 1;
        else if (rating >= 4) masteryPoints = 0.75;
        else if (rating >= 3) masteryPoints = 0.5;
        else if (rating >= 2) masteryPoints = 0.25;
        return sum + masteryPoints;
      }, 0) / userProgress.cardProgress.length * 100;
      
      // Update stats
      userProgress.stats.averageRating = Math.round(avgRating * 10) / 10;
      userProgress.stats.masteryPercentage = Math.round(masteryPercentage);
      userProgress.stats.lastStudied = new Date();
      await userProgress.save();
    }
    
    res.json({ 
      message: 'Rating saved successfully',
      rating,
      userProgress: {
        masteryPercentage: userProgress.stats.masteryPercentage,
        averageRating: userProgress.stats.averageRating
      }
    });
  } catch (error) {
    console.warn('Rating error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Debug endpoint to check image serving
router.get('/debug/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const possiblePaths = [
      path.join(__dirname, '../uploads', filename),
      path.join(__dirname, '../uploads/cards', filename),
      path.join(__dirname, '../', filename),
      path.join(__dirname, '../uploads', 'questionImage-' + filename),
      // Add more potential paths if needed
    ];
    
    const results = possiblePaths.map(p => ({
      path: p,
      exists: fs.existsSync(p),
      isFile: fs.existsSync(p) ? fs.statSync(p).isFile() : false,
      size: fs.existsSync(p) && fs.statSync(p).isFile() ? fs.statSync(p).size : 0
    }));
    
    // Find the first working path
    const validPath = results.find(r => r.exists && r.isFile);
    
    if (validPath) {
      res.json({
        filename,
        found: true,
        paths: results,
        validPath,
        accessUrl: `/uploads/${filename}`,
        fullUrl: `http://localhost:5000/uploads/${filename}`
      });
    } else {
      res.json({
        filename, 
        found: false,
        paths: results,
        suggestions: [
          'Check if the file was actually saved',
          'Look at your upload directory structure',
          'Verify file permissions'
        ]
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a maintenance endpoint to fix missing image data
router.get('/debug/fix-images', auth, async (req, res) => {
  try {
    // Only allow admins to run this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Find all cards
    const cards = await Card.find().select('_id questionImage');
    const fixedCards = [];
    
    // Directory where images should be
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // List all files in uploads directory
    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(f => f.startsWith('questionImage-'));
    
    console.log(`Found ${imageFiles.length} questionImage files in uploads directory`);
    
    for (const card of cards) {
      // Find cards that have no questionImage field but might have one
      if (!card.questionImage || !card.questionImage.url) {
        // Look for a matching file in the uploads dir (using card ID)
        const matchingFile = imageFiles.find(f => f.includes(card._id.toString()));
        
        if (matchingFile) {
          // Update the card with the image info
          await Card.findByIdAndUpdate(card._id, {
            questionImage: {
              url: `/uploads/${matchingFile}`,
              filename: matchingFile,
              alt: 'Question image'
            }
          });
          
          fixedCards.push({
            cardId: card._id,
            imageFile: matchingFile,
            imageUrl: `/uploads/${matchingFile}`
          });
        }
      }
    }
    
    res.json({
      message: `Fixed ${fixedCards.length} cards with missing image data`,
      fixedCards
    });
  } catch (error) {
    console.error('Error fixing images:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
