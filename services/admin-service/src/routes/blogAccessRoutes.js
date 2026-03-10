// Blog Access Routes — Admin Service
// Routes for managing blog writer invitations and permissions

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('@sarkari/auth');
const blogAccessController = require('../controllers/blogAccessController');

// Admin-only routes
router.get('/', requireAdmin, blogAccessController.listBlogAccess);
router.post('/', requireAdmin, blogAccessController.inviteWriter);
router.delete('/:id', requireAdmin, blogAccessController.revokeBlogAccess);

// Auth required (user can accept/reject own invite; admin can update anything)
router.put('/:id', blogAccessController.updateBlogAccess);

module.exports = router;
