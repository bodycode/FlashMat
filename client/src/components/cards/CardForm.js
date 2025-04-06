import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  IconButton 
} from '@mui/material';
import {
  PhotoCamera,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

// Fix the card duplication issue by correctly handling update vs create

// Update the component to handle both create and edit properly
const CardForm = () => {
  const { deckId, cardId } = useParams();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState({
    question: '',
    answer: '',
    type: 'text'
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // Load card data if editing an existing card
  useEffect(() => {
    const fetchCard = async () => {
      if (cardId) {
        try {
          setIsEdit(true);
          console.log(`Loading card ${cardId} for editing`);
          
          const response = await api.get(`/cards/${cardId}`);
          const card = response.data;
          
          // Add some defensive checking for card data
          if (!card) {
            throw new Error('Card data not found');
          }
          
          setCardData({
            question: card.question || '',
            answer: card.answer || '',
            type: card.type || 'text',
            difficulty: card.difficulty || 1
          });
          
          // Set image preview if card has an image, with better URL handling
          if (card.questionImage && card.questionImage.url) {
            // Handle both relative and absolute URLs
            const imageUrl = card.questionImage.url.startsWith('http') 
              ? card.questionImage.url 
              : card.questionImage.url;
              
            setImagePreview(imageUrl);
            console.log('Loaded card with image:', imageUrl);
          }
        } catch (err) {
          console.error('Error loading card:', err);
          setError('Failed to load card data: ' + (err.message || 'Unknown error'));
        }
      }
    };
    
    fetchCard();
  }, [cardId]);
  
  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      
      // Update state
      setImageFile(file);
      
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      console.log('Image selected:', {
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`
      });
    }
  };
  
  // Handle removing the image
  const handleRemoveImage = () => {
    console.log('Removing image', { 
      hadPreview: !!imagePreview, 
      hadFile: !!imageFile 
    });
    
    // Clear the image state
    setImageFile(null);
    setImagePreview(null);
  };
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCardData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!cardData.question.trim()) {
      setError('Question is required');
      return;
    }
    
    if (!cardData.answer.trim()) {
      setError('Answer is required');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('question', cardData.question);
      formData.append('answer', cardData.answer);
      formData.append('type', cardData.type || 'text');
      formData.append('difficulty', cardData.difficulty || 1);
      
      if (deckId) {
        formData.append('deck', deckId);
      }
      
      // Handle image upload
      if (imageFile) {
        console.log('Adding new image file to request:', imageFile.name);
        formData.append('questionImage', imageFile);
      }
      
      let response;
      
      // Use PUT for edit, POST for new card
      if (cardId) {
        // EDITING existing card
        console.log(`Updating card ${cardId}`);
        
        // When editing a card, explicitly set keepImage flag
        // imagePreview null means we want to remove the image
        const keepExistingImage = !!imagePreview && !imageFile;
        
        console.log('Image handling in form submission:', {
          hasImageFile: !!imageFile,
          hasImagePreview: !!imagePreview,
          keepExistingImage
        });
        
        // Always add the keepImage parameter when editing (false = remove image)
        formData.append('keepImage', keepExistingImage ? 'true' : 'false');
        
        response = await api.put(`/cards/${cardId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // CREATING new card
        console.log('Creating new card');
        response = await api.post('/cards', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
      }
      
      // Log success
      console.log('Card saved successfully:', response.data);
      
      // Navigate back to deck view
      navigate(`/decks/${deckId}`);
    } catch (err) {
      console.error('Error saving card:', err);
      setError(err.response?.data?.message || 'Failed to save card: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {isEdit ? 'Edit Card' : 'Create New Card'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Question"
          name="question"
          value={cardData.question}
          onChange={handleChange}
          required
          fullWidth
          multiline
          rows={3}
          margin="normal"
          variant="outlined"
          error={!!error && !cardData.question}
        />
        
        <Box sx={{ my: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Question Image (Optional)
          </Typography>
          
          {!imagePreview ? (
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCamera />}
              sx={{ mt: 1 }}
            >
              Upload Image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
            </Button>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center', position: 'relative' }}>
              <img
                src={imagePreview}
                alt="Question preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
              <IconButton
                onClick={handleRemoveImage}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.7)'
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
        
        <TextField
          label="Answer"
          name="answer"
          value={cardData.answer}
          onChange={handleChange}
          required
          fullWidth
          multiline
          rows={3}
          margin="normal"
          variant="outlined"
          error={!!error && !cardData.answer}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/decks/${deckId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            color="primary"
          >
            {submitting ? 'Saving...' : isEdit ? 'Update Card' : 'Create Card'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default CardForm;
