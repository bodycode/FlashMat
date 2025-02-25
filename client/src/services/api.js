import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Learning API methods
api.getLearningStats = async () => {
  const response = await api.get('/users/learning-stats');
  return response.data;
};

api.updateStudyStreak = async () => {
  const response = await api.post('/users/study-streak');
  return response.data;
};

// Assignment API methods
api.createAssignment = async (classId, data) => {
  const response = await api.post(`/classes/${classId}/assignments`, data);
  return response.data;
};

api.getClassAssignments = async (classId) => {
  const response = await api.get(`/classes/${classId}/assignments`);
  return response.data;
};

api.submitAssignment = async (assignmentId, data) => {
  const response = await api.post(`/assignments/${assignmentId}/submit`, data);
  return response.data;
};

api.updateAssignment = async (assignmentId, data) => {
  const response = await api.put(`/assignments/${assignmentId}`, data);
  return response.data;
};

api.deleteAssignment = async (assignmentId) => {
  const response = await api.delete(`/assignments/${assignmentId}`);
  return response.data;
};

export default api;
