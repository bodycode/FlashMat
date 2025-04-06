import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Container,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Add } from '@mui/icons-material';
import UserTable from '../../components/admin/UserTable';
import UserForm from '../../components/admin/UserForm';
import UserFilters from '../../components/admin/UserFilters';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      
      // Get users with enhanced info including deck mastery stats
      const usersWithProgress = await Promise.all(response.data.map(async user => {
        try {
          // Fetch progress for each user directly from the progress endpoint
          const progressResponse = await api.get(`/users/${user._id}/progress`);
          console.log(`Fetched progress for ${user.username}:`, progressResponse.data);
          
          return {
            ...user,
            masteryPercentage: progressResponse.data?.averageMastery || 0
          };
        } catch (err) {
          console.warn(`Error getting progress for user ${user.username}:`, err);
          // Still return the user with a default mastery of 0
          return {
            ...user,
            masteryPercentage: 0
          };
        }
      }));
      
      setUsers(usersWithProgress || []);
      console.log('Fetched users with progress data:', 
        usersWithProgress.map(u => ({
          username: u.username,
          role: u.role,
          mastery: u.masteryPercentage
        }))
      );
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleDelete = (userId) => {
    // Find the user to be deleted
    const userToDelete = users.find(u => u._id === userId);
    
    // If teacher is trying to delete admin, show error
    if (currentUser.role === 'teacher' && userToDelete?.role === 'admin') {
      setError("Teachers cannot delete admin users");
      return;
    }
    
    // Otherwise continue with normal deletion flow
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/users/${userToDelete}`);
      fetchUsers();
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedUser) {
        await api.put(`/users/${selectedUser._id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      
      // Always refresh users after adding/updating a user
      await fetchUsers();
      
      setFormOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Update the handleUserUpdated function to correctly handle deck count updates
  const handleUserUpdated = (updatedUser, deletedUserId) => {
    if (deletedUserId) {
      // Handle deletion - remove user from list
      setUsers(prev => prev.filter(user => user._id !== deletedUserId));
    } else if (updatedUser) {
      // Handle update - make sure we update ALL properties including deck count
      setUsers(prev => prev.map(user => {
        if (user._id === updatedUser._id) {
          console.log('Updating user in list:', {
            username: updatedUser.username,
            oldDeckCount: user.deckCount,
            newDeckCount: updatedUser.deckCount,
            oldTeamCount: user.teamCount, 
            newTeamCount: updatedUser.teamCount
          });
          
          // Return the updated user with ALL properties properly updated
          return {
            ...user,           // Keep any properties not in updatedUser
            ...updatedUser,    // Override with all properties from updatedUser
            deckCount: updatedUser.deckCount,
            teamCount: updatedUser.teamCount
          };
        }
        return user;
      }));
    } else {
      // Fallback: refetch all users when we're not sure what changed
      fetchUsers();
    }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'teacher') {
    return <Typography>Access denied. Only administrators and teachers can access user management.</Typography>;
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setFormOpen(true)}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <UserTable
        users={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUserUpdated={handleUserUpdated}
        page={page}
        rowsPerPage={rowsPerPage}
        totalUsers={users.length}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        currentUser={currentUser} // Add this prop to pass the current user
      />

      <UserForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleSubmit}
        user={selectedUser}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this user? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserList;
