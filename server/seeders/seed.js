require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Deck = require('../models/Deck');
const Card = require('../models/Card');

const seedData = async () => {
  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Class.deleteMany({}),
      Deck.deleteMany({}),
      Card.deleteMany({})
    ]);

    // Create users with different roles
    const users = await User.create([
      {
        username: 'admin',
        email: 'admin@flashmat.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'teacher1',
        email: 'teacher1@flashmat.com',
        password: 'teacher123',
        role: 'teacher'
      },
      {
        username: 'teacher2',
        email: 'teacher2@flashmat.com',
        password: 'teacher123',
        role: 'teacher'
      },
      {
        username: 'student1',
        email: 'student1@flashmat.com',
        password: 'student123',
        role: 'student'
      },
      {
        username: 'student2',
        email: 'student2@flashmat.com',
        password: 'student123',
        role: 'student'
      },
      {
        username: 'student3',
        email: 'student3@flashmat.com',
        password: 'student123',
        role: 'student'
      }
    ]);

    // Create classes
    const classes = await Class.create([
      {
        name: 'Algebra I',
        teacher: users[1]._id, // teacher1
        students: [users[3]._id, users[4]._id], // student1, student2
        description: 'Basic algebra concepts for beginners'
      },
      {
        name: 'Geometry Fundamentals',
        teacher: users[1]._id, // teacher1
        students: [users[3]._id, users[5]._id], // student1, student3
        description: 'Introduction to geometric concepts'
      },
      {
        name: 'Advanced Calculus',
        teacher: users[2]._id, // teacher2
        students: [users[4]._id, users[5]._id], // student2, student3
        description: 'Higher level mathematics'
      }
    ]);

    // Create decks for each class
    const decks = await Deck.create([
      {
        name: 'Basic Equations',
        description: 'Simple algebraic equations',
        class: classes[0]._id,
        creator: users[1]._id,
        isPublic: true
      },
      {
        name: 'Quadratic Functions',
        description: 'Working with quadratic equations',
        class: classes[0]._id,
        creator: users[1]._id,
        isPublic: true
      },
      {
        name: 'Triangles & Circles',
        description: 'Basic geometric shapes',
        class: classes[1]._id,
        creator: users[1]._id,
        isPublic: true
      },
      {
        name: 'Derivatives',
        description: 'Introduction to derivatives',
        class: classes[2]._id,
        creator: users[2]._id,
        isPublic: false
      }
    ]);

    // Create cards for each deck
    await Card.create([
      // Basic Equations deck
      {
        question: 'Solve: x + 5 = 12',
        answer: '7',
        deck: decks[0]._id,
        type: 'math',
        difficulty: 1
      },
      {
        question: 'Solve: 2x = 16',
        answer: '8',
        deck: decks[0]._id,
        type: 'math',
        difficulty: 1
      },
      {
        question: 'What is a variable?',
        answer: 'A symbol that represents an unknown value',
        deck: decks[0]._id,
        type: 'text',
        difficulty: 1
      },
      // Quadratic Functions deck
      {
        question: 'Solve: x² + 5x + 6 = 0',
        answer: 'x = -2 or x = -3',
        deck: decks[1]._id,
        type: 'math',
        difficulty: 3
      },
      {
        question: 'What is the quadratic formula?',
        answer: 'x = (-b ± √(b² - 4ac)) / 2a',
        deck: decks[1]._id,
        type: 'text',
        difficulty: 2
      },
      {
        question: 'Which is a quadratic equation?',
        answer: 'x² + 2x + 1 = 0',
        type: 'multipleChoice',
        options: ['x + 1 = 0', 'x² + 2x + 1 = 0', '2x = 4', '√x = 2'],
        deck: decks[1]._id,
        difficulty: 2
      },
      // Geometry deck
      {
        question: 'What is the area of a circle?',
        answer: 'πr²',
        deck: decks[2]._id,
        type: 'text',
        difficulty: 2
      },
      {
        question: 'In a right triangle, what is sin(θ)?',
        answer: 'opposite/hypotenuse',
        deck: decks[2]._id,
        type: 'text',
        difficulty: 3
      },
      {
        question: 'What is the sum of angles in a triangle?',
        answer: '180°',
        type: 'multipleChoice',
        options: ['90°', '180°', '360°', '270°'],
        deck: decks[2]._id,
        difficulty: 1
      },
      // Calculus deck
      {
        question: 'What is the derivative of x²?',
        answer: '2x',
        deck: decks[3]._id,
        type: 'math',
        difficulty: 3
      },
      {
        question: 'What is the chain rule used for?',
        answer: 'Finding the derivative of a composite function',
        deck: decks[3]._id,
        type: 'text',
        difficulty: 4
      },
      {
        question: 'What is the derivative of sin(x)?',
        answer: 'cos(x)',
        type: 'multipleChoice',
        options: ['cos(x)', '-sin(x)', 'tan(x)', '-cos(x)'],
        deck: decks[3]._id,
        difficulty: 4
      }
    ]);

    console.log('✅ Test data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Connect to MongoDB and run seeder
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('📦 MongoDB Connected');
    seedData();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
