const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const User = require('../models/User');
const Deck = require('../models/Deck');
const UserProgress = require('../models/UserProgress');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Add a dedicated route for fetching teams by deck

// Fix the issue with finding teams when editing a deck

// Update the GET route to properly return teams for teachers when filtering by deck
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // If deck ID is provided, focus query on it
    if (req.query.deck) {
      console.log(`Finding teams for deck ${req.query.deck} requested by ${req.user.username} (${req.user.role})`);
      
      // For teachers and admins, show all teams they teach
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        // For teachers and admins, find teams where they're the teacher
        // Important: Don't filter by the deck being in the team yet - we want to show ALL teams
        // they can assign the deck to
        const teacherTeamsQuery = { teacher: userId };
        
        console.log('Teacher teams query:', JSON.stringify(teacherTeamsQuery));
        
        const teacherTeams = await Class.find(teacherTeamsQuery)
          .populate('teacher', 'username email')
          .populate('students', 'username email')
          .populate('decks', 'name');
        
        console.log(`Found ${teacherTeams.length} teams where user is teacher`);
        
        // For teams with this deck, mark them (but return ALL teams)
        const enhancedTeams = teacherTeams.map(team => {
          const deckIds = team.decks.map(d => 
            typeof d === 'object' ? d._id.toString() : d.toString()
          );
          
          const hasDeck = deckIds.includes(req.query.deck);
          
          return {
            ...team.toObject(),
            hasDeck
          };
        });
        
        return res.json(enhancedTeams);
      } else {
        // For students, just find classes they're in that have this deck
        const studentTeams = await Class.find({
          students: userId,
          decks: req.query.deck
        })
          .populate('teacher', 'username email')
          .populate('students', 'username email')
          .populate('decks', 'name');
        
        return res.json(studentTeams);
      }
    }
    
    // Regular classes query (no deck filter)
    let query = {};
    
    if (req.user.role === 'admin') {
      // Admins can see all classes
      query = {};
    } else if (req.user.role === 'teacher') {
      // Teacher can see classes where they are a teacher OR a student
      query = { 
        $or: [
          { teacher: userId },
          { students: userId }
        ]
      };
    } else {
      // Students can only see classes they are enrolled in
      query = { students: userId };
    }
    
    console.log('Fetching classes for user:', userId);
    
    const classes = await Class.find(query)
      .populate('teacher', 'username')
      .populate('students', 'username')
      .populate('decks');
    
    console.log('Found classes:', classes.length);
    
    // Enhance classes with progress stats
    const enhancedClasses = await Promise.all(classes.map(async (classItem) => {
      // Convert Mongoose document to plain object
      const classObj = classItem.toObject();
      
      // Compute deck stats
      let totalMastery = 0;
      let deckCount = classObj.decks?.length || 0;
      
      // For each student, compute average mastery across decks
      const studentStats = await Promise.all((classObj.students || []).map(async (student) => {
        try {
          // Get student ID - handle both object and string formats
          const studentId = typeof student === 'object' ? student._id : student;
          
          if (!studentId) {
            console.warn('Invalid student ID in class:', classObj.name);
            return { 
              studentId: 'unknown', 
              mastery: 0, 
              completedDecks: 0, 
              lastActivity: null 
            };
          }
          
          console.log(`Calculating progress for student ID: ${studentId}`);
          
          // Get student progress for all decks in this class
          const studentProgress = await UserProgress.find({
            user: studentId,
            deck: { $in: classObj.decks?.map(d => d._id || d) || [] }
          });
          
          // Calculate average mastery for this student
          const studentMastery = studentProgress.length > 0
            ? studentProgress.reduce((sum, p) => sum + (p.stats?.masteryPercentage || 0), 0) / studentProgress.length
            : 0;
            
          return {
            studentId,
            mastery: studentMastery,
            completedDecks: studentProgress.length,
            lastActivity: studentProgress.length > 0
              ? Math.max(...studentProgress.map(p => p.stats?.lastStudied ? new Date(p.stats.lastStudied).getTime() : 0))
              : null
          };
        } catch (err) {
          console.warn(`Error calculating stats for student in class ${classObj.name}:`, err);
          return { studentId: 'error', mastery: 0, completedDecks: 0, lastActivity: null };
        }
      }));
      
      // Calculate class-wide stats
      let averageMastery = 0;
      let activeStudentCount = 0;
      
      if (studentStats.length > 0) {
        // Count students with any activity
        activeStudentCount = studentStats.filter(s => s.lastActivity).length;
        
        // Calculate average mastery across all active students
        const totalStudentMastery = studentStats.reduce((sum, s) => sum + s.mastery, 0);
        averageMastery = activeStudentCount > 0 ? totalStudentMastery / activeStudentCount : 0;
      }
      
      // Add stats to class object
      return {
        ...classObj,
        stats: {
          averageMastery,
          activeStudentCount,
          deckCount,
          totalStudents: classObj.students?.length || 0,
          studentDetails: studentStats,
          lastUpdated: new Date()
        }
      };
    }));
    
    res.json(enhancedClasses);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update the GET by ID route to include progress stats
