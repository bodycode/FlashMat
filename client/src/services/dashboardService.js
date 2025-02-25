import api from './api';

const dashboardService = {
  getStats: async () => {
    const response = await api.get('/users/learning-stats');
    return response.data;
  },

  getRecentActivity: async () => {
    const response = await api.get('/users/activity');
    return response.data;
  },

  getStudyReminders: async () => {
    const response = await api.get('/decks/reminders');
    return response.data;
  }
};

export default dashboardService;
