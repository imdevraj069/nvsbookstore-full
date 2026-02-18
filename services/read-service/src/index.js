// Read Service Entry Point
// High-traffic service for exam results and product browsing

const express = require('express');
const logger = require('@sarkari/logger');
const { connectSecondary } = require('@sarkari/database').connection;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Import routes
const routes = require('./routes');

app.use('/api/results', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await connectSecondary();
    app.listen(PORT, () => {
      logger.info(`Read Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Read Service:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
