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
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  PhotoCamera
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const CardForm = () => {
  const { deckId, cardId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    type: 'text',
    options: ['', '']
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      console.log('Image selected:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      setFormData(prev => ({
        ...prev,
        imageFile: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('question', formData.question);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('deck', deckId);

      // Handle multiple choice differently
      if (formData.type === 'multipleChoice') {
        // Filter out empty options
        const validOptions = formData.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          setError('Multiple choice cards must have at least 2 options');
          return;
        }
        formDataToSend.append('options', JSON.stringify(validOptions));
        // First option is the answer
        formDataToSend.append('answer', validOptions[0]);
      } else {
        formDataToSend.append('answer', formData.answer);
      }

      // Handle image if present
      if (formData.imageFile) {
        formDataToSend.append('questionImage', formData.imageFile);
      }

      console.log('Submitting form data:', {
        type: formData.type,
        optionsCount: formData.type === 'multipleChoice' ? formData.options.length : 0,
        hasAnswer: formData.type === 'multipleChoice' ? !!formData.options[0] : !!formData.answer
      });

      const response = await api.post('/cards', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Card created:', response.data);
      navigate(`/decks/${deckId}`);
    } catch (err) {
      console.error('Error creating card:', err);
      setError(err.response?.data?.message || 'Failed to create card');
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
    <Box component="form" onSubmit={handleSubmit} sx={{ 
      maxWidth: 600, 
      mx: 'auto', 
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      // Remove fixed height, let it grow
      minHeight: 600,
      height: 'auto',
      flex: '1 1 auto'
    }}>
      <Typography variant="h5" gutterBottom>
        {cardId ? 'Edit Card' : 'Add New Card'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        // Allow this container to grow
        flex: '1 1 auto',
        // Minimum space for content
        minHeight: formData.type === 'multipleChoice' ? 500 : 300
      }}>
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

        {/* Image section with controlled height */}
        <Box sx={{ 
          maxHeight: '200px',
          overflow: 'hidden',
          mb: 2
        }}>
          <input
            accept="image/*"
            type="file"
            id="image-upload"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <label htmlFor="image-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<PhotoCamera />}
            >
              Upload Image
            </Button>
          </label>
          {imagePreview && (
            <Box sx={{ 
              mt: 2, 
              height: '150px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img 
                src={imagePreview} 
                alt="Question preview" 
                style={{ 
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
        </Box>

        {/* Multiple choice section with flexible height */}
        {formData.type === 'multipleChoice' ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            // Allow growing with content
            flex: '1 1 auto',
            minHeight: 400,
            // Remove maxHeight to allow growth
            overflowY: 'visible',
            mt: 2
          }}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Options (First option will be the correct answer):
            </Typography>
            {formData.options.map((option, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                gap: 1, 
                mb: 2,  // Increased spacing between options
                alignItems: 'center' 
              }}>
                <TextField
                  fullWidth
                  label={index === 0 ? 'Correct Answer ✓' : `Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  required
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: index === 0 ? 'success.main' : 'inherit'
                    }
                  }}
                />
                {index > 1 && (
                  <IconButton 
                    onClick={() => removeOption(index)} 
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button 
              startIcon={<AddIcon />} 
              onClick={addOption} 
              sx={{ mt: 2 }}
              variant="outlined"
            >
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
      </Box>

      {/* Submit button always visible at bottom */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 'auto', py: 1.5 }}
      >
        {cardId ? 'Update Card' : 'Create Card'}
      </Button>
    </Box>
  );
};

export default CardForm;
