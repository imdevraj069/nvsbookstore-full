// Transaction Service Entry Point
// Critical service for auth, payments, orders, cart, and print orders

const express = require('express');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;
const { requireAuth, requireAdmin } = require('@sarkari/auth');
const producer = require('./events/producer');

const authController = require('./controllers/authController');
const orderController = require('./controllers/orderController');
const cartController = require('./controllers/cartController');
const printOrderController = require('./controllers/printOrderController');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'transaction-service' });
});

// ═══════════════════════════════════════════
// AUTH ROUTES (public)
// ═══════════════════════════════════════════
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/google', authController.googleLogin);

// ═══════════════════════════════════════════
// USER-AUTHENTICATED ROUTES
// ═══════════════════════════════════════════
app.get('/api/auth/me', requireAuth, authController.getProfile);
app.put('/api/auth/profile', requireAuth, authController.updateProfile);
app.post('/api/auth/address', requireAuth, authController.addAddress);
app.post('/api/auth/favorites/:productId', requireAuth, authController.toggleFavorite);
app.get('/api/auth/favorites', requireAuth, authController.getFavorites);

// ═══════════════════════════════════════════
// ORDER ROUTES (authenticated)
// ═══════════════════════════════════════════
app.post('/api/orders', requireAuth, orderController.createOrder);
app.get('/api/orders/my', requireAuth, orderController.getUserOrders);
app.get('/api/orders/:orderId', requireAuth, orderController.getOrder);

// Admin-only order routes
app.get('/api/orders', requireAuth, requireAdmin, orderController.getAllOrders);
app.patch('/api/orders/:orderId/status', requireAuth, requireAdmin, orderController.updateOrderStatus);

// ═══════════════════════════════════════════
// CART ROUTES (authenticated)
// ═══════════════════════════════════════════
app.get('/api/cart', requireAuth, cartController.getCart);
app.post('/api/cart/items', requireAuth, cartController.addToCart);
app.put('/api/cart/items/:itemId', requireAuth, cartController.updateCartItem);
app.delete('/api/cart/items/:itemId', requireAuth, cartController.removeFromCart);
app.delete('/api/cart', requireAuth, cartController.clearCart);

// ═══════════════════════════════════════════
// PRINT ORDER ROUTES (authenticated)
// ═══════════════════════════════════════════
app.post('/api/print-orders', requireAuth, printOrderController.createPrintOrder);
app.get('/api/print-orders/my', requireAuth, printOrderController.getUserPrintOrders);
app.get('/api/print-orders/:id', requireAuth, printOrderController.getPrintOrder);

// Admin-only print order routes
app.get('/api/print-orders', requireAuth, requireAdmin, printOrderController.getAllPrintOrders);
app.patch('/api/print-orders/:id/status', requireAuth, requireAdmin, printOrderController.updatePrintOrderStatus);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await connectPrimary();
    await producer.connect();

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
