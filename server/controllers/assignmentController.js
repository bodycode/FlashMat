const Assignment = require('../models/Assignment');
const Class = require('../models/Class');
const User = require('../models/User');

const assignmentController = {
  createAssignment: async (req, res) => {
    try {
      const assignment = new Assignment({
        ...req.body,
        class: req.params.classId
      });
      await assignment.save();

      await Class.findByIdAndUpdate(req.params.classId, {
        $push: { assignments: assignment._id }
      });

      res.status(201).json(await assignment.populate('deck', 'name'));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getClassAssignments: async (req, res) => {
    try {
      const assignments = await Assignment.find({ class: req.params.classId })
        .populate('deck', 'name')
        .populate('submissions.student', 'username')
        .sort('dueDate');
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  submitAssignment: async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      const submission = await assignment.submit(
        req.user.userId,
        req.body.masteryAchieved,
        req.body.cardsCompleted
      );

      // Update user's study streak
      const user = await User.findById(req.user.userId);
      user.updateStudyStreak();
      await user.save();

      res.json(submission);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  updateAssignment: async (req, res) => {
    try {
      const { dueDate, requirements } = req.body;
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      if (dueDate) assignment.dueDate = dueDate;
      if (requirements) assignment.requirements = requirements;

      await assignment.save();
      res.json(await assignment.populate('deck', 'name'));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteAssignment: async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      await Class.findByIdAndUpdate(assignment.class, {
        $pull: { assignments: assignment._id }
      });

      await assignment.deleteOne();
      res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getAssignmentStats: async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id)
        .populate('submissions.student', 'username');
      
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      const stats = {
        totalSubmissions: assignment.submissions.length,
        averageMastery: assignment.submissions.reduce((acc, sub) => 
          acc + sub.masteryAchieved, 0) / (assignment.submissions.length || 1),
        completed: assignment.submissions.filter(sub => 
          sub.masteryAchieved >= assignment.requirements.minimumMastery).length
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = assignmentController;