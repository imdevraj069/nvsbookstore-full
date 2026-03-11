// Admin Service Routes
// All admin CRUD routes for products, notifications, tags, documents, and backups

const express = require('express');
const router = express.Router();
const multer = require('multer');

const tagController = require('../controllers/tagController');
const productController = require('../controllers/productController');
const notificationController = require('../controllers/notificationController');
const imageController = require('../controllers/imageController');
const documentRoutes = require('./documentRoutes');
const backupRoutes = require('./backupRoutes');
const cacheRoutes = require('./cacheRoutes');

// Multer config — memory storage for server uploads
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
// SETTINGS ROUTES (site-wide settings, banners)
// ═══════════════════════════════════════════
const settingsController = require('../controllers/settingsController');
router.get('/settings', settingsController.getAllSettings);
router.put('/settings/banners', settingsController.updateBanners);
router.put('/settings/company', settingsController.updateCompanySettings);
router.patch('/settings/maintenance', settingsController.toggleMaintenanceMode);

// ═══════════════════════════════════════════
// MIGRATION ROUTE (temporary — for testing)
// ═══════════════════════════════════════════
const migrateController = require('../controllers/migrateController');
router.post('/migrate', migrateController.runMigration);

// ═══════════════════════════════════════════
// DOCUMENT ROUTES (managed files like PDFs)
// ═══════════════════════════════════════════
router.use('/documents', documentRoutes);

// ═══════════════════════════════════════════
// BACKUP ROUTES (automated backup management)
// ═══════════════════════════════════════════
router.use('/backups', backupRoutes);

// ═══════════════════════════════════════════
// CACHE ROUTES (cache management and stats)
// ═══════════════════════════════════════════
router.use('/cache', cacheRoutes);

// ═══════════════════════════════════════════
// FEEDBACK ROUTES (admin management)
// ═══════════════════════════════════════════
const feedbackController = require('../controllers/feedbackController');
router.get('/feedback', feedbackController.listFeedback);
router.put('/feedback/:id', feedbackController.updateFeedback);
router.delete('/feedback/:id', feedbackController.deleteFeedback);

// ═══════════════════════════════════════════
// REVIEW ROUTES (admin moderation)
// ═══════════════════════════════════════════
const reviewController = require('../controllers/reviewController');
router.get('/reviews', reviewController.listReviews);
router.put('/reviews/:id', reviewController.updateReview);
router.delete('/reviews/:id', reviewController.deleteReview);

module.exports = router;
