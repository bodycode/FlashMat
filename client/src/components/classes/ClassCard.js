import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip
} from '@mui/material';
import { Delete, Group, MenuBook, Edit } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const ClassCard = ({ classData, showMemberCount = false, showDeckCount = false }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/classes/${classData._id}`);
      window.location.reload(); // Refresh to update the list
    } catch (error) {
      console.error('Error deleting team:', error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isOwner = classData.teacher._id === user?._id;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {classData.name}
        </Typography>
        
        {classData.description && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {classData.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {showMemberCount && (
            <Chip
              icon={<Group />}
              label={`${classData.students?.length || 0} Members`}
              size="small"
            />
          )}
          {showDeckCount && (
            <Chip
              icon={<MenuBook />}
              label={`${classData.decks?.length || 0} Decks`}
              size="small"
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, pb: 2 }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => navigate(`/classes/${classData._id}`)}
        >
          VIEW
        </Button>
        {isTeacher && isOwner && (
          <>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<Edit />}
              onClick={() => navigate(`/classes/${classData._id}/edit`)}
            >
              EDIT
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              DELETE
            </Button>
          </>
        )}
      </CardActions>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Team?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{classData.name}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ClassCard;
