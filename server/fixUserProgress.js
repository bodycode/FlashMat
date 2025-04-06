const mongoose = require('mongoose');
require('dotenv').config();
const Card = require('./models/Card');
const UserProgress = require('./models/UserProgress');

async function fixUserProgress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all cards that have ratings
    const cards = await Card.find({ 'ratings.0': { $exists: true } });
    console.log(`Found ${cards.length} cards with ratings`);
    
    // Group ratings by user and deck
    const userDeckRatings = {};
    
    for (const card of cards) {
      for (const rating of card.ratings) {
        const key = `${rating.user}_${card.deck}`;
        if (!userDeckRatings[key]) {
          userDeckRatings[key] = {
            user: rating.user,
            deck: card.deck,
            ratings: []
          };
        }
        
        userDeckRatings[key].ratings.push({
          card: card._id,
          rating: rating.value,
          date: rating.date
        });
      }
    }
    
    console.log(`Found ${Object.keys(userDeckRatings).length} user-deck pairs with ratings`);
    
    // Create or update UserProgress for each user-deck pair
    for (const key in userDeckRatings) {
      const { user, deck, ratings } = userDeckRatings[key];
      
      // Find or create UserProgress
      let userProgress = await UserProgress.findOne({ user, deck });
      if (!userProgress) {
        console.log(`Creating UserProgress for user ${user} and deck ${deck}`);
        userProgress = new UserProgress({
          user,
          deck,
          cardProgress: [],
          stats: {
            masteryPercentage: 0,
            averageRating: 0,
            studySessions: []
          }
        });
      }
      
      // Process each rating
      for (const r of ratings) {
        const existingIndex = userProgress.cardProgress.findIndex(
          cp => cp.card && cp.card.toString() === r.card.toString()
        );
        
        if (existingIndex >= 0) {
          userProgress.cardProgress[existingIndex].lastRating = r.rating;
          userProgress.cardProgress[existingIndex].lastStudied = r.date;
        } else {
          userProgress.cardProgress.push({
            card: r.card,
            lastRating: r.rating,
            masteryLevel: r.rating >= 4 ? 50 : 25,
            lastStudied: r.date
          });
        }
      }
      
      // Calculate stats
      const avgRating = userProgress.cardProgress.reduce((sum, cp) => sum + (cp.lastRating || 0), 0) / 
                        userProgress.cardProgress.length;
                        
      const masteryPercentage = userProgress.cardProgress.reduce((sum, cp) => {
        if (cp.lastRating >= 4) return sum + 1;
        return sum + 0.5;
      }, 0) / userProgress.cardProgress.length * 100;
      
      userProgress.stats.averageRating = Math.round(avgRating * 10) / 10;
      userProgress.stats.masteryPercentage = Math.round(masteryPercentage);
      userProgress.stats.lastStudied = new Date(Math.max(
        ...userProgress.cardProgress.map(cp => new Date(cp.lastStudied).getTime())
      ));
      
      await userProgress.save();
      console.log(`Updated UserProgress for user ${user} and deck ${deck}`);
    }
    
    console.log('Fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing UserProgress:', error);
    process.exit(1);
  }
}

fixUserProgress();
