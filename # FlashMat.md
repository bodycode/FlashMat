# FlashMat

A modern flashcard application for mathematics learning.

## Features
- Flashcard creation and management
- Team-based learning
- Progress tracking
- Achievement system
- Admin dashboard

## Tech Stack
- Frontend: React, Material-UI
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: JWT

## Setup
1. Clone the repository
2. Install dependencies
   ```bash
   npm install
   cd client && npm install
   ```
3. Create .env file in root directory with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/flashmat
   JWT_SECRET=your_secret_here
   NODE_ENV=development
   ```
4. Start development servers:
   ```bash
   # Backend
   npm run dev
   # Frontend (in another terminal)
   cd client && npm start
   ```
