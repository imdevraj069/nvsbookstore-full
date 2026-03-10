// Blog Routes — Admin Service
// Writer and admin routes for blog CRUD and image upload

const express = require('express');
const router = express.Router();
const multer = require('multer');
const blogController = require('../controllers/blogController');

const upload = multer({ storage: multer.memoryStorage() });

// Blog CRUD — requireAuth applied at app level
router.get('/my', blogController.getMyBlogs);
router.get('/:slug', blogController.getBlog);
router.post('/', blogController.createBlog);
router.put('/:slug', blogController.updateBlog);
router.delete('/:slug', blogController.deleteBlog);

// Blog image upload
router.post('/upload-image', upload.single('image'), blogController.uploadBlogImage);

module.exports = router;
