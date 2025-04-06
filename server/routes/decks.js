const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Deck = require('../models/Deck');
const Card = require('../models/Card');
const User = require('../models/User');
const Class = require('../models/Class');
const UserProgress = require('../models/UserProgress');

// Fix the "MY DECKS" view for teachers showing all decks
router.get('/', auth, async (req, res) => {
  try {
    const options = {
      userId: req.user.userId,
      role: req.user.role,
      includeAssigned: req.query.includeAssigned === 'true',
      showAll: req.query.all === 'true',
      onlyMine: req.query.mine === 'true',
      includeShared: req.query.includeShared === 'true'
    };
    
    console.log('GET /decks options:', options);
    
    const isAdminOrTeacher = req.user.role === 'admin' || req.user.role === 'teacher';
    
    // If showAll is true and user is admin or teacher, return ALL decks in the system
    if (options.showAll && isAdminOrTeacher) {
      console.log(`Returning ALL decks in the system - ${req.user.role} with showAll=true`);
      
      const allDecks = await Deck.find({})
                              .populate('creator', 'username')
                              .sort('-createdAt');
      
      console.log(`Found ${allDecks.length} total decks in system`);
      
      // Enhance ALL decks with user's progress data
      const enhancedDecks = await enhanceDecksWithProgress(allDecks, req.user.userId);
      
      return res.json(enhancedDecks);
    }
    
    // For specific user requests
    if (req.query.user) {
      // Get decks for a specific user (for admin, teacher, or self)
      const targetUserId = req.query.user;
      
      // Check permission - only admins, teachers, or the user themselves can view a user's decks
      if (!isAdminOrTeacher && targetUserId !== req.user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Find decks created by this user
      const createdDecks = await Deck.find({ creator: targetUserId })
        .sort({ createdAt: -1 })
        .populate('creator', 'username');
        
      console.log(`Found ${createdDecks.length} decks created by user ${targetUserId}`);
      
      // If we need to include assigned decks
      if (options.includeAssigned) {
        // Find user to get their assigned decks and team memberships
        const user = await User.findById(targetUserId);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Get directly assigned decks
        const directlyAssignedDecks = user.decks || [];
        console.log(`User ${targetUserId} has ${directlyAssignedDecks.length} directly assigned decks`);
        
        // Get teams user belongs to
        const teams = await Class.find({ 
          $or: [
            { students: targetUserId },
            { teacher: targetUserId }
          ]
        }).select('decks');
        
        console.log(`User ${targetUserId} belongs to ${teams.length} teams`);
        
        // Collect all deck IDs from teams
        const teamDeckIds = [];
        teams.forEach(team => {
          if (team.decks && team.decks.length) {
            teamDeckIds.push(...team.decks.map(id => id.toString()));
          }
        });
        
        // Remove duplicates
        const uniqueTeamDeckIds = [...new Set(teamDeckIds)];
        console.log(`Teams have ${uniqueTeamDeckIds.length} unique deck assignments`);
        
        // Combine all deck IDs (directly assigned + team assigned)
        const allAssignedDeckIds = [
          ...directlyAssignedDecks.map(id => id.toString()),
          ...uniqueTeamDeckIds
        ];
        
        // Remove duplicates again
        const uniqueAssignedDeckIds = [...new Set(allAssignedDeckIds)];
        
        console.log('Assignment status:', {
          userId: targetUserId,
          directlyAssignedDecks: directlyAssignedDecks.length,
          teamsUserBelongsTo: teams.length,
          decksAssignedViaTeams: uniqueTeamDeckIds.length,
          totalUniqueAssignedDecks: uniqueAssignedDeckIds.length
        });
        
        // Now fetch the actual deck objects for assigned decks (excluding those already created by user)
        const createdDeckIds = createdDecks.map(deck => deck._id.toString());
        const assignedDeckIdsToFetch = uniqueAssignedDeckIds.filter(
          id => !createdDeckIds.includes(id)
        );
        
        let assignedDecks = [];
        if (assignedDeckIdsToFetch.length > 0) {
          assignedDecks = await Deck.find({ _id: { $in: assignedDeckIdsToFetch } })
            .sort({ name: 1 })
            .populate('creator', 'username');
          
          console.log(`Found ${assignedDecks.length} assigned decks`);
        }
        
        // Enhance all decks with user relationship info
        const allDecks = [...createdDecks, ...assignedDecks].map(deck => {
          const deckObj = deck.toObject ? deck.toObject() : deck;
          const deckId = deckObj._id.toString();
          
          // Calculate relationship flags
          const isCreator = deckObj.creator && 
                          deckObj.creator._id.toString() === targetUserId;
          const isDirectlyAssigned = directlyAssignedDecks.some(id => 
                          id.toString() === deckId);
          const isTeamAssigned = uniqueTeamDeckIds.includes(deckId);
          
          console.log(`Deck ${deckObj.name} (${deckId}) relationship details:`, {
            userId: targetUserId,
            isCreator,
            isDirectlyAssigned,
            isTeamAssigned,
            finalAssignmentStatus: isCreator || isDirectlyAssigned || isTeamAssigned
          });
          
          // Return deck with relationship flags
          return {
            ...deckObj,
            isCreator,
            isDirectlyAssigned,
            isTeamAssigned,
            isAssigned: isDirectlyAssigned || isTeamAssigned
          };
        });
        
        console.log(`Returning ${allDecks.length} decks for user ${targetUserId}`, {
          created: createdDecks.length,
          assigned: assignedDecks.length,
          viewingAll: options.showAll
        });
        
        return res.json(allDecks);
      } else {
        // Just return created decks if not including assignments
        return res.json(createdDecks);
      }
    } 
    // For current user query (including "MY DECKS" view)
    else {
      let query = {};
      
      // IMPORTANT FIX: The onlyMine parameter should be respected for ALL roles
      // When onlyMine=true, show only decks created by the current user
      if (options.onlyMine) {
        // Fix: Always use this query when onlyMine is true, regardless of role
        query.creator = req.user.userId;
        console.log(`${req.user.role} user requesting only their created decks with onlyMine=true`);
      } 
      // Show ALL decks for admin/teacher roles only when using the "ALL DECKS" view
      else if (isAdminOrTeacher && options.showAll) {
        console.log(`${req.user.role} user gets view of ALL decks with showAll=true`);
        query = {}; // Empty query = all decks
      }
      // Default view for any role should include created decks and assigned decks
      else {
        // For all users (admins, teachers, students), show:
        // 1. Decks they created
        // 2. Public decks
        // 3. Decks assigned to them directly or through teams (if includeShared)
        query.$or = [
          { creator: req.user.userId },
          { privacy: 'public' }
        ];
        
        // Also include shared decks if specified
        if (options.includeShared) {
          // Find teams the user belongs to
          const teams = await Class.find({
            $or: [
              { students: req.user.userId },
              { teacher: req.user.userId }
            ]
          }).select('decks');
          
          const teamDeckIds = [];
          teams.forEach(team => {
            if (team.decks && team.decks.length) {
              teamDeckIds.push(...team.decks);
            }
          });
          
          if (teamDeckIds.length > 0) {
            query.$or.push({ _id: { $in: teamDeckIds } });
          }
        }

        // Also check user's directly assigned decks
        const user = await User.findById(req.user.userId).select('decks');
        if (user && user.decks && user.decks.length > 0) {
          query.$or.push({ _id: { $in: user.decks } });
        }
      }
      
      console.log('Deck query:', JSON.stringify(query));
      
      // Execute the query
      const decks = await Deck.find(query)
        .sort({ updatedAt: -1 })
        .populate('creator', 'username');
        
      // Enhance with progress info
      const enhancedDecks = await enhanceDecksWithProgress(decks, req.user.userId);
      
      console.log(`Found ${decks.length} decks matching query for ${req.user.role} user`);
      return res.json(enhancedDecks);
    }
  } catch (error) {
    console.error('Error getting decks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Improve the enhanceDecksWithProgress function to ensure isAssigned is set correctly
const enhanceDecksWithProgress = async (decks, userId) => {
  try {
    // Get user-specific progress for these decks
    const userProgress = await UserProgress.find({
      user: userId,
      deck: { $in: decks.map(d => d._id) }
    });

    console.log(`Found ${userProgress.length} progress records for ${decks.length} decks`);
    
    // Log the mastery percentages we found for debugging
    const foundMasteryValues = userProgress.map(progress => ({
      deckId: progress.deck,
      masteryPercentage: progress.stats?.masteryPercentage || 0
    }));
    
    console.log('Mastery values found:', foundMasteryValues.slice(0, 3)); // Log first 3 for brevity

    // Check for decks directly assigned to this user
    const user = await User.findById(userId).select('decks createdDecks');
    
    // Convert all IDs to strings for consistent comparison
    const directlyAssignedDeckIds = (user?.decks || []).map(d => 
      typeof d === 'object' ? d._id.toString() : d.toString()
    );

    // Get decks created by this user
    const createdDeckIds = (user?.createdDecks || []).map(d =>
      typeof d === 'object' ? d._id.toString() : d.toString()
    );

    // Get team-assigned decks
    const userTeams = await Class.find({ 
      $or: [
        { teacher: userId },
        { students: userId }
      ]
    }).select('decks');
    
    const teamAssignedDeckIds = userTeams.flatMap(team => 
      (team.decks || []).map(d => typeof d === 'object' ? d._id.toString() : d.toString())
    );
    
    // Combine direct assignments and team assignments, removing duplicates
    const allAssignedDeckIds = [...new Set([...directlyAssignedDeckIds, ...teamAssignedDeckIds])];
    
    console.log('Assignment status for user:', {
      userId,
      directlyAssignedDecks: directlyAssignedDeckIds.length,
      createdDecks: createdDeckIds.length,
      teamsUserBelongsTo: userTeams.length,
      decksAssignedViaTeams: teamAssignedDeckIds.length,
      totalUniqueAssignedDecks: allAssignedDeckIds.length
    });
    
    // Map user progress to decks with improved relationship flags
    const enhancedDecks = decks.map(deck => {
      const deckId = deck._id.toString();
      const progress = userProgress.find(p => 
        p.deck.toString() === deckId
      );
      
      // Add mastery percentage data
      const stats = progress?.stats || {
        masteryPercentage: 0,
        averageRating: 0,
        lastStudied: null,
        studySessions: []
      };
      
      // ENSURE RELIABLE RELATIONSHIP DETECTION
      // These need to be boolean values for consistent UI behavior
      const isCreator = createdDeckIds.includes(deckId);
      const isDirectlyAssigned = directlyAssignedDeckIds.includes(deckId);
      const isTeamAssigned = teamAssignedDeckIds.includes(deckId);
      const isAssigned = isDirectlyAssigned || isTeamAssigned;
      
      // Log this deck's assignment status for the user
      console.log(`Deck '${deck.name}' (${deckId}) relationship:`, {
        userId,
        isCreator,
        isDirectlyAssigned, 
        isTeamAssigned,
        isAssigned,
        relationship: isCreator ? 'creator' : isAssigned ? 'assigned' : 'none'
      });
      
      return {
        ...deck.toObject ? deck.toObject() : deck,
        isCreator,
        isDirectlyAssigned,
        isTeamAssigned,
        isAssigned, // Important: This flag must be a simple boolean
        relationship: isCreator ? 'creator' : isAssigned ? 'assigned' : 'none',
        stats // Include the stats object with masteryPercentage
      };
    });
    
    return enhancedDecks;
  } catch (err) {
    console.error('Error enhancing decks with progress:', err);
    return decks;
  }
};

// Create a new deck
router.post('/', auth, async (req, res) => {
  try {
    const { assignedUsers, assignedTeams, ...deckData } = req.body;
    
    const deck = new Deck({
      ...deckData,
      creator: req.user.userId
    });
    
    await deck.save();
    
    // Handle user and team assignments
    if (assignedUsers && assignedUsers.length > 0) {
      await User.updateMany(
        { _id: { $in: assignedUsers } },
        { $addToSet: { decks: deck._id } }
      );
    }
    
    if (assignedTeams && assignedTeams.length > 0) {
      // Add deck to teams
      await Class.updateMany(
        { _id: { $in: assignedTeams } },
        { $addToSet: { decks: deck._id } }
      );
      
      // Also add deck to all students in these teams
      const teams = await Class.find({ _id: { $in: assignedTeams } });
      const studentIds = teams.flatMap(team => team.students);
      
      if (studentIds.length > 0) {
        await User.updateMany(
          { _id: { $in: studentIds } },
          { $addToSet: { decks: deck._id } }
        );
      }
    }
    
    // Add deck to user's created decks
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { createdDecks: deck._id } }
    );
    
    res.status(201).json(await deck.populate('creator', 'username'));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update the GET /:id route to properly calculate and include mastery percentage
router.get('/:id', auth, async (req, res) => {
  try {
    const deckId = req.params.id;
    console.log('Fetching deck with ID:', deckId);
    
    const deck = await Deck.findById(deckId)
      .populate('creator', 'username')
      .populate({
        path: 'cards',
        select: 'question answer questionImage type deck'
      });
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    // Get user-specific progress for this deck
    const userProgress = await UserProgress.findOne({
      user: req.user.userId,
      deck: deckId
    });
    
    console.log(`Progress lookup for user ${req.user.userId}, deck ${deckId}:`, 
      userProgress ? 'Found progress entry' : 'No progress found');
    
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
    
    // Add user ratings to each card
    if (responseData.cards && responseData.cards.length > 0) {
      // If user has progress data with card ratings
      if (userProgress && userProgress.cardProgress) {
        // Create a map of card ID -> user rating for quick lookup
        const cardRatingsMap = {};
        const cardMasteryMap = {}; // Add a map for mastery level
        
        userProgress.cardProgress.forEach(progress => {
          if (progress.card) {
            const cardId = progress.card.toString();
            cardRatingsMap[cardId] = progress.lastRating || 0;
            cardMasteryMap[cardId] = progress.masteryLevel || 0;
          }
        });
        
        // Debug the card ratings data
        console.log(`Card ratings data found: ${Object.keys(cardRatingsMap).length} rated cards`, {
          sample: Object.entries(cardRatingsMap).slice(0, 3).map(([cardId, rating]) => ({ 
            cardId, rating, mastery: cardMasteryMap[cardId] 
          }))
        });
        
        // Add userRating property to each card
        responseData.cards = responseData.cards.map(card => {
          const cardId = card._id.toString();
          return {
            ...card,
            userRating: cardRatingsMap[cardId] || 0,
            masteryLevel: cardMasteryMap[cardId] || 0
          };
        });
        
        // Calculate actual mastery percentage based on individual cards
        if (!responseData.stats?.masteryPercentage) {
          // If stats exist but no mastery percentage is provided
          const totalCards = responseData.cards.length;
          let masterySum = 0;
          
          // Sum up mastery from all cards
          responseData.cards.forEach(card => {
            const rating = cardRatingsMap[card._id.toString()] || 0;
            // Convert rating to mastery points (0-100%)
            let masteryPoints = 0;
            if (rating >= 5) masteryPoints = 100;
            else if (rating >= 4) masteryPoints = 75;
            else if (rating >= 3) masteryPoints = 50;
            else if (rating >= 2) masteryPoints = 25;
            
            masterySum += masteryPoints;
          });
          
          // Calculate average mastery across all cards
          const calculatedMastery = totalCards > 0 ? Math.round(masterySum / totalCards) : 0;
          
          console.log('Recalculated mastery percentage:', {
            totalCards,
            masterySum,
            calculatedMastery
          });
          
          // Update the stats in the response
          responseData.stats.masteryPercentage = calculatedMastery;
        }
      } else {
        console.log('No user progress found for this deck, all cards will have 0 rating');
        // Add userRating: 0 to all cards when no progress exists
        responseData.cards = responseData.cards.map(card => ({
          ...card,
          userRating: 0,
          masteryLevel: 0
        }));
      }
    }
    
    // LOG THE FINAL STATS FOR DEBUGGING
    console.log('Final deck stats being sent to client:', {
      deckName: responseData.name,
      masteryPercentage: responseData.stats.masteryPercentage,
      averageRating: responseData.stats.averageRating,
      cardCount: responseData.cards?.length || 0,
      ratedCardCount: responseData.cards?.filter(c => c.userRating > 0).length || 0
    });
    
    // Add server URL to all image URLs for frontend convenience
    if (responseData.cards) {
      responseData.cards = responseData.cards.map(card => {
        if (card.questionImage && card.questionImage.url) {
          // Ensure the URL is properly formed for client access
          return {
            ...card,
            questionImage: {
              ...card.questionImage,
              url: card.questionImage.url.startsWith('/uploads/') 
                ? `http://localhost:5000${card.questionImage.url}`
                : card.questionImage.url,
              originalUrl: card.questionImage.url
            }
          };
        }
        return card;
      });
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add this route after your existing GET /:id route

// Get a specific deck with full assignment information (for editing)
router.get('/:id/full', auth, async (req, res) => {
  try {
    const deckId = req.params.id;
    console.log(`Fetching full deck info for ID: ${deckId}`);
    
    const deck = await Deck.findById(deckId)
      .populate('creator', 'username');
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    // Check if the deck is assigned to the teacher
    let isAssignedToTeacher = false;
    
    if (req.user.role === 'teacher') {
      // Check direct assignment
      const teacher = await User.findById(req.user.userId).select('decks');
      if (teacher && teacher.decks) {
        const teacherDeckIds = teacher.decks.map(id => id.toString());
        isAssignedToTeacher = teacherDeckIds.includes(deck._id.toString());
      }
      
      // Check team assignment
      if (!isAssignedToTeacher) {
        const teacherTeams = await Class.find({ 
          $or: [
            { teacher: req.user.userId },
            { students: req.user.userId }
          ]
        }).select('decks');
        
        for (const team of teacherTeams) {
          if (team.decks && team.decks.some(id => id.toString() === deck._id.toString())) {
            isAssignedToTeacher = true;
            break;
          }
        }
      }
    }
    
    // Improved permission check - now including teacher assignment
    const isAdmin = req.user.role === 'admin';
    const isCreator = deck.creator.toString() === req.user.userId;
    const hasPermission = isAdmin || isCreator || isAssignedToTeacher;
    
    console.log('Permission check for full deck access:', {
      isAdmin,
      isCreator,
      isTeacher: req.user.role === 'teacher',
      isAssignedToTeacher,
      creatorId: deck.creator.toString(),
      requestUserId: req.user.userId,
      hasPermission
    });
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Not authorized to access full deck details' });
    }
    
    // Find users assigned to this deck
    const assignedUsers = await User.find({ decks: deckId })
      .select('_id username email');
    
    // Find teams assigned to this deck
    const assignedTeams = await Class.find({ decks: deckId })
      .select('_id name');
    
    console.log(`Found ${assignedUsers.length} users and ${assignedTeams.length} teams assigned to deck ${deckId}`);
    
    const responseData = {
      ...deck.toObject(),
      assignedUsers,
      assignedTeams
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error getting full deck details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update the PUT /:id route to allow teachers to edit decks assigned to them
router.put('/:id', auth, async (req, res) => {
  try {
    const { assignedUsers = [], assignedTeams = [], ...deckData } = req.body;
    
    // Log request details for debugging
    console.log('PUT /decks/:id - Edit request:', {
      deckId: req.params.id,
      userId: req.user.userId,
      userRole: req.user.role,
      assignmentCounts: {
        assignedUsers: assignedUsers.length,
        assignedTeams: assignedTeams.length
      }
    });
    
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    // Check if the deck is assigned to the teacher (directly or via team)
    let isAssignedToTeacher = false;
    
    if (req.user.role === 'teacher') {
      // Check if teacher is directly assigned this deck
      const teacher = await User.findById(req.user.userId).select('decks');
      if (teacher && teacher.decks) {
        const teacherDeckIds = teacher.decks.map(id => id.toString());
        isAssignedToTeacher = teacherDeckIds.includes(deck._id.toString());
      }
      
      // Also check if teacher belongs to any team that has this deck
      if (!isAssignedToTeacher) {
        const teacherTeams = await Class.find({ 
          $or: [
            { teacher: req.user.userId },
            { students: req.user.userId }
          ]
        }).select('decks');
        
        for (const team of teacherTeams) {
          if (team.decks && team.decks.some(id => id.toString() === deck._id.toString())) {
            isAssignedToTeacher = true;
            break;
          }
        }
      }
    }
    
    // Improved permission check - now including teacher assignment
    const isAdmin = req.user.role === 'admin';
    const isCreator = deck.creator.toString() === req.user.userId;
    const hasPermission = isAdmin || isCreator || isAssignedToTeacher;
    
    console.log('Permission check for deck edit:', {
      isAdmin,
      isCreator,
      isTeacher: req.user.role === 'teacher',
      isAssignedToTeacher,
      creatorId: deck.creator.toString(),
      requestUserId: req.user.userId,
      hasPermission
    });
    
    // Check if user has permission to edit this deck
    if (!hasPermission) {
      return res.status(403).json({ message: 'Not authorized to edit this deck' });
    }
    
    // Update basic deck info
    const { name, description, subject } = deckData;
    if (name) deck.name = name;
    if (description !== undefined) deck.description = description;
    if (subject !== undefined) deck.subject = subject;
    
    await deck.save();
    
    // USER ASSIGNMENTS
    // ...existing user assignment code...
    
    // TEAM ASSIGNMENTS
    // ...existing team assignment code...
    
    // Verify the changes
    // ...existing verification code...
    
    res.json({
      message: 'Deck updated successfully',
      deck: await deck.populate('creator', 'username')
    });
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update the DELETE /:id route to also allow teachers assigned to the deck to delete it
router.delete('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    // Check if the deck is assigned to the teacher (directly or via team)
    let isAssignedToTeacher = false;
    
    if (req.user.role === 'teacher') {
      // Check if teacher is directly assigned this deck
      const teacher = await User.findById(req.user.userId).select('decks');
      if (teacher && teacher.decks) {
        const teacherDeckIds = teacher.decks.map(id => id.toString());
        isAssignedToTeacher = teacherDeckIds.includes(deck._id.toString());
      }
      
      // Also check if teacher belongs to any team that has this deck
      if (!isAssignedToTeacher) {
        const teacherTeams = await Class.find({ 
          $or: [
            { teacher: req.user.userId },
            { students: req.user.userId }
          ]
        }).select('decks');
        
        for (const team of teacherTeams) {
          if (team.decks && team.decks.some(id => id.toString() === deck._id.toString())) {
            isAssignedToTeacher = true;
            break;
          }
        }
      }
    }
    
    // Improved permission check - includes teacher assignment
    const isAdmin = req.user.role === 'admin';
    const isCreator = deck.creator.toString() === req.user.userId;
    const hasPermission = isAdmin || isCreator || isAssignedToTeacher;
    
    console.log('Permission check for deck deletion:', {
      isAdmin,
      isCreator,
      isTeacher: req.user.role === 'teacher',
      isAssignedToTeacher,
      creatorId: deck.creator.toString(),
      requestUserId: req.user.userId,
      hasPermission
    });
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Not authorized to delete this deck' });
    }
    
    // Proceed with deletion - existing code...
    await Card.deleteMany({ deck: deck._id });
    
    await User.findByIdAndUpdate(
      deck.creator,
      { $pull: { createdDecks: deck._id } }
    );
    
    await UserProgress.deleteMany({ deck: deck._id });
    
    await User.updateMany(
      { decks: deck._id },
      { $pull: { decks: deck._id } }
    );
    
    await Class.updateMany(
      { decks: deck._id },
      { $pull: { decks: deck._id } }
    );
    
    await deck.deleteOne();
    res.json({ message: 'Deck and associated cards deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update deck stats
router.put('/:id/stats', auth, async (req, res) => {
  try {
    const deckId = req.params.id;
    const userId = req.user.userId;
    
    // Make sure the deck exists
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    const { masteryPercentage, averageRating } = req.body;
    
    console.log('Processing stats update:', {
      deckId,
      received: { masteryPercentage, averageRating },
      receivedTypes: { 
        masteryPercentage: typeof masteryPercentage, 
        averageRating: typeof averageRating 
      }
    });
    
    // Update the UserProgress for this user and deck
    let userProgress = await UserProgress.findOne({
      user: userId,
      deck: deckId
    });
    if (!userProgress) {
      // Create new progress if it doesn't exist
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
    
    // Update stats in UserProgress
    if (userProgress.stats) {
      userProgress.stats.masteryPercentage = masteryPercentage;
      userProgress.stats.averageRating = averageRating;
      userProgress.stats.lastStudied = new Date();
      
      // Add study session if needed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if we already have a session for today
      const existingSessionIndex = userProgress.stats.studySessions?.findIndex(session => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });
      
      if (existingSessionIndex >= 0) {
        // Update existing session
        userProgress.stats.studySessions[existingSessionIndex].masteryLevel = masteryPercentage;
        userProgress.stats.studySessions[existingSessionIndex].date = new Date();
      } else {
        // Create new session
        if (!userProgress.stats.studySessions) {
          userProgress.stats.studySessions = [];
        }
        userProgress.stats.studySessions.push({
          date: new Date(),
          masteryLevel: masteryPercentage,
          cardsStudied: userProgress.cardProgress?.length || 0
        });
      }
    } else {
      // Initialize stats object if it doesn't exist
      userProgress.stats = {
        masteryPercentage,
        averageRating,
        lastStudied: new Date(),
        studySessions: [{
          date: new Date(),
          masteryLevel: masteryPercentage,
          cardsStudied: userProgress.cardProgress?.length || 0
        }]
      };
    }
    
    await userProgress.save();
    
    // Update user study streak
    const user = await User.findById(userId);
    if (user) {
      user.updateStudyStreak();
      await user.save();
    }
    
    console.log('Saving stats:', {
      masteryPercentage,
      averageRating,
      totalStudySessions: userProgress.stats.studySessions?.length || 0,
      lastStudied: new Date()
    });
    
    res.json({
      message: 'Stats updated successfully',
      stats: userProgress.stats,
      userStreak: user?.studyStreak || 0
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;