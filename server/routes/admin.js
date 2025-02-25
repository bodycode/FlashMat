const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const Deck = require('../models/Deck');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Get admin dashboard stats
router.get('/stats', [auth, roleAuth(['admin'])], async (req, res) => {
  try {
    const [users, classes, decks] = await Promise.all([
      User.countDocuments(),
      Class.countDocuments(),
      Deck.countDocuments()
    ]);

    const activeUsers = await User.countDocuments({
      lastStudied: { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }
    });

    res.json({
      totalUsers: users,
      totalClasses: classes,
      totalDecks: decks,
      activeUsers,
      weeklyActiveUsers: activeUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users with pagination, search, and filters
router.get('/users', [auth, roleAuth(['admin'])], async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    
    // Build query with filters
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status === 'active') {
      query.lastStudied = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (status === 'inactive') {
      query.lastStudied = { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user
router.put('/users/:id', [auth, roleAuth(['admin'])], async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username', 'email', 'role', 'active'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', [auth, roleAuth(['admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove user from all classes they're in
    await Class.updateMany(
      { students: user._id },
      { $pull: { students: user._id } }
    );

    // Delete all decks created by user
    await Deck.deleteMany({ creator: user._id });

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get system settings
router.get('/settings', [auth, roleAuth(['admin'])], async (req, res) => {
  try {
    const settings = {
      allowNewRegistrations: process.env.ALLOW_REGISTRATIONS !== 'false',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      maxClassSize: parseInt(process.env.MAX_CLASS_SIZE) || 30,
      maxDecksPerUser: parseInt(process.env.MAX_DECKS_PER_USER) || 50,
      maxCardsPerDeck: parseInt(process.env.MAX_CARDS_PER_DECK) || 100
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
