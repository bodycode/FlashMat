import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { formatDate } from '../../utils/formatters';
import dashboardService from '../../services/dashboardService';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const data = await dashboardService.getRecentActivity();
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      <List>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem>
              <ListItemIcon>
                <SchoolIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={activity.description}
                secondary={formatDate(activity.date)}
              />
            </ListItem>
            {index < activities.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {activities.length === 0 && (
          <ListItem>
            <ListItemText 
              primary="No recent activity"
              secondary="Start studying to see your activity here!"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default RecentActivity;
