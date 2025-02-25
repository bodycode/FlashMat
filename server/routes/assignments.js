const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Create new assignment
router.post('/classes/:classId/assignments', 
  [auth, roleAuth(['teacher', 'admin'])], 
  assignmentController.createAssignment
);

// Get all assignments for a class
router.get('/classes/:classId/assignments', 
  auth, 
  assignmentController.getClassAssignments
);

// Submit assignment
router.post('/assignments/:id/submit', 
  auth, 
  assignmentController.submitAssignment
);

// Update assignment
router.put('/assignments/:id', 
  [auth, roleAuth(['teacher', 'admin'])], 
  assignmentController.updateAssignment
);

// Delete assignment
router.delete('/assignments/:id', 
  [auth, roleAuth(['teacher', 'admin'])], 
  assignmentController.deleteAssignment
);

// Get assignment statistics
router.get('/assignments/:id/stats', 
  [auth, roleAuth(['teacher', 'admin'])], 
  assignmentController.getAssignmentStats
);

module.exports = router;
