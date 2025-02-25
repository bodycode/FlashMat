import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineConnector from '@mui/lab/TimelineConnector';
import {
  CheckCircle,
  Schedule,
  TrendingUp,
  School
} from '@mui/icons-material';

const ClassProgress = ({ classData }) => {
  const calculateOverallProgress = () => {
    if (!classData.assignments?.length) return 0;
    const completed = classData.assignments.reduce((acc, assignment) => {
      const completedStudents = assignment.submissions?.filter(sub => 
        sub.masteryAchieved >= assignment.requirements.minimumMastery
      ).length || 0;
      return acc + (completedStudents / classData.students.length);
    }, 0);
    return (completed / classData.assignments.length) * 100;
  };

  const recentActivity = classData.assignments
    ?.slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Class Progress
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={calculateOverallProgress()}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {Math.round(calculateOverallProgress())}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Timeline>
              {recentActivity?.map((assignment, index) => (
                <TimelineItem key={assignment._id}>
                  <TimelineSeparator>
                    <TimelineDot color={
                      new Date(assignment.dueDate) < new Date() ? 
                      'error' : 'primary'
                    }>
                      <Schedule />
                    </TimelineDot>
                    {index < recentActivity.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="body1">
                      {assignment.deck.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Achievement Stats
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <School sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">
                  {classData.students?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Students
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">
                  {Math.round(calculateOverallProgress())}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg. Mastery
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">
                  {classData.assignments?.filter(a => 
                    new Date(a.dueDate) < new Date()
                  ).length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ClassProgress;
