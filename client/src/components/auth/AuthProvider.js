import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  // Updated login function to store role in localStorage for easy access
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Explicitly store role for easy access by components
      if (user && user.role) {
        localStorage.setItem('userRole', user.role);
        console.log('Stored user role in localStorage:', user.role);
      }
      
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (username, email, password) => {
    const response = await axios.post('/api/auth/register', {
      username,
      email,
      password
    });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  // Also update logout to clear the role
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole'); // Clear the role when logging out
    setUser(null);
  };

  // Add a utility function inside AuthProvider
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // Update the value object to include the isAdmin function
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
