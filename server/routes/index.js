const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const auth = require('../middleware/auth');

// Auth routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/users', auth, require('./users'));
router.use('/decks', auth, require('./decks'));  // Add this line
router.use('/cards', auth, require('./cards'));
router.use('/classes', auth, require('./classes'));

// Health check route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

module.exports = router;
