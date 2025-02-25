import api from './api';

const deckService = {
  getDecks: async () => {
    const response = await api.get('/decks');
    return response.data;
  },

  getDeck: async (id) => {
    const response = await api.get(`/decks/${id}`);
    return response.data;
  },

  createDeck: async (deckData) => {
    const response = await api.post('/decks', deckData);
    return response.data;
  },

  updateDeck: async (id, deckData) => {
    const response = await api.put(`/decks/${id}`, deckData);
    return response.data;
  },

  deleteDeck: async (id) => {
    const response = await api.delete(`/decks/${id}`);
    return response.data;
  },

  getStudyStats: async (deckId) => {
    const response = await api.get(`/decks/${deckId}/stats`);
    return response.data;
  }
};

export default deckService;
