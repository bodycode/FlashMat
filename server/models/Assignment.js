const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  points: {
    type: Number,
    default: 100
  },
  requirements: {
    minimumMastery: {
      type: Number,
      default: 80
    },
    minimumCards: {
      type: Number,
      default: 0
    }
  },
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    masteryAchieved: {
      type: Number,
      default: 0
    },
    cardsCompleted: {
      type: Number,
      default: 0
    },
    grade: {
      type: Number
    },
    feedback: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if a student has completed the assignment
assignmentSchema.methods.isCompleted = function(studentId) {
  const submission = this.submissions.find(
    sub => sub.student.toString() === studentId.toString()
  );
  
  if (!submission) return false;
  
  return submission.masteryAchieved >= this.requirements.minimumMastery &&
         submission.cardsCompleted >= this.requirements.minimumCards;
};

// Method to submit an assignment
assignmentSchema.methods.submit = async function(studentId, masteryAchieved, cardsCompleted) {
  const submission = {
    student: studentId,
    masteryAchieved,
    cardsCompleted,
    submittedAt: new Date()
  };

  // Calculate grade based on requirements
  const masteryScore = (masteryAchieved / this.requirements.minimumMastery) * 100;
  const cardsScore = this.requirements.minimumCards > 0 
    ? (cardsCompleted / this.requirements.minimumCards) * 100 
    : 100;
  
  submission.grade = Math.min(100, (masteryScore + cardsScore) / 2);

  this.submissions.push(submission);
  await this.save();
  
  return submission;
};

module.exports = mongoose.model('Assignment', assignmentSchema);
