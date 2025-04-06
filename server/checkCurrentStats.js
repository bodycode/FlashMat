const mongoose = require('mongoose');
require('dotenv').config();

async function checkStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if Deck model still has stats fields
    const deckWithStats = await mongoose.connection.db.collection('decks')
      .findOne({ "stats": { $exists: true } });
    
    console.log('Deck with stats field exists:', deckWithStats ? 'YES' : 'NO');
    if (deckWithStats) {
      console.log('Deck ID:', deckWithStats._id);
      console.log('Stats:', deckWithStats.stats);
    }
    
    // Check UserProgress collection
    const userProgressCount = await mongoose.connection.db.collection('userprogresses').countDocuments();
    console.log('UserProgress documents count:', userProgressCount);
    
    // Check if we're accessing the right collections
    console.log('All collections in the database:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(col => console.log(' -', col.name));

    process.exit(0);
  } catch (error) {
    console.error('Error checking stats:', error);
    process.exit(1);
  }
}

checkStats();
