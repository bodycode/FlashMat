import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/shared/Layout';

// Auth & Common
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Decks & Cards
import DeckList from './components/decks/DeckList';
import DeckForm from './components/decks/DeckForm';
import DeckView from './components/decks/DeckView';
import CardForm from './components/cards/CardForm';
import StudyMode from './components/cards/StudyMode';

// Classes (Teams) & Assignments
import ClassList from './pages/Classes/ClassList';
import ClassForm from './pages/Classes/ClassForm';
import ClassView from './pages/Classes/ClassView';
import AssignmentList from './pages/Classes/AssignmentList';

function App() {
  return (
    <AuthProvider>
      <Router>
        <CssBaseline />
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />

              {/* Deck Routes */}
              <Route path="/decks" element={<DeckList />} />
              <Route path="/decks/new" element={<DeckForm />} />
              <Route path="/decks/:id" element={<DeckView />} />
              <Route path="/decks/:id/edit" element={<DeckForm />} />
              <Route path="/decks/:deckId/cards/new" element={<CardForm />} />
              <Route path="/decks/:deckId/cards/:cardId/edit" element={<CardForm />} />
              <Route path="/decks/:deckId/study" element={<StudyMode />} />

              {/* Team (Class) Routes */}
              <Route path="/classes" element={<ClassList />} />
              <Route path="/classes/new" element={<ClassForm />} />
              <Route path="/classes/:id" element={<ClassView />} />
              <Route path="/classes/:id/edit" element={<ClassForm />} />

              {/* Assignment Routes */}
              <Route path="/assignments" element={<AssignmentList />} />
              <Route path="/assignments/:id/study" element={<StudyMode />} />
            </Route>
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
