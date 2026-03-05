// Admin Service Routes
// All admin CRUD routes for products, notifications, and tags

const express = require('express');
const router = express.Router();
const multer = require('multer');

const tagController = require('../controllers/tagController');
const productController = require('../controllers/productController');
const notificationController = require('../controllers/notificationController');
const imageController = require('../controllers/imageController');

// Multer config — memory storage for MinIO uploads
const upload = multer({ storage: multer.memoryStorage() });

// ─── Image file fields ───
const imageUpload = upload.single('image');

// ─── Product file fields ───
const productUpload = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'digitalFile', maxCount: 1 },
]);

// ─── Notification file fields ───
const notificationUpload = upload.fields([
  { name: 'pdfFile', maxCount: 1 },
]);

// ═══════════════════════════════════════════
// IMAGE ROUTES
// ═══════════════════════════════════════════
router.get('/images', imageController.listServerImages);
router.post('/images/upload', imageUpload, imageController.uploadServerImage);
router.get('/images/serve/:fileName', imageController.serveImage);
router.delete('/images/:fileName', imageController.deleteServerImage);

// ═══════════════════════════════════════════
// TAG ROUTES
// ═══════════════════════════════════════════
router.get('/tags', tagController.getAllTags);
router.post('/tags', tagController.createTag);
router.put('/tags/:id', tagController.updateTag);
router.delete('/tags/:id', tagController.deleteTag);

// ═══════════════════════════════════════════
// PRODUCT ROUTES
// ═══════════════════════════════════════════
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productUpload, productController.createProduct);
router.put('/products/:id', productUpload, productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.patch('/products/:id/toggle', productController.toggleProductField);

// ═══════════════════════════════════════════
// NOTIFICATION ROUTES
// ═══════════════════════════════════════════
router.get('/notifications', notificationController.getAllNotifications);
router.get('/notifications/:id', notificationController.getNotificationById);
router.post('/notifications', notificationUpload, notificationController.createNotification);
router.put('/notifications/:id', notificationUpload, notificationController.updateNotification);
router.delete('/notifications/:id', notificationController.deleteNotification);
router.patch('/notifications/:id/toggle', notificationController.toggleNotificationField);
router.post('/notifications/:id/duplicate', notificationController.duplicateNotification);

// ═══════════════════════════════════════════
// MIGRATION ROUTE (temporary — for testing)
// ═══════════════════════════════════════════
const migrateController = require('../controllers/migrateController');
router.post('/migrate', migrateController.runMigration);

module.exports = router;
