const Progress = require('../models/Progress');
const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');

const progressController = {
  getStudentProgress: async (req, res) => {
    try {
      const { studentId, classId } = req.params;
      
      const progress = await Progress.find({ 
        student: studentId,
        class: classId 
      }).populate('assignment');

      const stats = {
        totalAssignments: progress.length,
        completedAssignments: progress.filter(p => p.completed).length,
        averageMastery: progress.reduce((acc, p) => acc + p.masteryAchieved, 0) / progress.length || 0,
        lastStudied: progress.length ? 
          progress.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt : null
      };

      res.json({ progress, stats });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getClassProgress: async (req, res) => {
    try {
      const { classId } = req.params;
      
      const classData = await Class.findById(classId)
        .populate('students')
        .populate('assignments');

      const progress = await Promise.all(
        classData.students.map(async (student) => {
          const studentProgress = await Progress.find({
            student: student._id,
            class: classId
          });

          return {
            student: {
              _id: student._id,
              username: student.username
            },
            stats: {
              completedAssignments: studentProgress.filter(p => p.completed).length,
              averageMastery: studentProgress.reduce((acc, p) => 
                acc + p.masteryAchieved, 0) / studentProgress.length || 0,
              lastActive: studentProgress.length ?
                studentProgress.sort((a, b) => 
                  b.updatedAt - a.updatedAt)[0].updatedAt : null
            }
          };
        })
      );

      res.json({
        progress,
        classStats: {
          totalStudents: classData.students.length,
          totalAssignments: classData.assignments.length,
          averageCompletion: progress.reduce((acc, p) => 
            acc + p.stats.completedAssignments, 0) / progress.length || 0
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateProgress: async (req, res) => {
    try {
      const { studentId, assignmentId } = req.params;
      const { masteryAchieved, completed } = req.body;

      let progress = await Progress.findOne({
        student: studentId,
        assignment: assignmentId
      });

      if (!progress) {
        progress = new Progress({
          student: studentId,
          assignment: assignmentId,
          masteryAchieved: 0,
          completed: false
        });
      }

      progress.masteryAchieved = masteryAchieved;
      progress.completed = completed;
      await progress.save();

      // Update user's study streak
      const user = await User.findById(studentId);
      user.updateStudyStreak();
      await user.save();

      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = progressController;
