// Transaction Service Entry Point
// Critical service for payments and orders

const express = require('express');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Import controllers
const orderController = require('./controllers/orderController');

app.post('/api/orders', orderController.createOrder);
app.get('/api/orders/:orderId', orderController.getOrder);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await connectPrimary();
    app.listen(PORT, () => {
      logger.info(`Transaction Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Transaction Service:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
