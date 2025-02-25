import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  AccessTime,
  Star,
  Info
} from '@mui/icons-material';

const StudentProgress = ({ student, assignments }) => {
  const calculateOverallProgress = () => {
    if (!assignments?.length) return 0;
    const completedAssignments = assignments.filter(assignment => 
      assignment.submissions?.some(sub => 
        sub.student === student._id && 
        sub.masteryAchieved >= assignment.requirements.minimumMastery
      )
    );
    return (completedAssignments.length / assignments.length) * 100;
  };

  const getLastStudyDate = () => {
    const lastSubmission = assignments
      .flatMap(a => a.submissions)
      .filter(sub => sub.student === student._id)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
    
    return lastSubmission ? new Date(lastSubmission.submittedAt).toLocaleDateString() : 'Never';
  };

  const getAverageMastery = () => {
    const submissions = assignments
      .flatMap(a => a.submissions)
      .filter(sub => sub.student === student._id);
    
    if (!submissions.length) return 0;
    
    return submissions.reduce((acc, sub) => acc + sub.masteryAchieved, 0) / submissions.length;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {student.username}'s Progress
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Overall Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={calculateOverallProgress()} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <TrendingUp color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">
                {Math.round(getAverageMastery())}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average Mastery
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <AccessTime color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">
                {getLastStudyDate()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last Study Session
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Star color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">
                {assignments.filter(a => 
                  a.submissions?.some(sub => 
                    sub.student === student._id && 
                    sub.masteryAchieved >= a.requirements.minimumMastery
                  )
                ).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Assignments Completed
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default StudentProgress;
