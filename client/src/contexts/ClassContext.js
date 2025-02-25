import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const ClassContext = createContext();

export const ClassProvider = ({ children }) => {
  const [currentClass, setCurrentClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchClass = useCallback(async (classId) => {
    setLoading(true);
    try {
      const response = await api.get(`/classes/${classId}`);
      setCurrentClass(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch class');
      setCurrentClass(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = useCallback(async (classId, email) => {
    try {
      const response = await api.post(`/classes/${classId}/students`, { email });
      setCurrentClass(prev => ({
        ...prev,
        students: [...prev.students, response.data]
      }));
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to add student');
    }
  }, []);

  const removeStudent = useCallback(async (classId, studentId) => {
    try {
      await api.delete(`/classes/${classId}/students/${studentId}`);
      setCurrentClass(prev => ({
        ...prev,
        students: prev.students.filter(student => student._id !== studentId)
      }));
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to remove student');
    }
  }, []);

  const assignDeck = useCallback(async (classId, deckId) => {
    try {
      const response = await api.post(`/classes/${classId}/decks`, { deckId });
      setCurrentClass(prev => ({
        ...prev,
        decks: [...prev.decks, response.data]
      }));
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to assign deck');
    }
  }, []);

  const value = {
    currentClass,
    loading,
    error,
    fetchClass,
    addStudent,
    removeStudent,
    assignDeck
  };

  return (
    <ClassContext.Provider value={value}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => {
  const context = useContext(ClassContext);
  if (!context) {
    throw new Error('useClass must be used within a ClassProvider');
  }
  return context;
};

export default ClassContext;
