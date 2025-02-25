const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authController = {
  register: async (req, res) => {
    try {
      const { username, email, password, role } = req.body;
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
        });
      }

      const user = new User({ username, email, password, role });
      await user.save();

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId)
        .select('-password')
        .populate('classes', 'name');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const updates = Object.keys(req.body);
      const allowedUpdates = ['username', 'email', 'profile'];
      const isValidOperation = updates.every(update => 
        allowedUpdates.includes(update)
      );

      if (!isValidOperation) {
        return res.status(400).json({ message: 'Invalid updates' });
      }

      const user = await User.findById(req.user.userId);
      updates.forEach(update => user[update] = req.body[update]);
      await user.save();

      res.json(user);
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;
