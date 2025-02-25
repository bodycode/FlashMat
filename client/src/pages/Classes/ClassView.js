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
  Divider
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

  const fetchClassDetails = async () => {
    try {
      const response = await api.get(`/classes/${id}`);
      setClassData(response.data);
    } catch (error) {
      console.error('Error fetching class details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  const handleAssignmentCreate = async (assignmentData) => {
    try {
      await api.post(`/classes/${id}/assignments`, assignmentData);
      fetchClassDetails();
      setShowAssignmentForm(false);
      setEditingAssignment(null);
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
        {user?.role === 'teacher' && (
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
        )}
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
              </CardContent>
            </Card>
          </Grid>
          {classData.assignments?.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Recent Assignments
              </Typography>
              {classData.assignments.slice(0, 3).map(assignment => (
                <AssignmentCard
                  key={assignment._id}
                  assignment={assignment}
                  isTeacher={user?.role === 'teacher'}
                  onEdit={() => handleEditAssignment(assignment)}
                  onDelete={() => handleDeleteAssignment(assignment._id)}
                  onStart={() => handleStartAssignment(assignment)}
                />
              ))}
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ClassProgress classData={classData} />
          </Grid>
          {classData.students?.map(student => (
            <Grid item xs={12} md={6} key={student._id}>
              <StudentProgress
                student={student}
                assignments={classData.assignments}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 2 && (
        <StudentList 
          classId={id} 
          students={classData.students}
          isTeacher={user?.role === 'teacher'}
          onUpdate={fetchClassDetails}
        />
      )}

      {activeTab === 3 && (
        <Box>
          {user?.role === 'teacher' && (
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
              isTeacher={user?.role === 'teacher'}
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
          isTeacher={user?.role === 'teacher'}
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
