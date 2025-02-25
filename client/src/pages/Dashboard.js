import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  TimerOutlined,
  TrendingUp,
  Star,
  Assignment,
  EmojiEvents,
  Add,
  Whatshot,
  School
} from '@mui/icons-material';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalClasses: 0,
    averageMastery: 0,
    averageRating: 0,
    studyStreak: 0,
    recentlyStudied: [],
    needsReview: []
  });

  const fetchDashboardStats = useCallback(async () => {
    try {
      console.log('Fetching dashboard stats...');
      const [decksRes, classesRes] = await Promise.all([
        api.get('/decks'),
        api.get('/classes')
      ]);
      
      const decks = decksRes.data || [];
      const classes = classesRes.data || [];
      
      console.log('Fetched decks:', decks);
      
      const recentlyStudied = decks
        .filter(deck => deck.stats?.lastStudied)
        .sort((a, b) => new Date(b.stats.lastStudied) - new Date(a.stats.lastStudied))
        .slice(0, 3);

      const needsReview = decks
        .filter(deck => (deck.stats?.masteryPercentage || 0) < 70)
        .slice(0, 3);

      // Calculate stats only from decks that have stats
      const decksWithStats = decks.filter(deck => deck.stats);
      const statsTotal = decksWithStats.reduce((acc, deck) => ({
        masterySum: acc.masterySum + (deck.stats.masteryPercentage || 0),
        ratingSum: acc.ratingSum + (deck.stats.averageRating || 0),
        count: acc.count + 1
      }), { masterySum: 0, ratingSum: 0, count: 0 });

      setStats({
        totalDecks: decks.length,
        studyStreak: user.studyStreak || 0,
        averageMastery: statsTotal.count ? 
          Math.round(statsTotal.masterySum / statsTotal.count) : 0,
        averageRating: statsTotal.count ? 
          Math.round((statsTotal.ratingSum / statsTotal.count) * 10) / 10 : 0,
        recentlyStudied,
        needsReview,
        totalClasses: classes.length
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user.studyStreak]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4 
      }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user?.username ? `Welcome back, ${user.username}!` : 'Welcome!'} 
          <EmojiEvents color="primary" />
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/decks')}
            startIcon={<Assignment />}
          >
            View All Decks
          </Button>
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

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', background: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)', color: 'white' }}>
            <Whatshot sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Study Streak</Typography>
            <Typography variant="h3">
              {stats.studyStreak} {stats.studyStreak === 1 ? 'Day' : 'Days'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)', color: 'white' }}>
            <Assignment sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Total Decks</Typography>
            <Typography variant="h3">{stats.totalDecks}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', background: 'linear-gradient(135deg, #1976D2 0%, #0D47A1 100%)', color: 'white' }}>
            <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Average Mastery</Typography>
            <Typography variant="h3">{stats.averageMastery}%</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', background: 'linear-gradient(135deg, #FFA726 0%, #F57C00 100%)', color: 'white' }}>
            <Star sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Average Rating</Typography>
            <Typography variant="h3">{stats.averageRating}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <School /> My Classes
              </Typography>
              <List>
                {stats.totalClasses > 0 ? (
                  <>
                    <ListItem>
                      <ListItemText 
                        primary={`${stats.totalClasses} Active ${stats.totalClasses === 1 ? 'Class' : 'Classes'}`}
                      />
                    </ListItem>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/classes')}
                      sx={{ mt: 1 }}
                    >
                      View Classes
                    </Button>
                  </>
                ) : (
                  <ListItem>
                    <ListItemText primary="No classes joined yet" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerOutlined /> Recently Studied
              </Typography>
              <List>
                {stats.recentlyStudied.map((deck) => (
                  <ListItem 
                    key={deck._id}
                    button
                    onClick={() => navigate(`/decks/${deck._id}/study`)}
                  >
                    <ListItemIcon>
                      <TimerOutlined />
                    </ListItemIcon>
                    <ListItemText 
                      primary={deck.name}
                      secondary={`Last studied: ${new Date(deck.stats.lastStudied).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
                {stats.recentlyStudied.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No decks studied yet" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment /> Needs Review
              </Typography>
              <List>
                {stats.needsReview.map((deck) => (
                  <ListItem 
                    key={deck._id}
                    button
                    onClick={() => navigate(`/decks/${deck._id}/study`)}
                  >
                    <ListItemIcon>
                      <Star />
                    </ListItemIcon>
                    <ListItemText 
                      primary={deck.name}
                      secondary={`Current Mastery: ${Math.round(deck.stats?.masteryPercentage || 0)}%`}
                    />
                  </ListItem>
                ))}
                {stats.needsReview.length === 0 && (
                  <ListItem>
                    <ListItemText primary="All decks are well mastered!" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
