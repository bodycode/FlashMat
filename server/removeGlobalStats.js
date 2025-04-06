const mongoose = require('mongoose');
require('dotenv').config();

async function removeGlobalStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all decks with stats field
    const deckCollection = mongoose.connection.collection('decks');
    
    // Just remove stats field from ALL decks unconditionally
    const result = await deckCollection.updateMany(
      {},  // Match all documents
      { $unset: { stats: "", totalStudySessions: "", lastStudied: "" } }
    );
    
    console.log(`Updated ${result.modifiedCount} decks to remove global stats`);
    
    // Check for any schema issues - look for decks that still have stats
    const remainingStats = await deckCollection.countDocuments({ 
      $or: [
        { stats: { $exists: true } },
        { totalStudySessions: { $exists: true } },
        { lastStudied: { $exists: true } }
      ]
    });
    
    if (remainingStats > 0) {
      console.warn(`Warning: ${remainingStats} decks still have stats fields`);
    } else {
      console.log('Success: All decks have had stats fields removed');
    }
    
    // Show current collections
    console.log('Collections in database:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(coll => console.log(` - ${coll.name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error removing stats:', error);
    process.exit(1);
  }
}

removeGlobalStats();
