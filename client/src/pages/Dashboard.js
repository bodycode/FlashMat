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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [activeTeams, setActiveTeams] = useState([]);
  const [masteryTrend, setMasteryTrend] = useState([]);

  const fetchDashboardStats = useCallback(async () => {
    try {
      console.log(`Fetching dashboard stats for user ${user?._id}`);
      const [decksRes, teamsRes] = await Promise.all([
        api.get('/decks'),  // This should return decks with user-specific stats
        api.get('/classes')
      ]);
      
      const decks = decksRes.data || [];
      const teams = teamsRes.data || [];
      
      console.log('Retrieved decks count:', decks.length);
      console.log('User-specific stats example from first deck:', 
        decks.length > 0 ? {
          masteryPercentage: decks[0].stats?.masteryPercentage,
          averageRating: decks[0].stats?.averageRating,
          lastStudied: decks[0].stats?.lastStudied,
          studySessions: decks[0].stats?.studySessions?.length
        } : 'No decks');

      // Calculate deck stats
      const recentlyStudied = decks
        .filter(deck => deck.stats?.lastStudied)
        .sort((a, b) => new Date(b.stats.lastStudied) - new Date(a.stats.lastStudied))
        .slice(0, 3);

      const needsReview = decks
        .filter(deck => (deck.stats?.masteryPercentage || 0) < 70)
        .slice(0, 3);

      // Calculate deck statistics using the same method as StudyMode
      const statsTotal = decks.reduce((acc, deck) => {
        // Skip decks without stats
        if (!deck.stats) return acc;

        // Get the mastery percentage directly from deck stats
        const deckMastery = deck.stats.masteryPercentage || 0;
        const deckRating = deck.stats.averageRating || 0;

        return {
          masterySum: acc.masterySum + deckMastery,
          ratingSum: acc.ratingSum + deckRating,
          count: acc.count + 1
        };
      }, { masterySum: 0, ratingSum: 0, count: 0 });

      // Calculate averages
      const averageMastery = statsTotal.count ? 
        Math.round(statsTotal.masterySum / statsTotal.count) : 0;
      const averageRating = statsTotal.count ? 
        Math.round((statsTotal.ratingSum / statsTotal.count) * 10) / 10 : 0;

      // Sort teams alphabetically
      const sortedTeams = teams
        .filter(team => team && team.name)
        .sort((a, b) => a.name.localeCompare(b.name));

      // Calculate team stats
      const teamStats = {
        totalTeams: sortedTeams.length,
        totalMembers: sortedTeams.reduce((sum, team) => sum + (team.students?.length || 0), 0),
        totalDecksAssigned: sortedTeams.reduce((sum, team) => sum + (team.decks?.length || 0), 0)
      };

      // Calculate mastery trend for last 14 days
      const last14Days = [...Array(14)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        return date;
      });

      // Log all study sessions found
      decks.forEach(deck => {
        if (deck.stats?.studySessions?.length) {
          console.log(`Deck ${deck.name} has ${deck.stats.studySessions.length} study sessions:`,
            deck.stats.studySessions.map(s => ({
              date: new Date(s.date).toLocaleDateString(),
              masteryLevel: s.masteryLevel
            }))
          );
        }
      });

      const masteryData = last14Days.map(date => {
        console.log('Processing date:', date.toLocaleDateString());
        
        const matchingSessions = [];
        decks.forEach(deck => {
          if (!deck.stats?.studySessions) return;
          
          // Check for study sessions on this date
          const sessions = deck.stats.studySessions.filter(session => {
            if (!session || !session.date) return false;
            const sessionDate = new Date(session.date);
            return sessionDate.toDateString() === date.toDateString();
          });
          
          if (sessions.length > 0) {
            console.log('Found sessions for deck:', {
              deckId: deck._id,
              deckName: deck.name,
              sessions: sessions.map(s => ({
                date: new Date(s.date).toLocaleString(),
                mastery: s.masteryLevel
              }))
            });
            matchingSessions.push(...sessions);
          }
        });
        
        let dayMastery = null;
        if (matchingSessions.length > 0) {
          dayMastery = Math.round(
            matchingSessions.reduce((sum, session) => sum + (session.masteryLevel || 0), 0) / 
            matchingSessions.length
          );
          console.log(`Mastery for ${date.toLocaleDateString()}:`, dayMastery);
        }
      
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          mastery: dayMastery
        };
      });

      setMasteryTrend(masteryData);

      setActiveTeams(sortedTeams);
      setStats({
        totalDecks: decks.length,
        studyStreak: user.studyStreak || 0,
        averageMastery,  // Use the new calculation
        averageRating,
        recentlyStudied,
        needsReview,
        ...teamStats
      });

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.studyStreak]);

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
                <TrendingUp /> Mastery Trend
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={masteryTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Mastery %', 
                        angle: -90, 
                        position: 'insideLeft',
                        fontSize: 12
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Mastery']}
                      labelStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mastery"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <School /> My Teams
              </Typography>
              <List>
                {activeTeams.length > 0 ? (
                  <>
                    <ListItem>
                      <ListItemText 
                        primary={`${stats.totalTeams} Active ${stats.totalTeams === 1 ? 'Team' : 'Teams'}`}
                        secondary={`Total Members: ${stats.totalMembers} | Total Decks: ${stats.totalDecksAssigned}`}
                      />
                    </ListItem>
                    {activeTeams.map(team => (
                      <ListItem 
                        key={team._id}
                        button
                        onClick={() => navigate(`/classes/${team._id}`)}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'action.hover',
                            cursor: 'pointer' 
                          } 
                        }}
                      >
                        <ListItemIcon>
                          <School />
                        </ListItemIcon>
                        <ListItemText 
                          primary={team.name}
                          secondary={`${team.students?.length || 0} Members | ${team.decks?.length || 0} Decks`}
                        />
                      </ListItem>
                    ))}
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/classes')}
                      sx={{ mt: 1 }}
                    >
                      View All Teams
                    </Button>
                  </>
                ) : (
                  <ListItem>
                    <ListItemText primary="No teams joined yet" />
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
                      secondary={`Last studied: ${new Date(deck.stats?.lastStudied || 'Invalid Date').toLocaleDateString()}`}
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
