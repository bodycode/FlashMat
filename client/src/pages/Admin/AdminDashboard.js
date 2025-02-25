import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  People,
  School,
  MenuBook,
  TrendingUp
} from '@mui/icons-material';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClasses: 0,
    totalDecks: 0,
    activeStudents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #3F51B5 0%, #2196F3 100%)', color: 'white' }}>
            <People sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Total Users</Typography>
            <Typography variant="h3">{stats.totalUsers}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)', color: 'white' }}>
            <School sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Total Classes</Typography>
            <Typography variant="h3">{stats.totalClasses}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)', color: 'white' }}>
            <MenuBook sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Total Decks</Typography>
            <Typography variant="h3">{stats.totalDecks}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #9C27B0 0%, #E91E63 100%)', color: 'white' }}>
            <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Active Students</Typography>
            <Typography variant="h3">{stats.activeStudents}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              {/* Add activity feed component here */}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              {/* Add system status component here */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
