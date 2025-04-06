// Explicitly load all models to ensure they're registered before routes
require('./models/User');
require('./models/Deck');
require('./models/Card');
require('./models/UserProgress');  // Make sure this is loaded BEFORE routes
require('./models/Class');
