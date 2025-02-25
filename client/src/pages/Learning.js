import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  School,
  Timeline,
  Assessment,
  Star,
  TrendingUp,
  EmojiEvents,
  Schedule,
  PlayArrow
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Learning = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCards: 0,
    masteredCards: 0,
    studyStreak: 0,
    recentDecks: [],
    needsReview: [],
    achievements: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLearningStats = async () => {
      try {
        const response = await api.get('/users/learning-stats');
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching learning stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningStats();
  }, []);

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        My Learning Journey 📚
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiEvents />
                <Typography variant="h6">Study Streak</Typography>
              </Box>
              <Typography variant="h3">{stats.studyStreak} Days 🔥</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976D2 0%, #0D47A1 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Assessment />
                <Typography variant="h6">Cards Mastered</Typography>
              </Box>
              <Typography variant="h3">{stats.masteredCards}/{stats.totalCards}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #FFA726 0%, #F57C00 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Star />
                <Typography variant="h6">Achievement Points</Typography>
              </Box>
              <Typography variant="h3">{stats.achievementPoints || 0} pts</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recently Studied */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline /> Recent Activity
              </Typography>
              <List>
                {stats.recentDecks.map((deck) => (
                  <ListItem
                    key={deck._id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => navigate(`/decks/${deck._id}/study`)}>
                        <PlayArrow />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <School />
                    </ListItemIcon>
                    <ListItemText
                      primary={deck.name}
                      secondary={`Last studied: ${new Date(deck.lastStudied).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Needs Review */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule /> Review Schedule
              </Typography>
              <List>
                {stats.needsReview.map((deck) => (
                  <ListItem
                    key={deck._id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => navigate(`/decks/${deck._id}/study`)}>
                        <PlayArrow />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <TrendingUp color={deck.mastery < 50 ? "error" : "primary"} />
                    </ListItemIcon>
                    <ListItemText
                      primary={deck.name}
                      secondary={`Current mastery: ${deck.mastery}%`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Achievements */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEvents /> Recent Achievements
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {stats.achievements.map((achievement) => (
                  <Chip
                    key={achievement._id}
                    icon={<Star />}
                    label={achievement.title}
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Learning;
