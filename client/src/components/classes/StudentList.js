import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import api from '../../services/api';

const StudentList = ({ classId, students = [], isTeacher, onUpdate }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleAddStudent = async () => {
    try {
      await api.post(`/classes/${classId}/students`, { email });
      setEmail('');
      setOpenDialog(false);
      setError('');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      try {
        await api.delete(`/classes/${classId}/students/${studentId}`);
        if (onUpdate) onUpdate();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to remove student');
      }
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isTeacher && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenDialog(true)}
          >
            Add Student
          </Button>
        </Box>
      )}

      <List>
        {students.map((student) => (
          <ListItem key={student._id} divider>
            <ListItemText
              primary={student.username}
              secondary={student.email}
            />
            {isTeacher && (
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  color="error"
                  onClick={() => handleRemoveStudent(student._id)}
                >
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
        {students.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No students in this class yet
          </Typography>
        )}
      </List>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add Student</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Student Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStudent} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentList;
