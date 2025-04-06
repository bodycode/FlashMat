import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, 
  Avatar, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, Box, Autocomplete, Chip, InputAdornment, Tooltip, CircularProgress
} from '@mui/material';
import { Delete, Edit, Search } from '@mui/icons-material';
import api from '../../services/api';

// Clean implementation of UserTable component
const UserTable = ({ users, onUserUpdated, currentUser: propCurrentUser }) => {
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    role: ''
  });
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [allDecks, setAllDecks] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedDecks, setSelectedDecks] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOption, setSearchOption] = useState('all');

  useEffect(() => {
    // Get current user ID from localStorage or JWT token
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Extract user ID from JWT token
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload._id; // Assuming the JWT payload contains _id
        }
      } catch (err) {
        console.warn('Could not get current user ID from token', err);
      }
      return null;
    };

    setCurrentUser(getCurrentUser());
  }, []);

  // Fix the fetchOptions function
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        console.log('Fetching teams and decks for options...');
        
        // Fetch all teams
        const teamsResponse = await api.get('/classes');
        if (teamsResponse.data && teamsResponse.data.length > 0) {
          console.log(`Successfully fetched ${teamsResponse.data.length} teams for options`);
          setAllTeams(teamsResponse.data);
        } else {
          console.warn('No teams found in the system');
          setAllTeams([]);
        }
        
        // Fetch all decks - use admin endpoint to get ALL decks
        console.log('Fetching all decks in the system...');
        const decksResponse = await api.get('/decks?all=true&includeShared=true');
        
        if (decksResponse.data && decksResponse.data.length > 0) {
          console.log(`Successfully fetched ${decksResponse.data.length} decks:`, 
            decksResponse.data.slice(0, 3).map(d => d.name)
          );
          setAllDecks(decksResponse.data);
        } else {
          console.warn('No decks returned from API:', decksResponse);
          setAllDecks([]);
        }
      } catch (err) {
        console.error('Error fetching teams and decks:', err);
        setError('Failed to load teams and decks');
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, []);

  // Clean implementation of handleEditClick
  const handleEditClick = async (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || '',
      email: user.email || '',
      role: user.role || ''
    });
    
    // Clear selections and set loading state
    setSelectedTeams([]);
    setSelectedDecks([]);
    setLoadingOptions(true);
    setError('');
    
    try {
      console.log(`Fetching details for user ${user.username} (${user._id})`);
      
      // Fetch the user's complete data with populated relationships
      const userResponse = await api.get(`/users/${user._id}`);
      const userData = userResponse.data;
      
      console.log('User data loaded:', {
        username: userData.username,
        teamsCount: userData.classes?.length || 0,
        decksCount: userData.decks?.length || 0
      });
      
      // First, make sure our global options are loaded properly
      if (allTeams.length === 0) {
        console.log('No teams loaded yet, fetching them now...');
        const teamsResponse = await api.get('/classes');
        setAllTeams(teamsResponse.data || []);
      }
      
      if (allDecks.length === 0) {
        console.log('No decks loaded yet, fetching them now...');
        const decksResponse = await api.get('/decks?all=true&includeShared=true');
        setAllDecks(decksResponse.data || []);
      }
      
      // Handle team selection
      if (userData.classes && userData.classes.length > 0) {
        // If the response has populated team objects, use them directly
        if (typeof userData.classes[0] === 'object' && userData.classes[0].name) {
          console.log('Using populated team objects:', userData.classes.map(t => t.name));
          setSelectedTeams(userData.classes);
        } else {
          // Otherwise, we need to get the full team objects
          const teamIds = userData.classes.map(id => id.toString());
          console.log('Looking up team objects for IDs:', teamIds);
          
          // Try to match with our cached teams
          const matchingTeams = allTeams.filter(team => 
            teamIds.includes(team._id?.toString())
          );
          
          if (matchingTeams.length > 0) {
            console.log('Found matching teams in cache:', matchingTeams.map(t => t.name));
            setSelectedTeams(matchingTeams);
          } else {
            // Fetch teams individually if not in cache
            console.log('Teams not found in cache, fetching individually...');
            const fetchedTeams = [];
            
            for (const teamId of teamIds) {
              try {
                const teamResponse = await api.get(`/classes/${teamId}`);
                if (teamResponse.data) {
                  fetchedTeams.push(teamResponse.data);
                }
              } catch (err) {
                console.warn(`Could not fetch team ${teamId}:`, err);
              }
            }
            
            console.log(`Successfully fetched ${fetchedTeams.length} teams individually`);
            setSelectedTeams(fetchedTeams);
          }
        }
      } else {
        console.log('User has no assigned teams');
        setSelectedTeams([]);
      }
      
      // Handle deck selection
      if (userData.decks && userData.decks.length > 0) {
        // If the response has populated deck objects, use them directly
        if (typeof userData.decks[0] === 'object' && userData.decks[0].name) {
          console.log('Using populated deck objects:', userData.decks.map(d => d.name));
          setSelectedDecks(userData.decks);
        } else {
          // Otherwise, we need to get the full deck objects
          const deckIds = userData.decks.map(id => id.toString());
          console.log('Looking up deck objects for IDs:', deckIds);
          
          // Get decks from the API
          try {
            // First try to get them all at once using a filter
            console.log('Fetching decks for user by IDs...');
            const userDecksResponse = await api.get(`/decks?user=${user._id}&includeAssigned=true`);
            
            if (userDecksResponse.data && userDecksResponse.data.length > 0) {
              console.log('Got deck data from API:', userDecksResponse.data.map(d => d.name));
              setSelectedDecks(userDecksResponse.data);
            } else {
              console.warn('No decks returned from API for user');
              setSelectedDecks([]);
            }
          } catch (err) {
            console.error('Failed to load user decks:', err);
            setSelectedDecks([]);
          }
        }
      } else {
        console.log('User has no assigned decks');
        setSelectedDecks([]);
      }
    } catch (err) {
      console.error('Error loading user data for edit:', err);
      setError('Failed to load user data');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Rest of the existing functions...
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  const handleTeamsChange = (event, newTeams) => {
    setSelectedTeams(newTeams);
  };

  const handleDecksChange = (event, newDecks) => {
    setSelectedDecks(newDecks);
  };

  // Fix the handleSaveEdit function to correctly update deck counts after saving

const handleSaveEdit = async () => {
  try {
    setLoading(true);
    setError(''); // Clear any previous errors
    
    // Extract IDs for the API
    const teamIds = selectedTeams.map(team => team._id);
    const deckIds = selectedDecks.map(deck => deck._id);
    
    console.log('Saving user with teams and decks:', {
      username: editFormData.username,
      teamCount: teamIds.length,
      deckCount: deckIds.length
    });
    
    // Close the dialog immediately for better UX
    setEditingUser(null);
    
    // Send the update
    const response = await api.put(`/users/${editingUser._id}`, {
      ...editFormData,
      classes: teamIds,
      decks: deckIds
    });
    
    // Use the response data directly since our backend now includes all updated information
    let updatedUser = response.data;
    
    console.log('Server returned updated user:', {
      id: updatedUser._id,
      username: updatedUser.username,
      teamCount: updatedUser.teamCount,
      deckCount: updatedUser.deckCount,
      directlyAssignedDecks: updatedUser.assignedDeckCount || 0,
      teamAssignedDecks: updatedUser.teamDeckCount || 0,
      createdDecks: updatedUser.createdDeckCount || 0
    });
    
    // Make sure masteryPercentage is included
    if (updatedUser.masteryPercentage === undefined) {
      try {
        const progressResponse = await api.get(`/users/${updatedUser._id}/progress`);
        updatedUser.masteryPercentage = progressResponse.data?.averageMastery || 0;
      } catch (progressErr) {
        console.warn('Could not fetch updated progress data:', progressErr);
        updatedUser.masteryPercentage = editingUser.masteryPercentage || 0;
      }
    }
    
    // Now update the parent component with accurate data
    if (onUserUpdated) {
      onUserUpdated(updatedUser);
    }
    
  } catch (err) {
    console.error('Error updating user:', err);
    setError(err.response?.data?.message || 'Failed to update user');
    
    // If there's an error, reopen the dialog
    handleEditClick(editingUser);
  } finally {
    setLoading(false);
  }
};

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setUserToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/users/${userToDelete._id}`);
      
      // Fix the typo: onUserToDelete should be onUserUpdated
      if (onUserUpdated) {
        onUserUpdated(null, userToDelete._id);
      }
      
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const getAvatarColor = (username) => {
    // Add defensive check to prevent errors when username is undefined
    if (!username) return '#888'; // Default gray color for missing usernames
    
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
      '#FF5722', '#795548', '#9E9E9E', '#607D8B'
    ];
    
    // Simple hash function to get a consistent color for each username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to a color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getInitials = (username) => {
    // Add defensive check to prevent errors when username is undefined
    if (!username) return '?';
    
    const words = username.split(' ');
    return words.map(word => word.charAt(0).toUpperCase()).join('');
  };

  const getMasteryColor = (percentage) => {
    if (!percentage || percentage === 0) return 'text.secondary';
    if (percentage >= 80) return 'success.main';
    if (percentage >= 50) return 'info.main';
    return 'warning.main';
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchOptionChange = (e) => {
    setSearchOption(e.target.value);
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    switch (searchOption) {
      case 'username':
        return user.username?.toLowerCase().includes(term);
        
      case 'email':
        return user.email?.toLowerCase().includes(term);
        
      case 'role':
        return user.role?.toLowerCase().includes(term);
        
      case 'mastery':
        // Handle numeric search for mastery
        const masterySearch = parseInt(term, 10);
        const userMastery = Math.round(user.masteryPercentage);
        
        if (isNaN(masterySearch)) return false;
        
        // Support operators like >60, <40, =50
        if (term.startsWith('>')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && userMastery > threshold;
        } else if (term.startsWith('<')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && userMastery < threshold;
        } else if (term.startsWith('=')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && userMastery === threshold;
        }
        
        // Default to exact match
        return userMastery === masterySearch;
        
      case 'all':
      default:
        return (
          user.username?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.role?.toLowerCase().includes(term) ||
          (user.masteryPercentage !== undefined && 
            user.masteryPercentage.toString().includes(term))
        );
    }
  });

  // Update the canDeleteUser function to properly check roles
  const canDeleteUser = (currentUser, userToDelete) => {
    // If no current user is provided, don't allow deletion
    if (!currentUser) return false;
    
    // Debug output to see what values we're working with
    console.log('Delete permission check:', {
      currentUserRole: currentUser.role,
      userToDeleteRole: userToDelete.role,
      currentUserId: currentUser._id,
      userToDeleteId: userToDelete._id
    });
    
    // If current user is admin, they can delete anyone
    if (currentUser.role === 'admin') {
      return true;
    }
    
    // If current user is teacher, they can delete students but not other teachers or admins
    if (currentUser.role === 'teacher') {
      return userToDelete.role === 'student';
    }
    
    // Any other role cannot delete users
    return false;
  };

  // Add a canEditUser helper function similar to canDeleteUser
  const canEditUser = (currentUser, userToEdit) => {
    // If no current user is provided, don't allow editing
    if (!currentUser) return false;
    
    // Debug output
    console.log('Edit permission check:', {
      currentUserRole: currentUser.role,
      userToEditRole: userToEdit.role,
      currentUserId: currentUser._id,
      userToEditId: userToEdit._id
    });
    
    // If current user is admin, they can edit anyone
    if (currentUser.role === 'admin') {
      return true;
    }
    
    // If current user is teacher, they can edit students but not other teachers or admins
    if (currentUser.role === 'teacher') {
      return userToEdit.role === 'student';
    }
    
    // Any other role cannot edit users
    return false;
  };

  // Ensure we're passing the current user prop to UserTable and using it correctly
  useEffect(() => {
    // Get the current user from auth context or props
    const fetchCurrentUser = async () => {
      try {
        // First check if we already have the current user from props
        if (propCurrentUser) {
          setCurrentUser(propCurrentUser);
          return;
        }
        
        // Otherwise fetch from profile endpoint
        const response = await api.get('/users/profile');
        setCurrentUser(response.data);
        console.log('Current user fetched:', response.data);
      } catch (err) {
        console.warn('Could not get current user details', err);
      }
    };

    fetchCurrentUser();
  }, [propCurrentUser]); // Update dependency to use propCurrentUser

  if (loading) {
    return <Typography>Loading users...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  // The render method with the JSX
  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
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
          placeholder="Search users..."
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
          <MenuItem value="all">All Fields</MenuItem>
          <MenuItem value="username">Username</MenuItem>
          <MenuItem value="email">Email</MenuItem>
          <MenuItem value="role">Role</MenuItem>
          <MenuItem value="mastery">Mastery %</MenuItem>
        </TextField>
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="center">Teams</TableCell>
              <TableCell align="center">Decks</TableCell>
              <TableCell align="center">Mastery</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user._id}>
                <TableCell component="th" scope="row">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: getAvatarColor(user.username),
                        width: 35,
                        height: 35
                      }}
                    >
                      {getInitials(user.username)}
                    </Avatar>
                    <Typography>{user.username}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Typography
                    sx={{
                      textTransform: 'capitalize',
                      color: user.role === 'admin' ? 'secondary.main' : 'text.primary',
                      fontWeight: user.role === 'admin' ? 'bold' : 'normal'
                    }}
                  >
                    {user.role || 'student'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {user.teamCount || 0}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" sx={{ 
                    fontWeight: 'medium',
                    color: user.deckCount >= 2 ? 'success.main' : 'text.primary'
                  }}>
                    {user.deckCount || 0}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" sx={{ 
                    fontWeight: 'medium',
                    color: getMasteryColor(user.masteryPercentage)
                  }}>
                    {user.masteryPercentage > 0 
                      ? `${Math.round(user.masteryPercentage)}%` 
                      : 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    {/* Conditional Edit button - ghosted for admins when viewed by teachers */}
                    {canEditUser(currentUser, user) ? (
                      <Button 
                        onClick={() => handleEditClick(user)}
                        variant="outlined" 
                        size="small"
                        startIcon={<Edit />}
                      >
                        Edit
                      </Button>
                    ) : (
                      <Tooltip title="Admin permission only" placement="top" arrow>
                        <span>
                          <Button 
                            variant="outlined" 
                            size="small"
                            startIcon={<Edit />}
                            disabled
                            sx={{ 
                              opacity: 0.5,
                              cursor: 'not-allowed'
                            }}
                          >
                            Edit
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    
                    {/* Conditional Delete button - active for students, ghosted for admins */}
                    {user.role === 'student' || currentUser?.role === 'admin' ? (
                      <Button 
                        onClick={() => handleDeleteClick(user)}
                        variant="outlined" 
                        color="error"
                        size="small"
                        startIcon={<Delete />}
                        disabled={user._id === currentUser?._id} // Prevent self-deletion
                      >
                        Delete
                      </Button>
                    ) : (
                      <Tooltip title="Admin permission only" placement="top" arrow>
                        <span>
                          <Button 
                            variant="outlined" 
                            color="error"
                            size="small"
                            startIcon={<Delete />}
                            disabled
                            sx={{ 
                              opacity: 0.5,
                              cursor: 'not-allowed'
                            }}
                          >
                            Delete
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No users match your search criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit User Dialog */}
      <Dialog 
        open={!!editingUser} 
        onClose={() => setEditingUser(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Edit User: {editingUser?.username}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="username"
            label="Username"
            type="text"
            fullWidth
            value={editFormData.username}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={editFormData.email}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            name="role"
            label="Role"
            fullWidth
            value={editFormData.role}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          
          {/* Teams selection */}
          <Autocomplete
            multiple
            options={allTeams || []}
            getOptionLabel={(team) => team?.name || 'Unnamed team'}
            isOptionEqualToValue={(option, value) => 
              option._id === value._id || option._id?.toString() === value._id?.toString()
            }
            value={selectedTeams || []}
            onChange={handleTeamsChange}
            loading={loadingOptions}
            loadingText="Loading teams..."
            noOptionsText={loadingOptions ? "Loading..." : "No teams available"}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assigned Teams"
                margin="dense"
                fullWidth
                error={allTeams.length === 0 && !loadingOptions}
                helperText={loadingOptions ? "Loading teams..." : 
                  allTeams.length === 0 ? "No teams available in the system" : ""}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                {option.name || `Team ${option._id}`}
              </li>
            )}
            sx={{ mb: 2 }}
          />
          
          {/* Decks selection */}
          <Autocomplete
            multiple
            options={allDecks || []}
            getOptionLabel={(deck) => deck?.name || 'Unnamed deck'}
            isOptionEqualToValue={(option, value) => 
              option._id === value._id || option._id?.toString() === value._id?.toString()
            }
            value={selectedDecks || []}
            onChange={handleDecksChange}
            loading={loadingOptions}
            loadingText="Loading decks..."
            noOptionsText={loadingOptions ? "Loading..." : "No decks available"}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assigned Decks"
                margin="dense"
                fullWidth
                error={allDecks.length === 0 && !loadingOptions}
                helperText={loadingOptions ? "Loading decks..." : 
                  allDecks.length === 0 ? "No decks available in the system" : ""}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                {option.name || `Deck ${option._id}`}
              </li>
            )}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>
          Delete User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained" 
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

export default UserTable;
