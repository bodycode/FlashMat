import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Paper,
  Rating,
  Divider,
  Tooltip,
  Container,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizIcon from '@mui/icons-material/Quiz';
import AddCardIcon from '@mui/icons-material/AddCircle';
import SchoolIcon from '@mui/icons-material/School';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DeckView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get current user from token
  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            _id: payload._id,
            role: payload.role,
            username: payload.username
          };
        }
      } catch (err) {
        console.warn('Could not get current user info:', err);
      }
      return null;
    };
    
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    const fetchDeck = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/decks/${id}`);
        
        let fullResponse = response.data;
        
        if (currentUser?.role === 'teacher') {
          try {
            const enhancedResponse = await api.get(`/decks/${id}/full`);
            
            if (enhancedResponse?.data) {
              fullResponse = {
                ...response.data,
                isAssigned: true,
                isTeamAssigned: enhancedResponse.data.isTeamAssigned || 
                                Boolean(enhancedResponse.data.assignedTeams?.length),
                relationship: 'assigned'
              };
              
              console.log('Enhanced deck with full assignment data:', {
                deckName: fullResponse.name,
                isAssigned: fullResponse.isAssigned,
                isTeamAssigned: fullResponse.isTeamAssigned,
                relationship: fullResponse.relationship
              });
            }
          } catch (err) {
            console.log('Could not fetch enhanced assignment data:', err);
          }
        }
        
        console.log('Final deck data:', {
          name: fullResponse.name,
          cardCount: fullResponse.cards?.length || 0,
          stats: fullResponse.stats,
          masteryPercentage: fullResponse.stats?.masteryPercentage,
          isAssigned: fullResponse.isAssigned,
          isTeamAssigned: fullResponse.isTeamAssigned,
          relationship: fullResponse.relationship
        });
        
        setDeck(fullResponse);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch deck');
      } finally {
        setLoading(false);
      }
    };

    if (id && currentUser) {
      fetchDeck();
    }
  }, [id, currentUser]);

  const handleCardClick = (cardId) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleMenuClick = (event, card) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCard(card);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCard(null);
  };

  const handleEditCard = () => {
    handleMenuClose();
    navigate(`/decks/${id}/cards/${selectedCard._id}/edit`);
  };

  const handleDeleteCardClick = () => {
    handleMenuClose();
    setCardToDelete(selectedCard);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCardToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/cards/${cardToDelete._id}`);
      
      setDeck({
        ...deck,
        cards: deck.cards.filter(c => c._id !== cardToDelete._id)
      });
      
      console.log('Card deleted successfully');
    } catch (err) {
      setError('Failed to delete card');
      console.error('Error deleting card:', err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    }
  };

  const getRatingColor = (rating) => {
    if (!rating || rating === 0) return 'text.secondary';
    if (rating >= 4) return 'success.main';
    if (rating >= 3) return 'primary.main';
    if (rating >= 2) return 'info.main';
    return 'warning.main';
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!deck) return <Typography>Deck not found</Typography>;

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const isCreator = deck.creator && 
                   (deck.creator._id === currentUser?._id ||
                    deck.creator.toString?.() === currentUser?._id);
  
  const isAssigned = deck.isAssigned === true || 
                     deck.relationship === 'assigned' ||
                     deck.isTeamAssigned === true || 
                     deck.isDirectlyAssigned === true;
  
  console.log('Permission check for deck view:', {
    deckId: deck._id,
    deckName: deck.name,
    isAdmin,
    isTeacher,
    isCreator,
    assignment: {
      isAssigned,
      flagFromProps: deck.isAssigned,
      relationship: deck.relationship,
      isTeamAssigned: deck.isTeamAssigned,
      isDirectlyAssigned: deck.isDirectlyAssigned
    },
    userId: currentUser?._id
  });
  
  const canEdit = isAdmin || isCreator || (isTeacher && isAssigned);
  const canStudy = isAdmin || isCreator || isAssigned;
  const canAddCards = isAdmin || isCreator || (isTeacher && isAssigned);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          backgroundImage: 'linear-gradient(to right, #6a11cb 0%, #2575fc 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{deck.name}</Typography>
          <Box>
            <Tooltip
              title={!canStudy ? "You are not assigned to this deck" : ""}
              placement="top"
            >
              <span>
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={() => navigate(`/decks/${id}/study`)}
                  sx={{ 
                    mr: 2, 
                    bgcolor: 'rgba(255,255,255,0.25)', 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } 
                  }}
                  startIcon={<SchoolIcon />}
                  disabled={!canStudy}
                >
                  Study Deck
                </Button>
              </span>
            </Tooltip>
            
            <Tooltip
              title={!canAddCards ? "You are not assigned to this deck" : ""}
              placement="top"
            >
              <span>
                <Button 
                  variant="contained" 
                  onClick={() => navigate(`/decks/${id}/cards/new`)}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.25)', 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } 
                  }}
                  startIcon={<AddCardIcon />}
                  disabled={!canAddCards}
                >
                  Add Card
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="subtitle1" sx={{ mb: 2, opacity: 0.9 }}>
          {deck.description || "No description provided"}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>Cards</Typography>
            <Typography variant="h6">{deck.cards?.length || 0}</Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>Mastery</Typography>
            <Typography variant="h6">
              {deck.stats?.masteryPercentage ? `${Math.round(deck.stats.masteryPercentage)}%` : 'N/A'}
            </Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>Created By</Typography>
            <Typography variant="h6">{deck.creator?.username || 'Unknown'}</Typography>
          </Box>
        </Box>
      </Paper>

      <Typography 
        variant="h5" 
        sx={{ 
          mt: 4, 
          mb: 2, 
          borderBottom: '2px solid', 
          borderColor: 'primary.main',
          pb: 1,
          display: 'inline-block'
        }}
      >
        <Badge 
          badgeContent={deck.cards?.length || 0} 
          color="primary" 
          sx={{ '& .MuiBadge-badge': { fontSize: 14, height: 22, minWidth: 22 } }}
        >
          <Box component="span" sx={{ mr: 1 }}>Flashcards</Box>
        </Badge>
      </Typography>

      {(!deck.cards || deck.cards.length === 0) && (
        <Paper
          elevation={2}
          sx={{
            p: 5,
            borderRadius: 2,
            textAlign: 'center',
            backgroundColor: 'background.paper',
            border: '1px dashed',
            borderColor: 'divider'
          }}
        >
          <Typography variant="h5" gutterBottom>
            This deck has no cards yet
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Start adding cards to build your study materials.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Tooltip
              title={!canAddCards ? "You are not assigned to this deck" : ""}
              placement="top"
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddCardIcon />}
                  onClick={() => navigate(`/decks/${id}/cards/new`)}
                  disabled={!canAddCards}
                  sx={{ px: 3 }}
                >
                  Add First Card
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Paper>
      )}

      {deck.cards && deck.cards.length > 0 && (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Displaying {deck.cards.length} cards in alphabetical order
          </Typography>
          
          {[...(deck.cards || [])].sort((a, b) => {
            const questionA = (a.question || '').toLowerCase();
            const questionB = (b.question || '').toLowerCase();
            return questionA.localeCompare(questionB, undefined, { numeric: true, sensitivity: 'base' });
          }).map((card, index) => (
            <Paper 
              key={card._id} 
              elevation={3} 
              sx={{ 
                mb: 4, 
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: 'primary.main', 
                color: 'white', 
                py: 1, 
                px: 2,
                borderBottom: '3px solid',
                borderColor: 'primary.dark'
              }}>
                <Box component="span" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <QuizIcon sx={{ mr: 1, fontSize: 20 }} />
                  Card #{index + 1}
                </Box>
                <Box>
                  <Chip 
                    label={card.type || 'Basic'} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.3)', 
                      mr: 1, 
                      color: 'white',
                      fontWeight: 'medium' 
                    }}
                  />
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.15)'
                      }
                    }}
                    onClick={(e) => handleMenuClick(e, card)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>
              
              <Grid container>
                <Grid item xs={12} md={6} sx={{
                  borderRight: { md: '1px solid', xs: 'none' },
                  borderBottom: { xs: '1px solid', md: 'none' },
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Box sx={{ p: 3, flex: '1 0 auto' }}>
                    <Typography 
                      variant="subtitle1" 
                      color="text.secondary" 
                      sx={{ mb: 1, fontWeight: 'bold' }}
                    >
                      Question
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {card.question}
                    </Typography>
                    
                    {card.questionImage?.url && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <img 
                          src={card.questionImage.url} 
                          alt="Question illustration"
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '200px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 3 }}>
                    <Typography 
                      variant="subtitle1" 
                      color="text.secondary" 
                      sx={{ mb: 1, fontWeight: 'bold' }}
                    >
                      Answer
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {card.answer}
                    </Typography>
                    
                    <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Your rating:
                      </Typography>
                      <Rating 
                        value={card.userRating || 0} 
                        readOnly 
                        precision={0.5}
                        size="small"
                        sx={{
                          '& .MuiRating-iconFilled': {
                            color: getRatingColor(card.userRating)
                          }
                        }}
                      />
                      {!card.userRating && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          (Not rated yet)
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 150, borderRadius: 1 }
        }}
      >
        <MenuItem onClick={handleEditCard} dense sx={{ py: 1.5 }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Card
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleDeleteCardClick} 
          dense 
          sx={{ 
            color: 'error.main', 
            py: 1.5,
            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Card
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-card-dialog-title"
      >
        <DialogTitle id="delete-card-dialog-title">Delete Card</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this card? This action cannot be undone.
          </Typography>
          {cardToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Card content:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Question: {cardToDelete.question}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            disabled={isDeleting}
            variant="contained"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DeckView;
