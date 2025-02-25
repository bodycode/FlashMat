import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Typography, 
  Box, 
  Stack, 
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Assignment, Star, Add, School, Delete } from '@mui/icons-material';
import api from '../../services/api';

const DeckCard = ({ deck, onDelete }) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStudy = () => {
    navigate(`/decks/${deck._id}/study`);
  };

  const handleEdit = () => {
    navigate(`/decks/${deck._id}/edit`);
  };

  const handleAddCards = () => {
    navigate(`/decks/${deck._id}/cards/new`);
  };

  const handleTitleClick = () => {
    navigate(`/decks/${deck._id}`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/decks/${deck._id}`);
      setDeleteDialogOpen(false);
      if (onDelete) onDelete(deck._id);
    } catch (err) {
      console.error('Error deleting deck:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: (theme) => theme.shadows[4]
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography 
              variant="h5" 
              component="h2"
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main',
                },
                flexGrow: 1,
                mr: 2
              }}
              onClick={handleTitleClick}
            >
              {deck.name}
            </Typography>
            <Chip 
              label={`${Math.round(deck.stats?.masteryPercentage || 0)}% Mastered`}
              color={deck.stats?.masteryPercentage >= 80 ? "success" : "primary"}
              variant="outlined"
              size="small"
              icon={<School sx={{ fontSize: '16px' }} />}
            />
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Assignment sx={{ fontSize: '16px' }} />
              {deck.cards?.length || 0} Cards
            </Typography>
            {deck.stats?.averageRating > 0 && (
              <Typography color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Star sx={{ fontSize: '16px' }} />
                {deck.stats.averageRating.toFixed(1)} Avg
              </Typography>
            )}
          </Stack>

          {deck.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {deck.description}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0, gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              variant="contained" 
              color="primary" 
              onClick={handleStudy}
              startIcon={<Star />}
            >
              Study
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={handleAddCards}
              startIcon={<Add />}
            >
              Add Cards
            </Button>
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleDeleteClick}
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </CardActions>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete {deck.name}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this deck? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeckCard;
