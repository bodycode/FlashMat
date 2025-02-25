const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Get progress for a student in a class
router.get('/class/:classId/student/:studentId', 
  [auth, roleAuth(['teacher', 'admin'])], 
  progressController.getStudentProgress
);

// Get progress for all students in a class
router.get('/class/:classId', 
  [auth, roleAuth(['teacher', 'admin'])], 
  progressController.getClassProgress
);

// Update student's progress for an assignment
router.put('/student/:studentId/assignment/:assignmentId', 
  auth, 
  progressController.updateProgress
);

module.exports = router;
