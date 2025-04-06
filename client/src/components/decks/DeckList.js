import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  CircularProgress, 
  Button, 
  InputAdornment, 
  TextField, 
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Tooltip
} from '@mui/material';
import DeckCard from './DeckCard';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Add, Search, FilterList, PersonOutline, AllInclusive } from '@mui/icons-material';

const DeckList = () => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOption, setSearchOption] = useState('name');
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'mine'
  const navigate = useNavigate();

  const fetchDecks = async () => {
    setLoading(true);
    try {
      // Base query params - always include assigned decks for consistency
      let queryParams = 'includeAssigned=true&includeShared=true';
      
      // For "all" view with admin or teacher role, add all=true parameter
      if (viewMode === 'all' && (currentUser?.role === 'admin' || currentUser?.role === 'teacher')) {
        queryParams += '&all=true';
        console.log(`${currentUser?.role} user requesting ALL decks view`);
      } 
      // For "mine" view, we only need includeShared=true to get all assigned decks
      else if (viewMode === 'mine') {
        console.log(`${currentUser?.role} user requesting MY decks view`);
      }
      
      console.log(`Fetching decks with params: ${queryParams}`);
      const response = await api.get(`/decks?${queryParams}`);
      
      // Debug each deck's assigned status
      const assignmentDebug = response.data.slice(0, 3).map(deck => ({
        id: deck._id,
        name: deck.name,
        isAssigned: deck.isAssigned,
        relationship: deck.relationship,
        creator: deck.creator?.username || 'Unknown'
      }));
      
      console.log('Assignment status sample:', assignmentDebug);
      
      // Sort decks alphabetically by name
      const sortedDecks = response.data.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      });
      
      setDecks(sortedDecks);
      console.log(`Loaded ${sortedDecks.length} decks in ${viewMode} mode`);
      setError(null);
    } catch (err) {
      console.error('Error fetching decks:', err);
      setError('Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch decks when viewMode changes or currentUser is updated
  useEffect(() => {
    if (currentUser) {
      fetchDecks();
    }
  }, [viewMode, currentUser]);

  // Get current user from token
  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            _id: payload._id,
            role: payload.role,
            username: payload.username
          };
        }
      } catch (err) {
        console.warn('Could not get current user info:', err);
      }
      return null;
    };
    
    const user = getCurrentUser();
    setCurrentUser(user);
    console.log('Current user set:', user);
  }, []);

  // Handle deck deletion
  const handleDeckDelete = (deletedDeckId) => {
    setDecks(prevDecks => prevDecks.filter(deck => deck._id !== deletedDeckId));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchOptionChange = (e) => {
    setSearchOption(e.target.value);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      console.log(`View mode changed to: ${newMode}`);
    }
  };
  
  // Add this helper function for determining permission-based UI elements
  const hasAdminLikePermissions = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'teacher';
  };

  // Filter decks based on search criteria
  const filteredDecks = decks.filter(deck => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    if (searchOption === 'name') {
      return deck.name?.toLowerCase().includes(term);
    } 
    else if (searchOption === 'mastery') {
      // Handle numeric search for mastery
      const masterySearch = parseInt(term, 10);
      const deckMastery = Math.round(deck.stats?.masteryPercentage || 0);
      
      if (isNaN(masterySearch)) return false;
      
      // Support operators like >60, <40, =50
      if (term.startsWith('>')) {
        const threshold = parseInt(term.substring(1), 10);
        return !isNaN(threshold) && deckMastery > threshold;
      } else if (term.startsWith('<')) {
        const threshold = parseInt(term.substring(1), 10);
        return !isNaN(threshold) && deckMastery < threshold;
      } else if (term.startsWith('=')) {
        const threshold = parseInt(term.substring(1), 10);
        return !isNaN(threshold) && deckMastery === threshold;
      }
      
      // Default to exact match
      return deckMastery === masterySearch;
    }
    
    // Fallback for all fields
    return (
      deck.name?.toLowerCase().includes(term) ||
      (deck.stats?.masteryPercentage !== undefined && 
        deck.stats.masteryPercentage.toString().includes(term))
    );
  });

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
      <CircularProgress />
    </Box>
  );
  
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {viewMode === 'mine' ? 'My Decks' : 'All Decks'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Show toggle buttons for both admin and teacher roles */}
          {hasAdminLikePermissions() && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="deck view mode"
              size="small"
            >
              <ToggleButton value="all" aria-label="show all decks">
                <Tooltip title="Show all decks in the system">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AllInclusive fontSize="small" sx={{ mr: 0.5 }} />
                    All Decks
                  </Box>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="mine" aria-label="show only my decks">
                <Tooltip title="Show only decks you created or are assigned to you">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonOutline fontSize="small" sx={{ mr: 0.5 }} />
                    My Decks
                  </Box>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/decks/new')}
            startIcon={<Add />}
          >
            Create New Deck
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          value={searchTerm}
          onChange={handleSearchChange}
          label="Search"
          variant="outlined"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          placeholder={searchOption === 'name' ? "Search deck names..." : "Search by mastery (e.g. >50, <75, =100)"}
          size="small"
        />
        <TextField
          select
          value={searchOption}
          onChange={handleSearchOptionChange}
          label="Search by"
          variant="outlined"
          sx={{ minWidth: 150 }}
          size="small"
        >
          <MenuItem value="name">Deck Name</MenuItem>
          <MenuItem value="mastery">Mastery %</MenuItem>
        </TextField>
      </Box>

      {filteredDecks.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {viewMode === 'mine' 
              ? "You haven't created any decks yet." 
              : "No decks match your search criteria."}
          </Typography>
          {viewMode === 'mine' && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/decks/new')}
              startIcon={<Add />}
              sx={{ mt: 2 }}
            >
              Create Your First Deck
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredDecks.map((deck) => (
            <Grid item xs={12} sm={6} md={4} key={deck._id}>
              <DeckCard 
                deck={{
                  ...deck,
                  stats: {
                    ...deck.stats,
                    masteryPercentage: deck.stats?.masteryPercentage ?? 0
                  }
                }} 
                onDelete={handleDeckDelete}
                currentUser={currentUser}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default DeckList;
