// Image Storage — Server-side file system storage for images
// Admin can browse, upload, and manage images from a shared directory

const fs = require('fs').promises;
const path = require('path');
const logger = require('@sarkari/logger');

// Image storage directory
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(process.cwd(), 'storage', 'images');

/**
 * Initialize images directory if it doesn't exist
 */
const initializeImageDir = async () => {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    logger.info(`Image directory initialized: ${IMAGES_DIR}`);
  } catch (error) {
    logger.error('Failed to initialize image directory:', error);
    throw error;
  }
};

/**
 * List all images in the directory
 * @returns {Promise<Array>} Array of image objects with metadata
 */
const listImages = async () => {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });

    const imageList = await Promise.all(
      imageFiles.map(async (file) => {
        const filePath = path.join(IMAGES_DIR, file);
        const stats = await fs.stat(filePath);
        const ext = path.extname(file).toLowerCase();

        // Map extension to MIME type
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
        };

        return {
          fileName: file,
          path: `/api/admin/images/serve/${encodeURIComponent(file)}`,
          localPath: filePath,
          size: stats.size,
          mimeType: mimeTypes[ext] || 'image/jpeg',
          uploadedAt: stats.mtime,
        };
      })
    );

    return imageList;
  } catch (error) {
    logger.error('Error listing images:', error);
    throw error;
  }
};

/**
 * Upload image from buffer to server storage
 * @param {string} fileName - Original file name
 * @param {Buffer} buffer - File contents
 * @param {string} mimeType - Content type
 * @returns {Promise<Object>} Upload result with metadata
 */
const uploadImage = async (fileName, buffer, mimeType) => {
  try {
    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(fileName);
    const ext = path.extname(sanitized).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    if (!allowedExts.includes(ext)) {
      throw new Error(`File type not allowed. Allowed: ${allowedExts.join(', ')}`);
    }

    // Generate unique filename by prepending timestamp
    const uniqueFileName = `${Date.now()}-${sanitized}`;
    const filePath = path.join(IMAGES_DIR, uniqueFileName);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    logger.info(`Image uploaded: ${uniqueFileName} (${buffer.length} bytes)`);

    return {
      fileName: uniqueFileName,
      path: `/api/admin/images/serve/${encodeURIComponent(uniqueFileName)}`,
      localPath: filePath,
      size: buffer.length,
      mimeType,
      uploadedAt: new Date(),
    };
  } catch (error) {
    logger.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Get image file from disk
 * @param {string} fileName - File name to retrieve
 * @returns {Promise<Buffer>} File contents
 */
const getImage = async (fileName) => {
  try {
    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(fileName);
    const filePath = path.join(IMAGES_DIR, sanitized);

    // Ensure file is within IMAGES_DIR (security)
    const resolved = path.resolve(filePath);
    const resolvedDir = path.resolve(IMAGES_DIR);
    if (!resolved.startsWith(resolvedDir)) {
      throw new Error('Invalid file path');
    }

    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (error) {
    logger.error('Error retrieving image:', error);
    throw error;
  }
};

/**
 * Delete image from server storage
 * @param {string} fileName - File name to delete
 */
const deleteImage = async (fileName) => {
  try {
    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(fileName);
    const filePath = path.join(IMAGES_DIR, sanitized);

    // Ensure file is within IMAGES_DIR (security)
    const resolved = path.resolve(filePath);
    const resolvedDir = path.resolve(IMAGES_DIR);
    if (!resolved.startsWith(resolvedDir)) {
      throw new Error('Invalid file path');
    }

    await fs.unlink(filePath);
    logger.info(`Image deleted: ${sanitized}`);
  } catch (error) {
    logger.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Get MIME type for file extension
 */
const getMimeType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

module.exports = {
  initializeImageDir,
  listImages,
  uploadImage,
  getImage,
  deleteImage,
  getMimeType,
  IMAGES_DIR,
};
