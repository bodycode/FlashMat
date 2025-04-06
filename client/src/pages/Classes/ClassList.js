import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Container // Add this import
} from '@mui/material';
import { 
  Add, 
  School, 
  Search, 
  Edit, 
  Delete,
  Group,
  MenuBook
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const ClassList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOption, setSearchOption] = useState('name');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Add sorting state variables
  const [sortBy, setSortBy] = useState('name');  // Default sort by name
  const [sortDirection, setSortDirection] = useState('asc');  // Default ascending

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // Add debug logging
        console.log('ClassList - Current user:', {
          id: user?._id,
          username: user?.username,
          role: user?.role
        });
        
        console.log('Fetching classes for user:', user?._id);
        const response = await api.get('/classes');
        
        console.log('ClassList - API response:', {
          status: response.status,
          classCount: response.data.length,
          classes: response.data.map(c => ({
            id: c._id,
            name: c.name,
            isTeacher: c.teacher?._id === user?._id,
            isStudent: c.students?.some(s => 
              (typeof s === 'object' ? s._id : s) === user?._id
            ),
            studentCount: c.students?.length || 0
          }))
        });
        
        // Filter out any classes with null teachers
        const validClasses = response.data.filter(c => c.teacher);
        
        // Enhance classes with progress data
        const enhancedClasses = await Promise.all(validClasses.map(async (team) => {
          // Get student count
          const memberCount = team.students?.length || 0;
          
          // Get deck count
          const deckCount = team.decks?.length || 0;
          
          // Get team mastery by calculating avg of all students' progress
          let teamMastery = 0;
          try {
            // If we have students, calculate their average progress
            if (memberCount > 0 && deckCount > 0) {
              // Get progress for each student - make sure to extract the ID properly
              const studentProgress = await Promise.all(
                team.students.map(async (student) => {
                  try {
                    // Extract the ID properly - could be an object or string
                    const studentId = typeof student === 'object' ? student._id : student;
                    
                    // Log for debugging
                    console.log(`Fetching progress for student ID: ${studentId}`);
                    
                    const progressRes = await api.get(`/users/${studentId}/progress`);
                    return progressRes.data.averageMastery || 0;
                  } catch (err) {
                    console.warn(`Error getting progress for student:`, err);
                    return 0;
                  }
                })
              );
              
              // Calculate average of all students
              const totalMastery = studentProgress.reduce((sum, val) => sum + val, 0);
              teamMastery = memberCount > 0 ? totalMastery / memberCount : 0;
            }
          } catch (err) {
            console.warn(`Error calculating team mastery for ${team.name}:`, err);
          }
          
          return {
            ...team,
            memberCount,
            deckCount,
            teamMastery
          };
        }));
        
        setClasses(enhancedClasses);
        console.log('Enhanced classes data:', enhancedClasses);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchClasses();
    } else {
      setLoading(false);
    }
  }, [user?._id]);
  
  // Handle search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchOptionChange = (e) => {
    setSearchOption(e.target.value);
  };
  
  // Filter classes based on search criteria
  const filteredClasses = classes.filter(team => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    switch (searchOption) {
      case 'name':
        return team.name?.toLowerCase().includes(term);
      
      case 'members':
        // Search by member count
        const memberCountSearch = parseInt(term, 10);
        if (isNaN(memberCountSearch)) return false;
        
        // Support operators like >5, <10, =7
        if (term.startsWith('>')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && team.memberCount > threshold;
        } else if (term.startsWith('<')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && team.memberCount < threshold;
        } else if (term.startsWith('=')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && team.memberCount === threshold;
        }
        
        return team.memberCount === memberCountSearch;
      
      case 'decks':
        // Search by deck count
        const deckCountSearch = parseInt(term, 10);
        if (isNaN(deckCountSearch)) return false;
        
        // Support operators like >5, <10, =7
        if (term.startsWith('>')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && team.deckCount > threshold;
        } else if (term.startsWith('<')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && team.deckCount < threshold;
        } else if (term.startsWith('=')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && team.deckCount === threshold;
        }
        
        return team.deckCount === deckCountSearch;
      
      case 'mastery':
        // Search by mastery percentage
        const masterySearch = parseInt(term, 10);
        const teamMastery = Math.round(team.teamMastery || 0);
        
        if (isNaN(masterySearch)) return false;
        
        // Support operators like >60, <40, =50
        if (term.startsWith('>')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && teamMastery > threshold;
        } else if (term.startsWith('<')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && teamMastery < threshold;
        } else if (term.startsWith('=')) {
          const threshold = parseInt(term.substring(1), 10);
          return !isNaN(threshold) && teamMastery === threshold;
        }
        
        return teamMastery === masterySearch;
      
      case 'all':
      default:
        return (
          team.name?.toLowerCase().includes(term) || 
          team.memberCount?.toString().includes(term) ||
          team.deckCount?.toString().includes(term) ||
          (team.teamMastery !== undefined && team.teamMastery.toString().includes(term))
        );
    }
  });

  // Add sorting logic before rendering the filtered classes
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    // Determine which values to compare based on sortBy
    let valueA, valueB;
    
    switch (sortBy) {
      case 'name':
        valueA = a.name?.toLowerCase() || '';
        valueB = b.name?.toLowerCase() || '';
        break;
      case 'members':
        valueA = a.memberCount || 0;
        valueB = b.memberCount || 0;
        break;
      case 'decks':
        valueA = a.deckCount || 0;
        valueB = b.deckCount || 0;
        break;
      case 'mastery':
        valueA = a.teamMastery || 0;
        valueB = b.teamMastery || 0;
        break;
      default:
        valueA = a.name?.toLowerCase() || '';
        valueB = b.name?.toLowerCase() || '';
    }
    
    // Sort based on direction
    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });

  // Add sort handler function
  const handleSort = (column) => {
    // If clicking the same column, toggle direction
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new column, set it as sort column and default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Add sort direction indicator component
  const SortIndicator = ({ active, direction }) => {
    if (!active) return null;
    
    return (
      <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
        {direction === 'asc' ? '↑' : '↓'}
      </Box>
    );
  };
  
  // Get creator name for a team
  const getCreatorName = (team) => {
    return team.teacher?.username || 'Unknown';
  };
  
  // Get color for mastery display
  const getMasteryColor = (percentage) => {
    if (!percentage || percentage === 0) return 'text.secondary';
    if (percentage >= 80) return 'success.main';
    if (percentage >= 50) return 'info.main';
    return 'warning.main';
  };
  
  // Get avatar color based on team name
  const getTeamColor = (name) => {
    if (!name) return '#888'; // Default color
    
    const colors = [
      '#3f51b5', '#f44336', '#009688', '#4caf50', '#ff9800',
      '#9c27b0', '#2196f3', '#ffeb3b', '#03a9f4', '#e91e63'
    ];
    
    // Simple hash function for name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Get team initials for avatar
  const getTeamInitials = (name) => {
    if (!name) return '?';
    
    const words = name.split(' ');
    return words.map(word => word.charAt(0).toUpperCase()).join('');
  };
  
  // Handle delete team
  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        await api.delete(`/classes/${teamId}`);
        setClasses(classes.filter(c => c._id !== teamId));
      } catch (err) {
        console.error('Error deleting team:', err);
        setError('Failed to delete team');
      }
    }
  };

  // Add visual distinction for teams the admin is not a member of

  // Add a function to check if user is part of the team
  const isUserMemberOfTeam = (team, userId) => {
    // Check if user is the teacher/creator
    if (team.teacher && team.teacher._id === userId) {
      return true;
    }
    
    // Check if user is a student in the team
    if (team.students && team.students.length > 0) {
      // Students might be full objects or just IDs
      return team.students.some(student => 
        (typeof student === 'object' ? student._id : student) === userId
      );
    }
    
    return false;
  };

  // Remove the debug information showing edit permission status

  // Replace the renderDebugInfo function with a simplified version that doesn't show edit permissions
  const renderDebugInfo = (team) => {
    // Return null to completely hide the debug info
    return null;
    
    /* Alternatively, if you want to keep minimal debug info for admins only:
    if (user?.role !== 'admin') return null;
    
    return (
      <Box sx={{ mt: 1, fontSize: '10px', color: 'text.disabled' }}>
        <Typography variant="caption" color="text.secondary">
          ID: {team._id.substring(0,8)}
        </Typography>
      </Box>
    );
    */
  };

  // Fix the isTeacherOfTeam function to correctly check if user is assigned to team

  // Update the check for whether a teacher can access a team
  const isTeacherOfTeam = (team, userId) => {
    // If user is the creator/teacher of the team
    const userIdStr = userId?.toString();
    const teacherIdStr = team.teacher && team.teacher._id 
      ? team.teacher._id.toString() 
      : (team.teacher?.toString() || '');
    
    const isTeamCreator = teacherIdStr === userIdStr;
    
    // Check if the teacher is a member (student) of the team
    const isMember = team.students && team.students.length > 0 && 
      team.students.some(student => {
        const studentIdStr = typeof student === 'object' ? student._id?.toString() : student?.toString();
        return studentIdStr === userIdStr;
      });
    
    // Log detailed check for debugging
    console.log('Team access check for teacher:', {
      teamName: team.name,
      userId: userIdStr,
      teacherId: teacherIdStr,
      isTeamCreator,
      isMember,
      canAccess: isTeamCreator || isMember
    });
    
    // Allow access if the teacher created the team OR is a member of it
    return isTeamCreator || isMember;
  };

  // Update the ClassList component to show all teams for teachers with appropriate UI

  // First, enhance the team UI to distinguish which teams the teacher is part of
  const getTeamAccessUI = (team, userId) => {
    // Check if the user is part of this team
    const isCreator = team.teacher?._id === userId;
    
    // Check if the user is part of this team 
    const isMember = isTeacherOfTeam(team, userId);
    
    // No special UI needed for teams the user is part of
    if (isMember || isCreator) {
      return null;
    }
    
    // Return UI element for teams the user is not part of (teacher-specific)
    return (
      <Typography 
        component="span" 
        sx={{ 
          fontSize: '0.7rem',
          ml: 1,
          px: 0.7,
          py: 0.2,
          borderRadius: 1,
          bgcolor: 'action.hover',
          color: 'text.secondary'
        }}
      >
        not assigned
      </Typography>
    );
  };

  if (loading) return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '80vh' 
    }}>
      <CircularProgress />
    </Box>
  );

  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School /> Teams
        </Typography>
        
        {/* Modified button section - disable Create Team button for teachers */}
        {user?.role === 'admin' ? (
          // Admin can fully create teams
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => navigate('/classes/new')}
          >
            Create Team
          </Button>
        ) : user?.role === 'teacher' ? (
          // Teacher sees disabled button with tooltip
          <Tooltip title="Admin permission only" placement="left" arrow>
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                disabled
                sx={{ 
                  opacity: 0.6,
                  cursor: 'not-allowed',
                  '&:hover': {
                    opacity: 0.7,
                  }
                }}
              >
                Create Team
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Box>
      
      {/* Search Bar */}
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
          placeholder={searchOption === 'mastery' ? "Search by mastery (e.g. >50, <75, =100)" : "Search teams..."}
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
          <MenuItem value="name">Team Name</MenuItem>
          <MenuItem value="members">Member Count</MenuItem>
          <MenuItem value="decks">Deck Count</MenuItem>
          <MenuItem value="mastery">Team Mastery %</MenuItem>
        </TextField>
      </Box>

      {/* Teams Table */}
      <TableContainer component={Paper} sx={{ maxWidth: 'lg', mx: 'auto' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell 
                onClick={() => handleSort('name')}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                Team Name
                <SortIndicator active={sortBy === 'name'} direction={sortDirection} />
              </TableCell>
              <TableCell 
                align="center" 
                onClick={() => handleSort('members')}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                Members
                <SortIndicator active={sortBy === 'members'} direction={sortDirection} />
              </TableCell>
              <TableCell 
                align="center" 
                onClick={() => handleSort('decks')}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                Decks
                <SortIndicator active={sortBy === 'decks'} direction={sortDirection} />
              </TableCell>
              <TableCell 
                align="center" 
                onClick={() => handleSort('mastery')}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                Mastery
                <SortIndicator active={sortBy === 'mastery'} direction={sortDirection} />
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedClasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No teams match your search criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedClasses.map((team) => (
                <TableRow 
                  key={team._id}
                  // Apply a muted/ghosted style for teams the admin is not a member of
                  sx={
                    user?.role === 'admin' && !isUserMemberOfTeam(team, user._id)
                      ? { 
                          opacity: 0.7, 
                          bgcolor: 'rgba(0, 0, 0, 0.03)',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.06)',
                          }
                        } 
                      : {}
                  }
                >
                  {/* Team name cell */}
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: getTeamColor(team.name),
                          width: 35,
                          height: 35,
                          // Add a border for non-member teams (admin only)
                          ...(user?.role === 'admin' && !isUserMemberOfTeam(team, user._id) && {
                            border: '2px dashed rgba(0, 0, 0, 0.25)',
                          })
                        }}
                      >
                        {getTeamInitials(team.name)}
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="body1"
                          // Add subtle styling for non-member teams (admin only)
                          sx={
                            user?.role === 'admin' && !isUserMemberOfTeam(team, user._id)
                              ? { fontStyle: 'italic' }
                              : {}
                          }
                        >
                          {team.name}
                          {/* Add a "Not Member" chip for admins viewing non-member teams */}
                          {user?.role === 'admin' && !isUserMemberOfTeam(team, user._id) && (
                            <Typography 
                              component="span" 
                              sx={{ 
                                fontSize: '0.7rem',
                                ml: 1,
                                px: 0.7,
                                py: 0.2,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                                color: 'text.secondary'
                              }}
                            >
                              not member
                            </Typography>
                          )}
                          {/* Add "not assigned" tag for teams the teacher is not part of */}
                          {user?.role === 'teacher' && getTeamAccessUI(team, user?._id)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Creator: {getCreatorName(team)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body1" fontWeight="medium">
                      {team.memberCount || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body1" fontWeight="medium">
                      {team.deckCount || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ 
                      fontWeight: 'medium',
                      color: getMasteryColor(team.teamMastery)
                    }}>
                      {team.teamMastery > 0 
                        ? `${Math.round(team.teamMastery)}%` 
                        : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {/* VIEW BUTTON - Regular for admins, ghosted for unassigned teachers */}
                      {user?.role === 'admin' || isTeacherOfTeam(team, user?._id) ? (
                        // Admin or assigned teacher can view any team
                        <Button 
                          onClick={() => navigate(`/classes/${team._id}`)}
                          variant="outlined" 
                          size="small"
                        >
                          View
                        </Button>
                      ) : user?.role === 'teacher' ? (
                        // Other teachers see disabled button
                        <Tooltip title="You are not assigned to this Team" placement="top" arrow>
                          <span>
                            <Button 
                              variant="outlined" 
                              size="small"
                              disabled
                              sx={{ 
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              }}
                            >
                              View
                            </Button>
                          </span>
                        </Tooltip>
                      ) : null}
                      
                      {/* EDIT BUTTON - Regular for admins, ghosted for unassigned teachers */}
                      {user?.role === 'admin' || isTeacherOfTeam(team, user?._id) ? (
                        // Admin or assigned teacher can edit
                        <Button 
                          onClick={() => navigate(`/classes/${team._id}/edit`)}
                          variant="outlined" 
                          size="small"
                          startIcon={<Edit />}
                        >
                          Edit
                        </Button>
                      ) : user?.role === 'teacher' ? (
                        // Other teachers see disabled button
                        <Tooltip title="You are not assigned to this Team" placement="top" arrow>
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
                      ) : null}
                      
                      {/* DELETE BUTTON - Only admin can delete */}
                      {user?.role === 'admin' ? (
                        // Admin can delete teams
                        <Button 
                          onClick={() => handleDeleteTeam(team._id)}
                          variant="outlined" 
                          color="error"
                          size="small"
                          startIcon={<Delete />}
                        >
                          Delete
                        </Button>
                      ) : user?.role === 'teacher' ? (
                        // Teacher sees disabled button
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
                      ) : null}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Empty state if no teams */}
      {classes.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {user?.role === 'teacher' 
              ? "You don't have access to create teams." 
              : "You're not a member of any teams yet."}
          </Typography>
          {user?.role === 'admin' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => navigate('/classes/new')}
              sx={{ mt: 2 }}
            >
              Create Your First Team
            </Button>
          )}
          {user?.role === 'teacher' && (
            <Tooltip title="Admin permission only" placement="top" arrow>
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  disabled
                  sx={{ 
                    mt: 2,
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}
                >
                  Create Team
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      )}
    </Container>
  );
};

export default ClassList;
