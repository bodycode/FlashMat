import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import AssignmentCard from '../../components/classes/AssignmentCard';

const AssignmentList = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await api.get('/assignments');
        setAssignments(response.data);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Assignments
      </Typography>
      {assignments.map(assignment => (
        <AssignmentCard
          key={assignment._id}
          assignment={assignment}
          isTeacher={user?.role === 'teacher'}
        />
      ))}
    </Box>
  );
};

export default AssignmentList;
