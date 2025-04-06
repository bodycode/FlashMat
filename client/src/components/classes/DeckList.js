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
  ListItemIcon,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { Delete, Add, Check } from '@mui/icons-material';
import api from '../../services/api';

const DeckList = ({ classId, decks = [], isTeacher, onUpdate }) => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [allDecks, setAllDecks] = useState([]);
  const [selectedDecks, setSelectedDecks] = useState([]);
  const [error, setError] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);

  const fetchAvailableDecks = async () => {
    try {
      setError('');
      console.log('Fetching all decks for team assignment...');
      
      // For teachers and admins, get all decks without filtering
      const response = await api.get('/decks?includeAssigned=true&all=true');
      
      // Keep track of all decks
      setAllDecks(response.data);
      
      // Build a map of current team's decks for easy lookup
      const currentDeckIds = new Set(decks.map(d => d._id));
      
      // Mark decks that are already assigned to this team
      const markedDecks = response.data.map(deck => ({
        ...deck,
        isAssignedToTeam: currentDeckIds.has(deck._id)
      }));
      
      // Sort alphabetically by name
      markedDecks.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
      
      console.log(`Fetched ${markedDecks.length} total decks, ${currentDeckIds.size} already assigned`);
      setAvailableDecks(markedDecks);
      
      // Pre-select currently assigned decks
      setSelectedDecks(decks.map(d => d._id));
    } catch (err) {
      console.error('Failed to fetch available decks:', err);
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

  const toggleDeckSelection = (deckId) => {
    setSelectedDecks(prev => 
      prev.includes(deckId)
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    );
  };

  // Filter decks based on the toggle state
  const filteredAvailableDecks = showOnlyUnassigned
    ? availableDecks.filter(deck => !deck.isAssignedToTeam)
    : availableDecks;

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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Study Materials</DialogTitle>
        <Box sx={{ px: 3, pb: 1 }}>
          <Button
            onClick={() => setShowOnlyUnassigned(!showOnlyUnassigned)}
            color="primary"
            variant={showOnlyUnassigned ? "contained" : "outlined"}
            size="small"
            sx={{ mb: 2 }}
          >
            {showOnlyUnassigned ? "Showing Unassigned Only" : "Showing All Decks"}
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            Select decks to add to this team. All students in this team will be able to access these decks.
          </Typography>
        </Box>
        <DialogContent>
          {availableDecks.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              Loading available decks...
            </Typography>
          ) : filteredAvailableDecks.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No additional decks available
            </Typography>
          ) : (
            <List>
              {filteredAvailableDecks.map((deck) => (
                <ListItem 
                  key={deck._id} 
                  button 
                  onClick={() => toggleDeckSelection(deck._id)}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: deck.isAssignedToTeam ? 'rgba(0, 200, 83, 0.04)' : 'transparent'
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedDecks.includes(deck._id)}
                      tabIndex={-1}
                      disableRipple
                      color={deck.isAssignedToTeam ? "success" : "primary"}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {deck.name}
                        {deck.isAssignedToTeam && (
                          <Chip 
                            size="small" 
                            label="Already Assigned" 
                            color="success" 
                            icon={<Check />}
                            sx={{ ml: 1, height: 24 }}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={`${deck.cards?.length || 0} cards`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', ml: 2 }}>
            {selectedDecks.length} deck{selectedDecks.length !== 1 ? 's' : ''} selected
          </Typography>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddDecks} 
            variant="contained"
            disabled={selectedDecks.length === 0}
          >
            Update Team Materials
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeckList;
