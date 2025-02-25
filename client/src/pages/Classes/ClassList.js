import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  CircularProgress
} from '@mui/material';
import { Add, School } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ClassCard from '../../components/classes/ClassCard';

const ClassList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        console.log('Fetching classes for user:', user?._id); // Debug log
        const response = await api.get('/classes');  // Changed from '/classes/user' to '/classes'
        console.log('Raw classes data:', response.data); // New debug log
        setClasses(response.data);
        setLoading(false);  // Move this here to ensure data is set
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (user?._id) {  // Only fetch if we have a user ID
      fetchClasses();
    } else {
      setLoading(false); // Make sure to stop loading if no user
    }
  }, [user?._id]);

  // Log state changes
  useEffect(() => {
    console.log('Current classes state:', classes);
    console.log('Current user:', user);
  }, [classes, user]);

  if (loading) return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '80vh' 
    }}>
      <CircularProgress />
    </Box>
  );

  if (error) return <Typography color="error">{error}</Typography>;

  const userClasses = classes.filter(c => {
    console.log('Filtering class:', c); // Debug each class
    console.log('Teacher check:', c.teacher, user?._id);
    console.log('Students check:', c.students);
    
    return c.teacher === user?._id || 
           c.students?.some(student => student === user?._id);
  });

  console.log('Filtered classes:', userClasses); // Debug log

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4 
      }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School /> Teams
        </Typography>
        {/* Changed condition to include admin */}
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => navigate('/classes/new')}
          >
            Create Team
          </Button>
        )}
      </Box>

      {userClasses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {user?.role === 'teacher' 
              ? "You haven't created any teams yet." 
              : "You're not a member of any teams yet."}
          </Typography>
          {user?.role === 'teacher' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => navigate('/classes/new')}
              sx={{ mt: 2 }}
            >
              Create Your First Team
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {userClasses.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team._id}>
              <ClassCard 
                classData={team} 
                showMemberCount
                showDeckCount
                isTeacher={user?.role === 'teacher'}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ClassList;
