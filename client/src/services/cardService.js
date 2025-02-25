import api from './api';

const cardService = {
  getCards: async (deckId) => {
    const response = await api.get(`/cards/deck/${deckId}`);
    return response.data;
  },

  createCard: async (cardData) => {
    const response = await api.post('/cards', cardData);
    return response.data;
  },

  updateCard: async (cardId, cardData) => {
    const response = await api.put(`/cards/${cardId}`, cardData);
    return response.data;
  },

  deleteCard: async (cardId) => {
    const response = await api.delete(`/cards/${cardId}`);
    return response.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export default cardService;
