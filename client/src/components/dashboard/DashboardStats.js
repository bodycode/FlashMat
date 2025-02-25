import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { Grid } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GroupIcon from '@mui/icons-material/Group';
import TimelineIcon from '@mui/icons-material/Timeline';
import dashboardService from '../../services/dashboardService';

const StatCard = ({ title, value, icon }) => (
  <div>
    <h3>{title}</h3>
    <p>{value}</p>
    {icon}
  </div>
);

const DashboardStats = () => {
  const [stats, setStats] = useState({
    studyStreak: 0,
    totalDecks: 0,
    totalCards: 0,
    masteredCards: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Study Streak"
          value={`${stats.studyStreak} days`}
          icon={<TrendingUpIcon color="primary" />}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Decks"
          value={stats.totalDecks}
          icon={<MenuBookIcon color="secondary" />}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Cards"
          value={stats.totalCards}
          icon={<GroupIcon color="success" />}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Cards Mastered"
          value={`${stats.masteredCards} (${Math.round((stats.masteredCards / stats.totalCards) * 100)}%)`}
          icon={<TimelineIcon color="info" />}
        />
      </Grid>
    </Grid>
  );
};

export default DashboardStats;