router.get('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate({
        path: 'decks',
        select: 'name description cards stats',
        populate: [{
          path: 'creator',
          select: 'username'
        }, {
          path: 'cards',
          select: '_id question answer'
        }]
      });

    if (!classItem) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check access rights
    const hasAccess = 
      req.user.role === 'admin' || 
      classItem.teacher._id.toString() === req.user.userId ||
      classItem.students.some(student => student._id.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Convert to object and enhance with progress data
    const classObj = classItem.toObject();
    
    // Get progress data for all students in this class
    const studentProgress = await Promise.all(classObj.students.map(async (student) => {
      try {
        // Get progress for all decks assigned to this class
        const deckIds = classObj.decks.map(d => d._id);
        
        // Get overall student progress
        const progress = await UserProgress.find({
          user: student._id,
          deck: { $in: deckIds }
        });
        
        // Calculate stats for this student
        const masteryByDeck = {};
        progress.forEach(p => {
          masteryByDeck[p.deck.toString()] = p.stats?.masteryPercentage || 0;
        });
        
        // Calculate average mastery across decks
        const totalMastery = progress.reduce((sum, p) => sum + (p.stats?.masteryPercentage || 0), 0);
        const averageMastery = progress.length ? totalMastery / progress.length : 0;
        
        // Find last study date
        const lastStudied = progress.length ? 
          Math.max(...progress
            .filter(p => p.stats?.lastStudied)
            .map(p => new Date(p.stats.lastStudied).getTime())
          ) : null;
        
        return {
          studentId: student._id,
          username: student.username,
          email: student.email,
          progress: {
            averageMastery,
            lastStudied: lastStudied ? new Date(lastStudied) : null,
            completedDecks: progress.length,
            totalDecks: deckIds.length,
            masteryByDeck
          }
        };
      } catch (err) {
        console.warn(`Error getting progress for student ${student.username}:`, err);
        return {
          studentId: student._id,
          username: student.username,
          email: student.email,
          progress: {
            averageMastery: 0,
            lastStudied: null,
            completedDecks: 0,
            totalDecks: classObj.decks.length,
            masteryByDeck: {}
          }
        };
      }
    }));
    
    // Calculate overall class progress
    const activeStudents = studentProgress.filter(s => s.progress.completedDecks > 0);
    const classMastery = activeStudents.length ?
      activeStudents.reduce((sum, s) => sum + s.progress.averageMastery, 0) / activeStudents.length : 0;
    
    // Add progress data to response
    const enhancedClass = {
      ...classObj,
      stats: {
        totalStudents: classObj.students.length,
        activeStudents: activeStudents.length,
        averageMastery: classMastery,
        totalDecks: classObj.decks.length,
        lastUpdated: new Date()
      },
      studentProgress
    };
    
    res.json(enhancedClass);
  } catch (error) {
    console.error(`Error getting class details:`, error);
    res.status(500).json({ message: error.message });
  }
});

