import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  LinearProgress, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import { 
  MoreVert, 
  Delete, 
  Edit, 
  School, 
  ContentCopy, 
  Assessment,
  Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DeckCard = ({ deck, onDelete, currentUser }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  
  const masteryPercentage = deck.stats?.masteryPercentage ?? 0;
  
  console.log('DeckCard stats:', {
    deckName: deck.name,
    masteryPercentage,
    stats: deck.stats,
    lastStudied: deck.stats?.lastStudied ? new Date(deck.stats.lastStudied).toLocaleDateString() : 'Never'
  });

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    setAnchorEl(null);
    setShowDeleteDialog(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/decks/${deck._id}`);
      onDelete(deck._id);
    } catch (error) {
      console.error('Failed to delete deck:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getMasteryColor = (percentage) => {
    if (percentage >= 80) return 'success.main';
    if (percentage >= 50) return 'primary.main';
    if (percentage >= 25) return 'info.main';
    return 'warning.main';
  };

  // IMPORTANT FIX: More reliable assignment check that considers relationship field
  // This is critical because the assignment can be stored in different ways
  const isAssigned = deck.isAssigned === true || deck.relationship === 'assigned' || 
                    deck.isTeamAssigned === true || deck.isDirectlyAssigned === true;

  // More reliable creator check by comparing IDs
  const isCreator = deck.creator && 
    ((deck.creator._id && deck.creator._id.toString() === currentUser?._id) || 
     deck.isCreator === true);
     
  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';
  
  // Teacher assigned to a deck gets edit privileges
  const teacherCanEdit = isTeacher && isAssigned;
  
  // Debug assignment status to verify fix
  console.log('DeckCard assignment status (FIXED):', {
    deckName: deck.name,
    deckId: deck._id,
    isAssigned, // Updated calculation
    assignedFromProp: deck.isAssigned, // Direct flag
    relationship: deck.relationship, // From server relationship field
    isTeamAssigned: deck.isTeamAssigned, // From server
    isDirectlyAssigned: deck.isDirectlyAssigned, // From server
    isCreator,
    creatorId: deck.creator?._id,
    userId: currentUser?._id
  });
  
  // Update permissions based on accurate assignment status
  const canEdit = isAdmin || isCreator || teacherCanEdit;
  const canDelete = isAdmin || isCreator || teacherCanEdit;
  const canStudy = isAdmin || isCreator || isAssigned;
  
  console.log('DeckCard permissions:', {
    deckName: deck.name,
    isAdmin,
    isTeacher,
    isCreator,
    isAssigned,
    teacherCanEdit,
    canEdit,
    canDelete,
    canStudy
  });
  
  console.log('DeckCard delete permission check:', {
    deckName: deck.name,
    isAdmin,
    isCreator,
    creatorId: deck.creator?._id,
    currentUserId: currentUser?._id,
    deletePermission: canDelete,
    creatorMatch: deck.creator && deck.creator._id === currentUser?._id,
    creatorToString: deck.creator?._id?.toString(),
    currentUserIdToString: currentUser?._id?.toString()
  });
  
  const hasBeenStudied = masteryPercentage > 0 || (deck.stats?.lastStudied !== null && deck.stats?.lastStudied !== undefined);
  
  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: 2,
          '&:hover': {
            boxShadow: 6,
            transform: 'translateY(-4px)',
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out'
          },
          position: 'relative'
        }}
      >
        <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1 }}>
          {isCreator && (
            <Tooltip title="You created this deck">
              <Chip 
                label="Creator" 
                size="small" 
                color="primary"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            </Tooltip>
          )}
          
          {isAssigned && !isCreator && (
            <Tooltip title="This deck is assigned to you">
              <Chip 
                label="Assigned" 
                size="small"
                color="secondary" 
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            </Tooltip>
          )}
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {deck.name}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              minHeight: 40,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 1
            }}
          >
            {deck.description || 'No description provided'}
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {hasBeenStudied ? 
                `${Math.round(masteryPercentage)}% Mastered` : 
                'Not studied yet'}
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={masteryPercentage}
              sx={{ 
                width: '50%', 
                height: 8, 
                borderRadius: 5,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getMasteryColor(masteryPercentage)
                }
              }} 
            />
          </Box>
          
          {deck.stats?.lastStudied && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Last studied: {new Date(deck.stats.lastStudied).toLocaleDateString()}
            </Typography>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">
              {deck.cards?.length || 0} cards
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              By {deck.creator?.username || 'Unknown'}
            </Typography>
          </Box>
        </CardContent>
        
        <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
          <Tooltip
            title={isTeacher && !canStudy ? "You are not assigned to this deck" : ""}
            placement="top"
          >
            <span>
              <Button 
                size="small" 
                variant="contained" 
                onClick={() => navigate(`/decks/${deck._id}/study`)}
                startIcon={<School />}
                disabled={isTeacher && !canStudy}
              >
                Study
              </Button>
            </span>
          </Tooltip>
          
          <Button 
            size="small"
            variant="outlined"
            onClick={() => navigate(`/decks/${deck._id}`)}
          >
            View Cards
          </Button>
          
          <IconButton 
            aria-label="more options" 
            size="small"
            onClick={handleMenuClick}
          >
            <MoreVert />
          </IconButton>
        </CardActions>
      </Card>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            navigate(`/decks/${deck._id}`);
          }}
        >
          <School fontSize="small" sx={{ mr: 1 }} />
          View Cards
        </MenuItem>
        
        {canEdit && (
          <MenuItem 
            onClick={() => {
              handleMenuClose();
              navigate(`/decks/${deck._id}/edit`);
            }}
          >
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit Deck
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            navigate(`/decks/${deck._id}/stats`);
          }}
        >
          <Assessment fontSize="small" sx={{ mr: 1 }} />
          View Stats
        </MenuItem>
        
        {canEdit && (
          <MenuItem 
            onClick={() => {
              handleMenuClose();
              navigate(`/decks/${deck._id}/cards/new`);
            }}
          >
            <Add fontSize="small" sx={{ mr: 1 }} />
            Add Card
          </MenuItem>
        )}
        
        {canDelete && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Deck
          </MenuItem>
        )}
      </Menu>
      
      <Dialog
        open={showDeleteDialog}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Deck</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deck.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeckCard;
