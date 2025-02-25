import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Typography,
  Alert,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import api from '../../services/api';

const DeckList = ({ classId, decks = [], isTeacher, onUpdate }) => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedDecks, setSelectedDecks] = useState([]);
  const [error, setError] = useState('');

  const fetchAvailableDecks = async () => {
    try {
      const response = await api.get('/decks');
      const filtered = response.data.filter(
        deck => !decks.some(d => d._id === deck._id)
      );
      setAvailableDecks(filtered);
    } catch (err) {
      setError('Failed to fetch available decks');
    }
  };

  const handleOpenDialog = () => {
    fetchAvailableDecks();
    setOpenDialog(true);
  };

  const handleAddDecks = async () => {
    try {
      await api.post(`/classes/${classId}/decks`, { deckIds: selectedDecks });
      setOpenDialog(false);
      setSelectedDecks([]);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add decks');
    }
  };

  const handleRemoveDeck = async (deckId) => {
    if (window.confirm('Are you sure you want to remove this deck?')) {
      try {
        await api.delete(`/classes/${classId}/decks/${deckId}`);
        if (onUpdate) onUpdate();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to remove deck');
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
            startIcon={<Add />}
            onClick={handleOpenDialog}
          >
            Add Study Materials
          </Button>
        </Box>
      )}

      <List>
        {decks.map((deck) => (
          <ListItem key={deck._id} divider>
            <ListItemText
              primary={deck.name}
              secondary={`${deck.cards?.length || 0} cards`}
            />
            <ListItemSecondaryAction>
              {isTeacher ? (
                <IconButton 
                  edge="end" 
                  color="error"
                  onClick={() => handleRemoveDeck(deck._id)}
                >
                  <Delete />
                </IconButton>
              ) : (
                <Button 
                  size="small"
                  onClick={() => navigate(`/decks/${deck._id}/study`)}
                >
                  Study Now
                </Button>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {decks.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No study materials assigned yet
          </Typography>
        )}
      </List>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Study Materials</DialogTitle>
        <DialogContent>
          <List>
            {availableDecks.map((deck) => (
              <ListItem key={deck._id} button onClick={() => {
                setSelectedDecks(prev => 
                  prev.includes(deck._id)
                    ? prev.filter(id => id !== deck._id)
                    : [...prev, deck._id]
                );
              }}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedDecks.includes(deck._id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={deck.name}
                  secondary={`${deck.cards?.length || 0} cards`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddDecks} 
            variant="contained"
            disabled={selectedDecks.length === 0}
          >
            Add Selected
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeckList;
