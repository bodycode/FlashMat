import React, { createContext, useContext, useReducer } from 'react';

const StudySessionContext = createContext(null);

const initialState = {
  currentDeck: null,
  cards: [],
  currentCardIndex: 0,
  correct: 0,
  incorrect: 0,
  timeSpent: 0,
  isSessionComplete: false,
};

function studySessionReducer(state, action) {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...initialState,
        currentDeck: action.payload.deck,
        cards: action.payload.cards,
      };
    case 'ANSWER_CARD':
      return {
        ...state,
        correct: state.correct + (action.payload.isCorrect ? 1 : 0),
        incorrect: state.incorrect + (action.payload.isCorrect ? 0 : 1),
        currentCardIndex: state.currentCardIndex + 1,
        isSessionComplete: state.currentCardIndex + 1 >= state.cards.length,
      };
    case 'UPDATE_TIME':
      return {
        ...state,
        timeSpent: action.payload,
      };
    case 'END_SESSION':
      return {
        ...state,
        isSessionComplete: true,
      };
    case 'RESET_SESSION':
      return initialState;
    default:
      return state;
  }
}

export const StudySessionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(studySessionReducer, initialState);

  return (
    <StudySessionContext.Provider value={{ state, dispatch }}>
      {children}
    </StudySessionContext.Provider>
  );
};

export const useStudySession = () => {
  const context = useContext(StudySessionContext);
  if (!context) {
    throw new Error('useStudySession must be used within a StudySessionProvider');
  }
  return context;
};
