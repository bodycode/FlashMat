import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Update auth object to use axios directly and add better error handling
export const auth = {
  login: async (credentials) => {
    console.log('Making login request:', {
      url: `${BASE_URL}/api/auth/login`,
      credentials: { email: credentials.email }
    });
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
      console.log('Login response received:', {
        status: response.status,
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user
      });
      return response;
    } catch (error) {
      console.error('Login request failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },
  register: (userData) => axios.post(`${BASE_URL}/api/auth/register`, userData),
  verify: () => axios.get(`${BASE_URL}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }),
  getProfile: () => axios.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })
};

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

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

// Add profile methods to api object
api.updateProfile = async (userData) => {
  console.log('API: Updating profile', userData);
  const response = await api.put('/auth/profile', userData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  console.log('API: Profile update response', response.data);
  return response.data;
};

api.getProfile = async () => {
  const response = await api.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
};

export default api;
