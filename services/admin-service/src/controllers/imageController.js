// Image Controller — Manage images for products and notifications

const logger = require('@sarkari/logger');
const { listImages, uploadImage, getImage, deleteImage, getMimeType } = require('../storage/imageStorage');

/**
 * GET /api/admin/images
 * List all available images in server storage
 */
const listServerImages = async (req, res) => {
  try {
    const images = await listImages();
    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('Error listing images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/images/upload
 * Upload new image to server storage
 */
const uploadServerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const result = await uploadImage(req.file.originalname, req.file.buffer, req.file.mimetype);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/admin/images/serve/:fileName
 * Serve image file from server storage
 */
const serveImage = async (req, res) => {
  try {
    const { fileName } = req.params;

    const buffer = await getImage(decodeURIComponent(fileName));
    const mimeType = getMimeType(fileName);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    logger.error('Error serving image:', error);
    if (error.message === 'Invalid file path') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.status(404).json({ success: false, error: 'Image not found' });
  }
};

/**
 * DELETE /api/admin/images/:fileName
 * Delete image from server storage
 */
const deleteServerImage = async (req, res) => {
  try {
    const { fileName } = req.params;
    await deleteImage(decodeURIComponent(fileName));
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  listServerImages,
  uploadServerImage,
  serveImage,
  deleteServerImage,
};
