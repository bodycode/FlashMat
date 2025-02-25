import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';

const StudyReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const data = await dashboardService.getStudyReminders();
        setReminders(data);
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Study Reminders
      </Typography>
      <List>
        {reminders.map((reminder) => (
          <ListItem key={reminder.id}>
            <ListItemText
              primary={reminder.deckName}
              secondary={`Last studied: ${reminder.lastStudied || 'Never'}`}
            />
            <ListItemSecondaryAction>
              <Button 
                variant="contained" 
                size="small"
                onClick={() => navigate(`/decks/${reminder.deckId}/study`)}
              >
                Study Now
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {reminders.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No study reminders"
              secondary="You're all caught up!"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default StudyReminders;
