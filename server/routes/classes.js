const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Get all classes for current user
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      query.students = req.user._id;
    }

    const classes = await Class.find(query)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate({
        path: 'decks',
        select: 'name description stats',
        populate: {
          path: 'creator',
          select: 'username'
        }
      })
      .lean();

    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
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

// Update class/team
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
    if (invitedMembers) {
      const removedMembers = classItem.students.filter(id => !invitedMembers.includes(id.toString()));
      const newMembers = invitedMembers.filter(id => !classItem.students.includes(id));

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

      classItem.students = invitedMembers;
    }

    // Update deck assignments
    if (selectedDecks) {
      classItem.decks = selectedDecks;
    }

    await classItem.save();

    const updatedClass = await Class.findById(classItem._id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('decks', 'name description');

    res.json(updatedClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get specific class/team
router.get('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('teacher', 'username email')
      .populate('students', 'username email')
      .populate('decks', 'name description');

    if (!classItem) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check access rights
    const hasAccess = 
      req.user.role === 'admin' || 
      classItem.teacher.toString() === req.user.userId ||
      classItem.students.some(student => student._id.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(classItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete class/team
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

module.exports = router;
