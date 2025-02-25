import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AccessTime,
  CheckCircle,
  Warning,
  Edit,
  Delete
} from '@mui/icons-material';

const AssignmentCard = ({ 
  assignment, 
  onEdit, 
  onDelete, 
  onStart,
  isTeacher 
}) => {
  const isOverdue = new Date(assignment.dueDate) < new Date();
  const isCompleted = assignment.submissions?.some(s => 
    s.masteryAchieved >= assignment.requirements.minimumMastery
  );

  const getStatusColor = () => {
    if (isCompleted) return 'success';
    if (isOverdue) return 'error';
    return 'warning';
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if (isOverdue) return 'Overdue';
    return 'In Progress';
  };

  const progress = assignment.submissions?.[0]?.masteryAchieved || 0;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            {assignment.deck.name}
          </Typography>
          <Box>
            <Chip
              icon={isCompleted ? <CheckCircle /> : <AccessTime />}
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
            />
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography color="text.secondary" gutterBottom>
            Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </Typography>
          <Typography variant="body2">
            Required Mastery: {assignment.requirements.minimumMastery}%
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Progress: {Math.round(progress)}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress}
            color={isCompleted ? "success" : "primary"}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isTeacher ? (
            <Box>
              <Tooltip title="Edit Assignment">
                <IconButton size="small" onClick={onEdit}>
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Assignment">
                <IconButton size="small" color="error" onClick={onDelete}>
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Button
              variant="contained"
              color={isOverdue ? "error" : "primary"}
              onClick={onStart}
              startIcon={isOverdue ? <Warning /> : undefined}
            >
              {isCompleted ? 'Review' : 'Start Assignment'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AssignmentCard;
