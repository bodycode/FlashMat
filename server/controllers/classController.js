const Class = require('../models/Class');
const User = require('../models/User');
const Assignment = require('../models/Assignment');

const classController = {
  getClasses: async (req, res) => {
    try {
      const query = req.user.role === 'teacher' 
        ? { teacher: req.user.userId }
        : { students: req.user.userId };

      const classes = await Class.find(query)
        .populate('teacher', 'username email')
        .populate('students', 'username email')
        .populate('decks', 'name description')
        .sort('-createdAt');

      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  createClass: async (req, res) => {
    try {
      const newClass = new Class({
        ...req.body,
        teacher: req.user.userId
      });
      await newClass.save();

      const populatedClass = await Class.findById(newClass._id)
        .populate('teacher', 'username email');

      res.status(201).json(populatedClass);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getClass: async (req, res) => {
    try {
      const classItem = await Class.findById(req.params.id)
        .populate('teacher', 'username email')
        .populate('students', 'username email')
        .populate('decks', 'name description')
        .populate('assignments');

      if (!classItem) {
        return res.status(404).json({ message: 'Class not found' });
      }

      // Check if user has access
      if (req.user.role !== 'admin' && 
          classItem.teacher.toString() !== req.user.userId &&
          !classItem.students.some(student => student._id.toString() === req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(classItem);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateClass: async (req, res) => {
    try {
      const classItem = await Class.findById(req.params.id);
      if (!classItem) {
        return res.status(404).json({ message: 'Class not found' });
      }

      if (classItem.teacher.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      Object.assign(classItem, req.body);
      await classItem.save();

      const updatedClass = await Class.findById(classItem._id)
        .populate('teacher', 'username email')
        .populate('students', 'username email')
        .populate('decks', 'name');

      res.json(updatedClass);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteClass: async (req, res) => {
    try {
      const classItem = await Class.findById(req.params.id);
      if (!classItem) {
        return res.status(404).json({ message: 'Class not found' });
      }

      if (classItem.teacher.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Remove class from all students' classes array
      await User.updateMany(
        { _id: { $in: classItem.students } },
        { $pull: { classes: classItem._id } }
      );

      // Delete all assignments for this class
      await Assignment.deleteMany({ class: classItem._id });

      await classItem.deleteOne();
      res.json({ message: 'Class deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addStudent: async (req, res) => {
    try {
      const { email } = req.body;
      const student = await User.findOne({ email });
      
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const classItem = await Class.findById(req.params.id);
      if (!classItem) {
        return res.status(404).json({ message: 'Class not found' });
      }

      if (classItem.students.includes(student._id)) {
        return res.status(400).json({ message: 'Student already in class' });
      }

      classItem.students.push(student._id);
      student.classes.push(classItem._id);

      await Promise.all([classItem.save(), student.save()]);

      res.json(await classItem.populate('students', 'username email'));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  removeStudent: async (req, res) => {
    try {
      const [classItem, student] = await Promise.all([
        Class.findById(req.params.id),
        User.findById(req.params.studentId)
      ]);

      if (!classItem || !student) {
        return res.status(404).json({ message: 'Class or student not found' });
      }

      classItem.students = classItem.students.filter(
        id => id.toString() !== req.params.studentId
      );
      student.classes = student.classes.filter(
        id => id.toString() !== req.params.id
      );

      await Promise.all([classItem.save(), student.save()]);

      res.json({ message: 'Student removed from class' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = classController;
