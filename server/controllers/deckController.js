const Deck = require('../models/Deck');
const Card = require('../models/Card');
const User = require('../models/User');
const Class = require('../models/Class');
const UserProgress = require('../models/UserProgress');

const updateAssignments = async (deckId, assignedUsers = [], assignedTeams = []) => {
  try {
    console.log(`Updating assignments for deck ${deckId}:`);
    console.log(`- Users: ${assignedUsers.length}`);
    console.log(`- Teams: ${assignedTeams.length}`);
    
    // First, handle user assignments
    if (assignedUsers.length > 0) {
      // Add this deck to all assigned users
      await User.updateMany(
        { _id: { $in: assignedUsers } },
        { $addToSet: { decks: deckId } }
      );
      console.log(`Added deck to ${assignedUsers.length} users`);
    }
    
    // Then, handle team assignments
    if (assignedTeams.length > 0) {
      // For each team, add the deck and update all students in the team
      for (const teamId of assignedTeams) {
        const team = await Class.findById(teamId);
        
        if (team) {
          // Add deck to team if not already there
          if (!team.decks.includes(deckId)) {
            team.decks.push(deckId);
            await team.save();
            console.log(`Added deck to team ${teamId}`);
          }
          
          // Add deck to all students in the team
          if (team.students && team.students.length > 0) {
            await User.updateMany(
              { _id: { $in: team.students } },
              { $addToSet: { decks: deckId } }
            );
            console.log(`Added deck to ${team.students.length} students in team ${teamId}`);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating assignments:', error);
    return false;
  }
};

const deckController = {
  getAllDecks: async (req, res) => {
    try {
      // Clear debug info
      console.log(`GET /decks: Finding decks for user ${req.user.userId}`);

      // Get all decks created by user
      const decks = await Deck.find({ creator: req.user.userId })
        .populate('creator', 'username')
        .populate('cards')
        .sort('-createdAt');

      // Get user-specific progress for these decks
      const userProgress = await UserProgress.find({
        user: req.user.userId,
        deck: { $in: decks.map(d => d._id) }
      });

      console.log(`Found ${userProgress.length} UserProgress records for user ${req.user.userId}`);

      // Map user progress to decks - IMPORTANT: only get stats from UserProgress
      const decksWithProgress = decks.map(deck => {
        const progress = userProgress.find(p => p.deck.toString() === deck._id.toString());
        
        // Log what we're doing for each deck
        console.log(`Deck ${deck._id}: Using ${progress ? 'user-specific' : 'default'} stats`);
        
        // Return deck with user progress stats
        return {
          ...deck.toObject(),
          stats: progress?.stats || {
            masteryPercentage: 0,
            averageRating: 0,
            lastStudied: null,
            studySessions: []
          }
        };
      });

      res.json(decksWithProgress);
    } catch (error) {
      console.error('Error getting decks:', error);
      res.status(500).json({ message: error.message });
    }
  },

  createDeck: async (req, res) => {
    try {
      const { assignedUsers, assignedTeams, ...deckData } = req.body;
      
      const deck = new Deck({
        ...deckData,
        creator: req.user.userId
      });
      
      await deck.save();
      
      // Handle assignments
      if ((assignedUsers && assignedUsers.length > 0) || 
          (assignedTeams && assignedTeams.length > 0)) {
        await updateAssignments(deck._id, assignedUsers, assignedTeams);
      }
      
      res.status(201).json(await deck.populate('creator', 'username'));
    } catch (error) {
      console.error('Error creating deck:', error);
      res.status(400).json({ message: error.message });
    }
  },

  getDeck: async (req, res) => {
    try {
      const deck = await Deck.findById(req.params.id)
        .populate('creator', 'username')
        .populate({
          path: 'cards',
          select: 'question answer type options difficulty questionImage'
        });
      
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      // Get user-specific stats for this deck
      const userProgress = await UserProgress.findOne({
        user: req.user.userId,
        deck: deck._id
      });

      console.log(`User progress for user ${req.user.userId}, deck ${deck._id}:`, 
        userProgress ? {
          masteryPercentage: userProgress.stats?.masteryPercentage,
          averageRating: userProgress.stats?.averageRating,
          lastStudied: userProgress.stats?.lastStudied
        } : 'No progress found');

      // Create response with user-specific stats
      const responseData = {
        ...deck.toObject(),
        stats: userProgress?.stats || {
          masteryPercentage: 0,
          averageRating: 0,
          lastStudied: null,
          studySessions: []
        }
      };

      res.json(responseData);
    } catch (error) {
      console.error('Error getting deck:', error);
      res.status(500).json({ message: error.message });
    }
  },

  updateDeck: async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedUsers, assignedTeams, ...deckData } = req.body;
      
      const deck = await Deck.findById(id);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Only update basic deck info, not stats
      const { name, description, subject } = deckData;
      if (name) deck.name = name;
      if (description !== undefined) deck.description = description;
      if (subject !== undefined) deck.subject = subject;
      
      await deck.save();
      
      // Handle assignments
      if ((assignedUsers && assignedUsers.length > 0) || 
          (assignedTeams && assignedTeams.length > 0)) {
        await updateAssignments(deck._id, assignedUsers, assignedTeams);
      }
      
      const updatedDeck = await Deck.findById(deck._id)
        .populate('creator', 'username')
        .populate('cards');
        
      res.json(updatedDeck);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteDeck: async (req, res) => {
    try {
      const deck = await Deck.findById(req.params.id);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      if (deck.creator.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Delete all cards in the deck
      await Card.deleteMany({ deck: deck._id });
      
      // Delete user progress for this deck
      await UserProgress.deleteMany({ deck: deck._id });
      
      // Remove the deck from all classes
      await Class.updateMany(
        { decks: deck._id },
        { $pull: { decks: deck._id } }
      );
      
      // Remove the deck from all users
      await User.updateMany(
        { decks: deck._id },
        { $pull: { decks: deck._id } }
      );
      
      // Delete the deck
      await deck.deleteOne();

      res.json({ message: 'Deck and associated cards deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateStats: async (req, res) => {
    try {
      const deckId = req.params.id;
      const userId = req.user.userId;
      
      // Get the deck to make sure it exists
      const deck = await Deck.findById(deckId);
      if (!deck) {
        return res.status(404).json({ message: 'Deck not found' });
      }

      const { masteryPercentage, averageRating } = req.body;
      
      console.log(`User ${userId} updating SPECIFIC stats for deck ${deckId}:`, {
        masteryPercentage,
        averageRating
      });
      
      // Find or create user progress for this deck
      let userProgress = await UserProgress.findOne({ 
        user: userId,
        deck: deckId
      });
      
      if (!userProgress) {
        console.log(`Creating NEW UserProgress for user ${userId} and deck ${deckId}`);
        userProgress = new UserProgress({
          user: userId,
          deck: deckId,
          stats: {
            masteryPercentage: 0,
            averageRating: 0,
            studySessions: []
          },
          cardProgress: []
        });
      }
      
      // Log the daily mastery to track progress over time
      await userProgress.logDailyMastery(masteryPercentage, averageRating);
      
      // Update user study streak
      const user = await User.findById(userId);
      if (user) {
        user.updateStudyStreak();
        
        // Force streak minimum of 1 if needed
        if (user.studyStreak < 1) {
          user.studyStreak = 1;
        }
        
        await user.save();
        console.log(`Updated study streak for user ${userId}: ${user.studyStreak} days`);
      }

      console.log(`User ${userId} progress updated for deck ${deckId}:`, {
        masteryPercentage: userProgress.stats.masteryPercentage,
        averageRating: userProgress.stats.averageRating,
        lastStudied: userProgress.stats.lastStudied
      });
      
      res.json({ 
        message: 'User-specific stats updated successfully',
        stats: userProgress.stats,
        userStreak: user ? user.studyStreak : 0
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = deckController;
