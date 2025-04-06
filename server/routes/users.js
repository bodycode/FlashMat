const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const Deck = require('../models/Deck');
const UserProgress = require('../models/UserProgress'); 
const auth = require('../middleware/auth');

// Test route to verify it's loaded
router.get('/test', (req, res) => {
  res.json({ message: 'Users route working' });
});

// IMPORTANT: Fixed route order - first static paths, then parameter-based routes

// GET all users (admin/teacher only)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // Filter by deck assignment if deck ID is provided
    if (req.query.deck) {
      query.decks = req.query.deck;
      console.log(`Finding users assigned to deck ${req.query.deck}`);
      
      // Always allow this query regardless of user role (needed for deck assignments)
    } else if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Only administrators and teachers can view all users.' });
    }
    
    console.log('User query:', query);
    
    // Execute the query with additional fields for teams and decks
    const users = await User.find(query)
      .select('_id username email role classes decks createdDecks')
      .sort('username');
    
    console.log(`Found ${users.length} users matching query`);
    
    // Enhance response with accurate count information
    const enhancedUsers = await Promise.all(users.map(async user => {
      const userData = user.toObject();
      
      // Calculate team count without double-counting and handling null values safely
      const userClasses = userData.classes || [];
      const enrolledClassIds = new Set(
        userClasses
          .filter(id => id != null)
          .map(id => id.toString())
      );
      
      // Get classes where user is the teacher
      const teacherClasses = await Class.find({ teacher: userData._id })
        .select('_id')
        .lean();
      
      // Extract just the IDs of the teaching classes and convert to strings
      const teachingClassIds = new Set(
        teacherClasses
          .filter(c => c && c._id)
          .map(c => c._id.toString())
      );
      
      // Only count unique classes (can't be both student and teacher in same class)
      const allClassIds = new Set([
        ...Array.from(enrolledClassIds),
        ...Array.from(teachingClassIds)
      ]);
      
      // Final team count is the size of this unique set
      userData.teamCount = allClassIds.size;
      
      console.log(`User ${userData.username} team calculation (fixed and safe):`, {
        enrolledIn: enrolledClassIds.size,
        teaching: teachingClassIds.size,
        uniqueTotal: userData.teamCount
      });

      // Make the deck counting code safer against null values
      const userDecks = userData.decks || [];
      const userCreatedDecks = userData.createdDecks || [];
      
      // Get decks the user has directly in their decks array
      const directlyAssignedDecks = new Set(
        userDecks
          .filter(id => id != null)
          .map(id => id.toString())
      );
      
      // Get decks the user has created
      const createdDecks = new Set(
        userCreatedDecks
          .filter(id => id != null)
          .map(id => id.toString())
      );
      
      // Find decks assigned via teams (classes)
      let teamAssignedDecks = new Set();
      if (enrolledClassIds.size > 0) {
        // Get all teams user is enrolled in
        const enrolledTeams = await Class.find({
          _id: { $in: Array.from(enrolledClassIds) }
        }).select('decks');
        
        // Collect all deck IDs from these teams
        for (const team of enrolledTeams) {
          if (team.decks && team.decks.length > 0) {
            team.decks
              .filter(deckId => deckId != null)
              .forEach(deckId => teamAssignedDecks.add(deckId.toString()));
          }
        }
      }
      
      // Also get decks from teams the user teaches
      if (teachingClassIds.size > 0) {
        const teachingTeams = await Class.find({
          _id: { $in: Array.from(teachingClassIds) }
        }).select('decks');
        
        for (const team of teachingTeams) {
          if (team.decks && team.decks.length > 0) {
            team.decks
              .filter(deckId => deckId != null)
              .forEach(deckId => teamAssignedDecks.add(deckId.toString()));
          }
        }
      }
      
      // Calculate unique deck count using Sets to avoid duplication
      const allDeckIds = new Set();
      
      // Add each deck only once, regardless of its source
      directlyAssignedDecks.forEach(id => allDeckIds.add(id));
      createdDecks.forEach(id => allDeckIds.add(id));
      teamAssignedDecks.forEach(id => allDeckIds.add(id));
      
      userData.deckCount = allDeckIds.size;
      
      // Debug to show the details of counts
      console.log(`User ${userData.username} deck counts:`, {
        username: userData.username,
        directlyAssignedDecks: directlyAssignedDecks.size,
        createdDecks: createdDecks.size,
        teamAssignedDecks: teamAssignedDecks.size, 
        uniqueTotal: userData.deckCount,
        teamCount: userData.teamCount
      });
      
      console.log(`User ${userData.username} has ${userData.teamCount} teams and ${userData.deckCount} decks`);
      
      return userData;
    }));
    
    res.json(enhancedUsers);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new user (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { username, email, password, role, classes } = req.body;
    const user = new User({
      username,
      email,
      password,
      role,
      classes: classes?.map(c => c._id)
    });

    await user.save();

    // Handle team assignments
    if (classes?.length) {
      await Class.updateMany(
        { _id: { $in: classes.map(c => c._id) } },
        { $addToSet: { students: user._id } }
      );
    }

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('classes');

    res.status(201).json(populatedUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('classes');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['username', 'email'];
  
  // Validate updates
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const user = await User.findById(req.user.userId);
    updates.forEach(update => user[update] = req.body[update]);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user account
router.delete('/profile', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Learning stats for current user
router.get('/learning-stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const decks = await Deck.find({ user: req.user.userId })
      .populate('cards')
      .sort({ updatedAt: -1 });

    // Calculate total stats
    const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
    const masteredCards = decks.reduce((sum, deck) => 
      sum + deck.cards.filter(card => card.mastered).length, 0);

    // Get recently studied decks
    const recentDecks = decks
      .filter(deck => deck.stats?.lastStudied)
      .sort((a, b) => new Date(b.stats.lastStudied) - new Date(a.stats.lastStudied))
      .slice(0, 5)
      .map(deck => ({
        _id: deck._id,
        name: deck.name,
        lastStudied: deck.stats.lastStudied,
        mastery: deck.stats.masteryPercentage
      }));

    // Get decks needing review
    const needsReview = decks
      .filter(deck => deck.stats?.masteryPercentage < 70)
      .map(deck => ({
        _id: deck._id,
        name: deck.name,
        mastery: deck.stats.masteryPercentage
      }));

    // Update and get study streak
    user.updateStudyStreak();
    await user.save();

    const stats = {
      totalCards,
      masteredCards,
      studyStreak: user.studyStreak,
      achievementPoints: user.achievementPoints || 0,
      recentDecks,
      needsReview,
      achievements: user.achievements || []
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching learning stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Classes route - BEFORE /:id route to prevent conflicts
router.get('/classes', auth, async (req, res) => {
  try {
    const userId = req.query.user || req.user.userId;
    
    // Check permissions if querying other user
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view other users\' teams' });
    }
    
    // First find the user to get their teams
    const user = await User.findById(userId).select('classes');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Then fetch the actual team data
    const teams = await Class.find({ _id: { $in: user.classes || [] } });
    
    res.json(teams);
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ message: error.message });
  }
});

