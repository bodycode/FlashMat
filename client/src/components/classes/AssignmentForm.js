import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Slider,
  Typography
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const AssignmentForm = ({ open, onClose, classId, assignment, onAssign }) => {
  const [formData, setFormData] = useState({
    deck: assignment?.deck?._id || '',
    dueDate: assignment?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    requirements: {
      minimumMastery: assignment?.requirements?.minimumMastery || 80,
      minimumCards: assignment?.requirements?.minimumCards || 10
    }
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.deck) {
      setError('Please select a deck');
      return;
    }
    onAssign(formData);
  };

  const handleSliderChange = (field) => (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [field]: newValue
      }
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {assignment ? 'Edit Assignment' : 'Create New Assignment'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Deck</InputLabel>
            <Select
              value={formData.deck}
              label="Select Deck"
              onChange={(e) => setFormData({ ...formData, deck: e.target.value })}
              required
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Due Date"
              value={formData.dueDate}
              onChange={(newValue) => setFormData({ ...formData, dueDate: newValue })}
              sx={{ width: '100%', mb: 2 }}
              textField={(params) => <TextField {...params} />}
              minDateTime={new Date()}
            />
          </LocalizationProvider>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Minimum Mastery Required: {formData.requirements.minimumMastery}%
            </Typography>
            <Slider
              value={formData.requirements.minimumMastery}
              onChange={handleSliderChange('minimumMastery')}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={50}
              max={100}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Minimum Cards to Complete: {formData.requirements.minimumCards}
            </Typography>
            <Slider
              value={formData.requirements.minimumCards}
              onChange={handleSliderChange('minimumCards')}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={5}
              max={50}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {assignment ? 'Update' : 'Create'} Assignment
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssignmentForm;