// Create new class/team
router.post('/', [auth, roleAuth(['teacher', 'admin'])], async (req, res) => {
  try {
    const { name, description, privacy, invitedMembers, selectedDecks } = req.body;

    const newClass = new Class({
      name,
      description,
      privacy: privacy || 'private',
      teacher: req.user._id,
      students: invitedMembers || [],
      decks: selectedDecks || [],
      joinCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    });

    await newClass.save();

    // Update invited students' references
    if (invitedMembers?.length) {
      await User.updateMany(
        { _id: { $in: invitedMembers } },
        { 
          $addToSet: { 
            classes: newClass._id,
            assignedDecks: selectedDecks?.map(deckId => ({
              deck: deckId,
              assignedBy: newClass._id
            }))
          }
        }
      );
    }

    // Update teacher's references
    await User.findByIdAndUpdate(
      req.user._id,
      { 
        $addToSet: { 
          classes: newClass._id 
        }
      }
    );

    const populatedClass = await Class.findById(newClass._id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('decks', 'name description');

    res.status(201).json(populatedClass);
  } catch (error) {
    console.error('Class creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Fix the corrupted PUT route

// Update class/team route - Fix the corrupted implementation
router.put('/:id', [auth, roleAuth(['teacher', 'admin'])], async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (classItem.teacher.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this team' });
    }

    const { invitedMembers, selectedDecks, ...updateData } = req.body;

    // Update basic info
    Object.assign(classItem, updateData);

    // Handle member changes
    let updatedStudents = classItem.students;
    if (invitedMembers) {
      const removedMembers = classItem.students.filter(id => !invitedMembers.includes(id.toString()));
      const newMembers = invitedMembers.filter(id => !classItem.students.some(sid => sid.toString() === id));

      // Remove team from users who were removed
      if (removedMembers.length) {
        await User.updateMany(
          { _id: { $in: removedMembers } },
          { $pull: { classes: classItem._id } }
        );
      }

      // Add team to new members
      if (newMembers.length) {
        await User.updateMany(
          { _id: { $in: newMembers } },
          { $push: { classes: classItem._id } }
        );
      }

      updatedStudents = invitedMembers;
      classItem.students = invitedMembers;
    }

    // Track deck changes to handle student assignments properly
    const currentDecks = classItem.decks?.map(d => d.toString()) || [];
    
    // Update deck assignments
    if (selectedDecks) {
      // Find which decks are newly added
      const addedDecks = selectedDecks.filter(
        deckId => !currentDecks.includes(deckId.toString())
      );
      
      // Find which decks are removed
      const removedDecks = currentDecks.filter(
        deckId => !selectedDecks.includes(deckId)
      );
      
      console.log('Team deck changes:', {
        team: classItem.name,
        currentDecks: currentDecks.length,
        newSelection: selectedDecks.length,
        added: addedDecks.length,
        removed: removedDecks.length
      });
      
      // Add all newly selected decks to all students in the class
      if (addedDecks.length > 0 && updatedStudents.length > 0) {
        console.log(`Adding ${addedDecks.length} new decks to ${updatedStudents.length} students`);
        
        // Ensure each student gets the new decks assigned to them
        await User.updateMany(
          { _id: { $in: updatedStudents } },
          { $addToSet: { decks: { $each: addedDecks } } }
        );
      }
      
      classItem.decks = selectedDecks;
    }

    await classItem.save();

    const updatedClass = await Class.findById(classItem._id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('decks', 'name description');

    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(400).json({ message: error.message });
  }
});

// Also fix the corrupted DELETE route
router.delete('/:id', [auth, roleAuth(['teacher', 'admin'])], async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (classItem.teacher.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this team' });
    }

    // Remove team reference from all students
    await User.updateMany(
      { _id: { $in: classItem.students } },
      { $pull: { classes: classItem._id } }
    );

    await classItem.deleteOne();
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add this route to get detailed class statistics including deck count
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all teams this user teaches
    const teacherQuery = { teacher: userId };
    const teacherTeams = await Class.find(teacherQuery)
      .select('_id name decks students')
      .lean();
      
    // Get all teams this user is a student in
    const studentQuery = { students: userId };
    const studentTeams = await Class.find(studentQuery)
      .select('_id name decks students')
      .lean();
    
    const stats = {
      teamsAsTeacher: teacherTeams.length,
      teamsAsStudent: studentTeams.length,
      totalTeams: teacherTeams.length + studentTeams.length,
      teacherStats: teacherTeams.map(team => ({
        id: team._id,
        name: team.name,
        deckCount: team.decks?.length || 0, 
        studentCount: team.students?.length || 0
      })),
      studentStats: studentTeams.map(team => ({
        id: team._id,
        name: team.name,
        deckCount: team.decks?.length || 0,
        studentCount: team.students?.length || 0
      }))
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting team stats:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
