const mongoose = require('mongoose');
require('dotenv').config();
const Deck = require('./models/Deck');
const UserProgress = require('./models/UserProgress');

async function migrateStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all decks with stats
    const decks = await Deck.find({ stats: { $exists: true } });
    console.log(`Found ${decks.length} decks with stats to migrate`);
    
    for (const deck of decks) {
      if (!deck.stats) continue;
      
      // Find the creator's UserProgress or create one
      let userProgress = await UserProgress.findOne({
        user: deck.creator,
        deck: deck._id
      });
      
      if (!userProgress) {
        userProgress = new UserProgress({
          user: deck.creator,
          deck: deck._id,
          stats: {
            masteryPercentage: deck.stats.masteryPercentage || 0,
            averageRating: deck.stats.averageRating || 0,
            lastStudied: deck.stats.lastStudied || new Date(),
            studySessions: deck.stats.studySessions || []
          }
        });
        
        await userProgress.save();
        console.log(`Created UserProgress for deck ${deck._id} and user ${deck.creator}`);
      }
    }
    
    // Optionally remove stats field from decks after migration
    for (const deck of decks) {
      deck.stats = undefined;
      await deck.save();
      console.log(`Removed stats from deck ${deck._id}`);
    }
    
    console.log('Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateStats();
