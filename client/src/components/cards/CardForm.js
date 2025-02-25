import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const CardForm = () => {
  const { deckId, cardId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    type: 'text',
    options: ['', ''],
    difficulty: 1,
    image: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCard = async () => {
      if (cardId) {
        setLoading(true);
        try {
          const response = await api.get(`/cards/${cardId}`);
          setFormData(response.data);
        } catch (err) {
          setError('Failed to load card');
        } finally {
          setLoading(false);
        }
      }
    };
    loadCard();
  }, [cardId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cardData = {
        ...formData,
        deck: deckId,
        answer: formData.type === 'multipleChoice' ? formData.options[0] : formData.answer
      };

      if (cardId) {
        await api.put(`/cards/${cardId}`, cardData);
      } else {
        await api.post('/cards', cardData);
      }
      navigate(`/decks/${deckId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save card');
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const removeOption = (index) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {cardId ? 'Edit Card' : 'Add New Card'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <FormControl fullWidth margin="normal">
        <InputLabel>Card Type</InputLabel>
        <Select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          label="Card Type"
        >
          <MenuItem value="text">Text</MenuItem>
          <MenuItem value="multipleChoice">Multiple Choice</MenuItem>
          <MenuItem value="math">Math</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Question"
        value={formData.question}
        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
        margin="normal"
        required
        multiline
        rows={2}
      />

      {formData.type === 'multipleChoice' ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Options (First option will be the correct answer):
          </Typography>
          {formData.options.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                label={index === 0 ? 'Correct Answer' : `Option ${index + 1}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                required
              />
              {index > 1 && (
                <IconButton onClick={() => removeOption(index)} color="error">
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addOption} sx={{ mt: 1 }}>
            Add Option
          </Button>
        </Box>
      ) : (
        <TextField
          fullWidth
          label="Answer"
          value={formData.answer}
          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
          margin="normal"
          required
          multiline
          rows={2}
        />
      )}

      <TextField
        fullWidth
        label="Image URL (optional)"
        value={formData.image}
        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
        margin="normal"
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Difficulty</InputLabel>
        <Select
          value={formData.difficulty}
          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
          label="Difficulty"
        >
          <MenuItem value={1}>Easy</MenuItem>
          <MenuItem value={2}>Medium</MenuItem>
          <MenuItem value={3}>Hard</MenuItem>
        </Select>
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 3 }}
      >
        {cardId ? 'Update Card' : 'Create Card'}
      </Button>
    </Box>
  );
};

export default CardForm;
