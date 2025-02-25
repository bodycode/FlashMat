export const APP_NAME = 'FlashMat';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  DECKS: '/decks',
  PROFILE: '/profile',
  STUDY: '/study/:deckId',
};

export const CARD_TYPES = {
  TEXT: 'text',
  MULTIPLE_CHOICE: 'multipleChoice',
  MATH: 'math',
};

export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  DECKS: '/api/decks',
  CARDS: '/api/cards',
  CLASSES: '/api/classes',
};
