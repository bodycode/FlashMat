import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  CardActions,
  Button
} from '@mui/material';
import {
  Group,
  MenuBook,
  Edit,
  Delete,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ClassCard = ({ classData, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {classData.name}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            size="small"
            icon={<Group />}
            label={`${classData.students?.length || 0} Members`}
          />
          <Chip
            size="small"
            icon={<MenuBook />}
            label={`${classData.decks?.length || 0} Decks`}
          />
        </Box>

        {classData.description && (
          <Typography variant="body2" color="text.secondary">
            {classData.description}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          {isTeacher && (
            <>
              <IconButton size="small" onClick={() => navigate(`/classes/${classData._id}/edit`)}>
                <Edit />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => onDelete?.(classData._id)}>
                <Delete />
              </IconButton>
            </>
          )}
        </Box>
        <Button
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => navigate(`/classes/${classData._id}`)}
        >
          View Team
        </Button>
      </CardActions>
    </Card>
  );
};

export default ClassCard;
