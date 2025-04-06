const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const auth = require('../middleware/auth');

// Test route to verify it's loaded
router.get('/test', (req, res) => {
  res.json({ message: 'Users route working' });
});

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const users = await User.find()
      .select('-password')
      .populate('classes');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new user (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { username, email, password, role, classes } = req.body;
    const user = new User({
      username,
      email,
      password,
      role,
      classes: classes?.map(c => c._id)
    });

    await user.save();

    // Handle team assignments
    if (classes?.length) {
      await Class.updateMany(
        { _id: { $in: classes.map(c => c._id) } },
        { $addToSet: { students: user._id } }
      );
    }

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('classes');

    res.status(201).json(populatedUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update user by ID (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { classes, ...updateData } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic info
    Object.assign(user, updateData);

    // Handle team assignments
    if (classes) {
      const oldTeams = user.classes || [];
      const newTeams = classes.map(c => c._id || c);

      // Remove user from old teams
      await Class.updateMany(
        { _id: { $in: oldTeams } },
        { $pull: { students: user._id } }
      );

      // Add user to new teams
      await Class.updateMany(
        { _id: { $in: newTeams } },
        { $addToSet: { students: user._id } }
      );

      user.classes = newTeams;
    }

    await user.save();

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('classes');

    res.json(populatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete user by ID (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove user from all teams
    await Class.updateMany(
      { students: user._id },
      { $pull: { students: user._id } }
    );

    // Also remove if user is a teacher
    await Class.updateMany(
      { teacher: user._id },
      { $unset: { teacher: 1 } }
    );

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('classes');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get learning stats
router.get('/learning-stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const decks = await Deck.find({ user: req.user.userId })
      .populate('cards')
      .sort({ updatedAt: -1 });

    // Calculate total stats
    const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
    const masteredCards = decks.reduce((sum, deck) => 
      sum + deck.cards.filter(card => card.mastered).length, 0);

    // Get recently studied decks
    const recentDecks = decks
      .filter(deck => deck.stats?.lastStudied)
      .sort((a, b) => new Date(b.stats.lastStudied) - new Date(a.stats.lastStudied))
      .slice(0, 5)
      .map(deck => ({
        _id: deck._id,
        name: deck.name,
        lastStudied: deck.stats.lastStudied,
        mastery: deck.stats.masteryPercentage
      }));

    // Get decks needing review
    const needsReview = decks
      .filter(deck => deck.stats?.masteryPercentage < 70)
      .map(deck => ({
        _id: deck._id,
        name: deck.name,
        mastery: deck.stats.masteryPercentage
      }));

    // Update and get study streak
    user.updateStudyStreak();
    await user.save();

    const stats = {
      totalCards,
      masteredCards,
      studyStreak: user.studyStreak,
      achievementPoints: user.achievementPoints || 0,
      recentDecks,
      needsReview,
      achievements: user.achievements || []
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching learning stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['username', 'email'];
  
  // Validate updates
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const user = await User.findById(req.user.userId);
    updates.forEach(update => user[update] = req.body[update]);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user account
router.delete('/profile', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Make sure this is at the end of the file
module.exports = router;