// Progress endpoint for specific user
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Permission checks for progress viewing
    const isOwnProgress = req.user.userId === userId;
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';
    
    // Only restrict access if not admin, not teacher, and not viewing own progress
    if (!isAdmin && !isTeacher && !isOwnProgress) {
      return res.status(403).json({ 
        message: 'Not authorized to view this user\'s progress' 
      });
    }
    
    console.log(`Fetching progress stats for user ${userId} by ${req.user.username} (${req.user.role})`);
    
    // Get all decks accessible to this user
    const user = await User.findById(userId).select('decks createdDecks');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get direct deck assignments and created decks
    const deckIds = [
      ...(user.decks || []).map(id => id.toString()),
      ...(user.createdDecks || []).map(id => id.toString())
    ];
    
    // Use Set to deduplicate
    const uniqueDeckIds = [...new Set(deckIds)];
    console.log(`User has ${uniqueDeckIds.length} unique decks (${user.decks?.length || 0} assigned, ${user.createdDecks?.length || 0} created)`);
    
    // Get progress entries for decks that have been studied
    const progressEntries = await UserProgress.find({ 
      user: userId,
      deck: { $in: uniqueDeckIds }
    });
    
    console.log(`Found ${progressEntries.length} progress entries out of ${uniqueDeckIds.length} total decks`);
    
    // Create a map of deck IDs to their mastery percentages
    const masteryMap = {};
    progressEntries.forEach(entry => {
      masteryMap[entry.deck.toString()] = entry.stats?.masteryPercentage || 0;
    });
    
    // Calculate mastery across ALL decks (including unstudied ones)
    let totalMastery = 0;
    uniqueDeckIds.forEach(deckId => {
      totalMastery += masteryMap[deckId] || 0; // Use 0% for unstudied decks
    });
    
    // Calculate averages
    const averageMastery = uniqueDeckIds.length > 0 
      ? totalMastery / uniqueDeckIds.length 
      : 0;
    
    // Calculate average for only studied decks
    const studiedAverage = progressEntries.length > 0
      ? progressEntries.reduce((sum, entry) => sum + (entry.stats?.masteryPercentage || 0), 0) / progressEntries.length
      : 0;
    
    // Log detailed mastery calculations
    console.log('Detailed mastery calculation:', {
      userId,
      totalDecks: uniqueDeckIds.length,
      studiedDecks: progressEntries.length,
      totalMastery,
      calculatedAverage: averageMastery.toFixed(2),
      studiedOnlyAverage: studiedAverage.toFixed(2),
      allMasteryValues: Object.values(masteryMap).map(m => m.toFixed(0) + '%')
    });
    
    // Get most recently studied decks
    const studiedDecks = progressEntries
      .filter(entry => entry.stats?.lastStudied)
      .sort((a, b) => new Date(b.stats.lastStudied) - new Date(a.stats.lastStudied))
      .slice(0, 5)
      .map(entry => ({
        deckId: entry.deck,
        masteryPercentage: entry.stats.masteryPercentage,
        lastStudied: entry.stats.lastStudied
      }));
    
    // Find the most recent study date
    const lastStudiedDates = progressEntries
      .map(entry => entry.stats?.lastStudied)
      .filter(date => date);
    
    const lastStudied = lastStudiedDates.length > 0
      ? new Date(Math.max(...lastStudiedDates.map(d => new Date(d).getTime())))
      : null;
    
    res.json({
      userId,
      totalDecks: uniqueDeckIds.length,
      studiedDecks: progressEntries.length,
      averageMastery,
      studiedDecksAverage: studiedAverage,
      recentlyStudied: studiedDecks,
      lastStudied
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID with populated data
router.get('/:id', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.userId !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to view this user\'s details' });
    }
    
    // Find user and populate their teams and decks
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean(); // Use lean() for better performance
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Enhanced logging for debugging
    console.log('User details request for editing:', {
      reqUserId: req.user.userId,
      reqUserRole: req.user.role,
      targetUserId: req.params.id,
      teamCount: user.classes?.length || 0,
      deckCount: user.decks?.length || 0,
      createdDeckCount: user.createdDecks?.length || 0 
    });

    // Handle classes population if they exist
    if (user.classes && user.classes.length > 0) {
      // Fetch the actual class data
      const classes = await Class.find({ _id: { $in: user.classes } })
                              .select('_id name description')
                              .lean();
      
      console.log(`Found ${classes.length} classes for user ${user.username}`);
      
      // Replace the class IDs with the actual class objects
      user.classes = classes;
    } else {
      user.classes = [];
    }
    
    // Handle decks population with improved error handling
    if (user.decks && user.decks.length > 0) {
      try {
        // Convert ObjectID to string for logging
        const deckIds = user.decks.map(id => id.toString());
        console.log(`Fetching ${deckIds.length} decks for user ${user.username}:`, deckIds);
        
        const decks = await Deck.find({ _id: { $in: deckIds } })
                              .select('_id name description')
                              .lean();
        
        console.log(`Found ${decks.length} decks for user ${user.username}`);
        
        // To detect missing decks, compare what was requested vs what was found
        if (decks.length !== deckIds.length) {
          const foundIds = decks.map(deck => deck._id.toString());
          const missingIds = deckIds.filter(id => !foundIds.includes(id));
          console.warn(`Warning: ${missingIds.length} decks were not found:`, missingIds);
        }
        
        // Replace the deck IDs with the actual deck objects
        user.decks = decks;
      } catch (err) {
        console.error('Error fetching decks for user:', err);
        // Fallback to empty array on error
        user.decks = [];
      }
    } else {
      user.decks = [];
    }
    
    // Also fetch created decks if they exist
    if (user.createdDecks && user.createdDecks.length > 0) {
      try {
        const createdDecks = await Deck.find({ _id: { $in: user.createdDecks } })
                                    .select('_id name description')
                                    .lean();
        
        console.log(`Found ${createdDecks.length} created decks for user ${user.username}`);
        user.createdDecks = createdDecks;
      } catch (err) {
        console.error('Error fetching created decks for user:', err);
        user.createdDecks = [];
      }
    } else {
      user.createdDecks = [];
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user by ID
router.put('/:id', auth, async (req, res) => {
  try {
    // Find the user to edit
    const userToEdit = await User.findById(req.params.id);
    if (!userToEdit) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Permission check
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';
    const targetIsStudent = userToEdit.role === 'student';
    
    // Log permission details for debugging
    console.log('User edit permission check:', {
      editingUserId: req.user.userId,
      editingUserRole: req.user.role,
      targetUserId: userToEdit._id,
      targetUserRole: userToEdit.role,
      isAllowed: isAdmin || (isTeacher && targetIsStudent)
    });
    
    if (!(isAdmin || (isTeacher && targetIsStudent))) {
      return res.status(403).json({ 
        message: isTeacher ? 
          'Teachers can only edit student accounts' : 
          'Access denied. Only administrators can edit users.' 
      });
    }
    
    // Extract update data
    const { classes: newClassIds, decks: directDeckIds, ...updateData } = req.body;
    
    // Update basic info
    Object.assign(userToEdit, updateData);

    // Track the changes in team assignments to handle deck cascading
    const oldClassIds = (userToEdit.classes || []).map(id => id.toString());
    
    // Check which teams were added and removed
    const addedTeamIds = newClassIds ? 
      newClassIds.filter(id => !oldClassIds.includes(id.toString())) : 
      [];
    
    const removedTeamIds = oldClassIds.filter(id => 
      !newClassIds || !newClassIds.includes(id)
    );
    
    console.log('Team assignment changes:', {
      username: userToEdit.username,
      previousTeams: oldClassIds.length,
      newTeams: newClassIds?.length || 0,
      addedTeams: addedTeamIds.length,
      removedTeams: removedTeamIds.length
    });

    // Update the user's team assignments first
    if (newClassIds) {
      userToEdit.classes = newClassIds;
      console.log(`Updated user ${userToEdit.username} teams: ${newClassIds.length} teams`);
    }
    
    // Handle direct deck assignments
    if (directDeckIds) {
      userToEdit.decks = directDeckIds;
      console.log(`Updated user ${userToEdit.username} decks: ${directDeckIds.length} decks`);
    }

    // Save the user changes first
    await userToEdit.save();
    
    // IMPORTANT: Now fetch decks from newly assigned teams and add them to the user
    if (addedTeamIds.length > 0) {
      // Get all team decks for the newly assigned teams
      const newTeams = await Class.find({ _id: { $in: addedTeamIds } })
        .select('decks name');
        
      let teamDeckIds = [];
      
      // Collect deck IDs from all new teams
      newTeams.forEach(team => {
        if (team.decks && team.decks.length) {
          console.log(`Adding ${team.decks.length} decks from team ${team.name} to user ${userToEdit.username}`);
          teamDeckIds = [...teamDeckIds, ...team.decks.map(d => d.toString())];
        }
      });
      
      // Remove duplicates
      teamDeckIds = [...new Set(teamDeckIds)];
      
      if (teamDeckIds.length > 0) {
        console.log(`Adding ${teamDeckIds.length} team-assigned decks to user ${userToEdit.username}`);
        
        // Add these team decks to the user's deck list
        await User.findByIdAndUpdate(
          userToEdit._id,
          { $addToSet: { decks: { $each: teamDeckIds } } }
        );
      }
    }

    // Get the fully populated user data for the response
    const populatedUser = await User.findById(userToEdit._id)
      .select('-password')
      .populate('classes')
      .populate('decks')
      .populate('createdDecks')
      .lean();
      
    // Add team-assigned decks to the calculation 
    let teamAssignedDeckIds = [];
    
    if (populatedUser.classes && populatedUser.classes.length > 0) {
      // Fetch teams with deck info
      const userTeams = await Class.find({
        _id: { $in: populatedUser.classes.map(c => c._id || c) }
      }).select('decks');
      
      // Extract deck IDs from teams
      for (const team of userTeams) {
        if (team.decks && team.decks.length > 0) {
          team.decks.forEach(deckId => 
            teamAssignedDeckIds.push(deckId.toString())
          );
        }
      }
    }
    
    // Remove duplicates
    teamAssignedDeckIds = [...new Set(teamAssignedDeckIds)];
    
    // Calculate counts for the response
    if (!populatedUser.classes) populatedUser.classes = [];
    if (!populatedUser.decks) populatedUser.decks = [];
    if (!populatedUser.createdDecks) populatedUser.createdDecks = [];
    
    const teamCount = populatedUser.classes.length;
    const assignedDeckCount = populatedUser.decks.length;
    const createdDeckCount = populatedUser.createdDecks.length;
    const teamDeckCount = teamAssignedDeckIds.length;
    
    // For the total deck count, combine all decks but avoid double counting
    const allDeckIds = new Set([
      ...(populatedUser.decks || []).map(d => d._id?.toString() || d.toString()),
      ...(populatedUser.createdDecks || []).map(d => d._id?.toString() || d.toString()),
      ...teamAssignedDeckIds
    ]);
    
    const totalDeckCount = allDeckIds.size;
    
    // Add counts as properties
    populatedUser.teamCount = teamCount;
    populatedUser.deckCount = totalDeckCount;
    populatedUser.assignedDeckCount = assignedDeckCount;
    populatedUser.createdDeckCount = createdDeckCount;
    populatedUser.teamDeckCount = teamDeckCount;
    
    console.log('Updated user stats (verified):', {
      username: populatedUser.username,
      teamCount: teamCount,
      directlyAssignedDecks: assignedDeckCount,
      createdDecks: createdDeckCount,
      teamAssignedDecks: teamDeckCount,
      totalDeckCount: totalDeckCount
    });

    res.json(populatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete user by ID
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find the user to be deleted
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Permission check
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';
    const targetIsStudent = userToDelete.role === 'student';

    if (!(isAdmin || (isTeacher && targetIsStudent))) {
      return res.status(403).json({ 
        message: isTeacher ? 
          'Teachers can only delete student accounts' : 
          'Access denied. Only administrators can delete users.' 
      });
    }

    // Log the deletion for audit purposes
    console.log('User deletion:', {
      deletedBy: {
        userId: req.user.userId,
        role: req.user.role,
        username: req.user.username
      },
      deletedUser: {
        userId: userToDelete._id,
        role: userToDelete.role,
        username: userToDelete.username
      }
    });

    // Remove user from all teams
    await Class.updateMany(
      { students: userToDelete._id },
      { $pull: { students: userToDelete._id } }
    );

    // Also remove if user is a teacher
    await Class.updateMany(
      { teacher: userToDelete._id },
      { $unset: { teacher: 1 } }
    );

    await userToDelete.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
