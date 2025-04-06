const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    console.log('Registration attempt:', { 
      username, 
      email, 
      role,
      timestamp: new Date().toISOString() 
    });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('Registration failed - existing user:', {
        existingEmail: existingUser.email === email,
        existingUsername: existingUser.username === username
      });
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }

    const user = new User({
      username,
      email,
      password,
      role
    });

    await user.save();

    const token = jwt.sign(
      { _id: user._id, role: user.role, username: user.username }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, timestamp: new Date().toISOString() });

    const user = await User.findOne({ email }).select('+password');
    
    console.log('User found:', {
      found: !!user,
      id: user?._id,
      role: user?.role,
      username: user?.username
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      console.log('Login failed:', { email, reason: !user ? 'user not found' : 'invalid password' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokenPayload = {
      _id: user._id,
      role: user.role,
      username: user.username,
      permissions: {
        canAccessTeams: ['admin', 'teacher'].includes(user.role),
        canAccessUsers: ['admin'].includes(user.role),
        canAccessDecks: true,
        canAccessSystem: ['admin'].includes(user.role)
      }
    };

    console.log('Creating token with payload:', tokenPayload);

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Remove password from response
    user.password = undefined;

    const response = {
      token,
      user: {
        ...user.toObject(),
        permissions: tokenPayload.permissions
      }
    };

    console.log('Login successful:', {
      userId: user._id,
      role: user.role,
      hasToken: !!token
    });

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('classes', 'name description');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add update user route
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('Profile update attempt:', {
      userId: req.user._id,
      updates: req.body
    });

    // Prevent password update through this route
    delete req.body.password;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $set: {
          ...req.body,
          'profile.lastUpdated': new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('Update failed - user not found:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile updated successfully:', {
      userId: user._id,
      updatedFields: Object.keys(req.body)
    });

    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile',
      details: error.message 
    });
  }
});

// Verify token
router.get('/verify', auth, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      _id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      permissions: {
        canAccessTeams: ['admin', 'teacher'].includes(req.user.role),
        canAccessUsers: ['admin'].includes(req.user.role),
        canAccessDecks: true,
        canAccessSystem: ['admin'].includes(req.user.role)
      }
    } 
  });
});

module.exports = router;
