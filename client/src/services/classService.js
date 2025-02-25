import api from './api';

const classService = {
  getClasses: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  getClass: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  updateClass: async (id, classData) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  deleteClass: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  addStudent: async (classId, studentId) => {
    const response = await api.post(`/classes/${classId}/students`, { studentId });
    return response.data;
  },

  removeStudent: async (classId, studentId) => {
    const response = await api.delete(`/classes/${classId}/students/${studentId}`);
    return response.data;
  }
};

export default classService;
