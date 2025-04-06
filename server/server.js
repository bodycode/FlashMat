const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Class = require('./models/Class');
const Deck = require('./models/Deck');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Debug middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Create upload directories
const uploadsDir = path.join(__dirname, 'uploads');
const cardsDir = path.join(__dirname, 'uploads', 'cards');

// Ensure directories exist synchronously before starting server
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}
if (!fs.existsSync(cardsDir)) {
  fs.mkdirSync(cardsDir, { recursive: true });
  console.log('Created cards directory:', cardsDir);
}

// Core middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Improved static file middleware with better logging and headers
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.path);
  console.log('Static file request:', {
    requestPath: req.path,
    fullFilePath: filePath,
    exists: fs.existsSync(filePath)
  });
  
  // Add appropriate headers for images
  if (req.path.match(/\.(jpg|jpeg|png|gif)$/i)) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Diagnostic endpoint to help debug image issues
app.get('/api/debug/image-exists', (req, res) => {
  const { path: imagePath } = req.query;
  
  if (!imagePath) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }
  
  // Sanitize the path to prevent directory traversal
  const sanitizedPath = imagePath.replace(/\.\./g, '').replace(/^\/+/, '');
  const fullPath = path.join(__dirname, sanitizedPath);
  
  const exists = fs.existsSync(fullPath);
  let fileInfo = null;
  
  if (exists) {
    try {
      const stats = fs.statSync(fullPath);
      fileInfo = {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        modified: stats.mtime
      };
    } catch (err) {
      console.error('Error getting file info:', err);
    }
  }
  
  res.json({
    requestedPath: imagePath,
    sanitizedPath,
    fullPath,
    exists,
    fileInfo
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/decks', require('./routes/decks'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/assignments', require('./routes/assignments'));

// Debugging route to check assignments
app.get('/api/debug/assignments/:deckId', async (req, res) => {
  try {
    const deckId = req.params.deckId;
    
    // Get users with this deck
    const users = await User.find({ decks: deckId })
      .select('_id username email');
    
    // Get teams with this deck
    const teams = await Class.find({ decks: deckId })
      .select('_id name');
    
    // Get the deck itself
    const deck = await Deck.findById(deckId);
    
    res.json({
      deck: deck ? { 
        _id: deck._id, 
        name: deck.name, 
        creatorId: deck.creator 
      } : null,
      assignedUsers: users.map(u => ({ 
        _id: u._id, 
        username: u.username,
        email: u.email
      })),
      assignedTeams: teams.map(t => ({ 
        _id: t._id, 
        name: t.name 
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation Error', 
      details: err.message 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      message: 'Authentication Error',
      details: 'Invalid or expired token'
    });
  }
  
  res.status(500).json({ 
    message: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📑 API Documentation: http://localhost:${PORT}/api-docs
🔧 Environment: ${process.env.NODE_ENV}
📁 Upload paths:
   - Base: ${uploadsDir}
   - Cards: ${cardsDir}
  `);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
