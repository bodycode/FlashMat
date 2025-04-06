const express = require('express');
const router = express.Router();

router.get('/routes', (req, res) => {
  const routes = [];
  
  // Get all registered routes
  req.app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ 
    routes,
    timestamp: new Date(),
    totalRoutes: routes.length
  });
});

module.exports = router;
