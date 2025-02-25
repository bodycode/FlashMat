const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded); // Debug log

    // Set BOTH _id and userId for consistency
    req.user = {
      _id: decoded._id,
      userId: decoded._id,
      username: decoded.username,
      role: decoded.role
    };

    console.log('User set:', req.user); // Debug log
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = auth;
