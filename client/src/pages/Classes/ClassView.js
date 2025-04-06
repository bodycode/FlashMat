import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import StudentList from '../../components/classes/StudentList';
import DeckList from '../../components/classes/DeckList';
import ClassProgress from '../../components/classes/ClassProgress';
import AssignmentForm from '../../components/classes/AssignmentForm';
import AssignmentCard from '../../components/classes/AssignmentCard';
import StudentProgress from '../../components/classes/StudentProgress';

const ClassView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Add debug logging in the fetchClassDetails function
  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/classes/${id}`);
      setClassData(response.data);
      
      // Add debug logging for permissions check
      const canEdit = user?.role === 'admin' || response.data.isAssignedTeacher;
      console.log('Class edit permission check:', {
        classId: id,
        className: response.data.name,
        userRole: user?.role,
        userId: user?._id,
        teacherId: response.data.teacher?._id,
        isAssignedTeacher: response.data.isAssignedTeacher,
        canEdit: canEdit
      });
      
      setCanEdit(canEdit);
    } catch (error) {
      console.error('Error fetching class details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id, user]);

  const handleAssignmentCreate = async (assignmentData) => {
    try {
      await api.post(`/classes/${id}/assignments`, assignmentData);
      setShowAssignmentForm(false);
      setEditingAssignment(null);
      fetchClassDetails();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setShowAssignmentForm(true);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await api.delete(`/assignments/${assignmentId}`);
        fetchClassDetails();
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
  };

  const handleStartAssignment = (assignment) => {
    navigate(`/assignments/${assignment._id}/study`);
  };

  if (loading) return <CircularProgress />;
  if (!classData) return <Typography>Class not found</Typography>;

  // Check if user is teacher of this class
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4 
      }}>
        <Typography variant="h4">
          {classData.name}
        </Typography>
        
        {/* Show active buttons only for admin or assigned teacher */}
        {canEdit ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/classes/${id}/edit`)}
            >
              Edit Class
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowAssignmentForm(true)}
            >
              Create Assignment
            </Button>
          </Box>
        ) : user?.role === 'teacher' ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="You are not assigned to this Team" placement="left" arrow>
              <span>
                <Button
                  variant="outlined"
                  disabled
                  sx={{ opacity: 0.5 }}
                >
                  Edit Class
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="You are not assigned to this Team" placement="left" arrow>
              <span>
                <Button
                  variant="contained"
                  disabled
                  sx={{ opacity: 0.5 }}
                >
                  Create Assignment
                </Button>
              </span>
            </Tooltip>
          </Box>
        ) : null}
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Progress" />
        <Tab label="Students" />
        <Tab label="Assignments" />
        <Tab label="Study Materials" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Class Details
                </Typography>
                <Typography>
                  {classData.description || 'No description provided.'}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Teacher
                  </Typography>
                  <Typography>
                    {classData.teacher?.username || 'No teacher assigned'}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Overview
                  </Typography>
                  <Typography>
                    {classData.students?.length || 0} Students • {classData.decks?.length || 0} Study Materials
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ClassProgress classData={classData} />
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <StudentList 
          classId={id}
          students={classData.students}
          isTeacher={isTeacher}
          onUpdate={fetchClassDetails}
        />
      )}

      {activeTab === 3 && (
        <Box>
          {isTeacher && (
            <Button
              variant="contained"
              onClick={() => setShowAssignmentForm(true)}
              sx={{ mb: 3 }}
            >
              Create Assignment
            </Button>
          )}
          {classData.assignments?.map(assignment => (
            <AssignmentCard
              key={assignment._id}
              assignment={assignment}
              isTeacher={isTeacher}
              onEdit={() => handleEditAssignment(assignment)}
              onDelete={() => handleDeleteAssignment(assignment._id)}
              onStart={() => handleStartAssignment(assignment)}
            />
          ))}
        </Box>
      )}

      {activeTab === 4 && (
        <DeckList 
          classId={id}
          decks={classData.decks}
          isTeacher={isTeacher}
          onUpdate={fetchClassDetails}
        />
      )}

      <AssignmentForm
        open={showAssignmentForm}
        onClose={() => {
          setShowAssignmentForm(false);
          setEditingAssignment(null);
        }}
        classId={id}
        assignment={editingAssignment}
        onAssign={handleAssignmentCreate}
      />
    </Box>
  );
};

export default ClassView;
