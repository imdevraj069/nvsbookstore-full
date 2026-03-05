// File Storage — Server-side file system storage for images and documents
// Admin can browse, upload, and manage images and PDFs from shared directories

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('@sarkari/logger');

// Storage directories — use home directory on Ubuntu server
const homeDir = os.homedir();
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(homeDir, 'storage', 'images');
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || path.join(homeDir, 'storage', 'documents');

/**
 * Initialize storage directories
 */
const initializeStorageDirs = async () => {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
    logger.info(`Storage directories initialized`);
    logger.info(`  Images: ${IMAGES_DIR}`);
    logger.info(`  Documents: ${DOCUMENTS_DIR}`);
  } catch (error) {
    logger.error('Failed to initialize storage directories:', error);
    throw error;
  }
};

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
 * List files from a directory
 */
const listFiles = async (directory, allowedExts) => {
  try {
    const files = await fs.readdir(directory);
    const fileList = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return allowedExts.includes(ext);
    });

    const results = await Promise.all(
      fileList.map(async (file) => {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        const ext = path.extname(file).toLowerCase();
        const mimeType = getMimeType(file);

        return {
          fileName: file,
          path: `/api/admin/files/serve/${encodeURIComponent(file)}?type=${path.basename(directory)}`,
          localPath: filePath,
          size: stats.size,
          mimeType,
          uploadedAt: stats.mtime,
        };
      })
    );

    return results;
  } catch (error) {
    logger.error('Error listing files:', error);
    throw error;
  }
};

/**
 * List all images in the directory
 */
const listImages = async () => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return listFiles(IMAGES_DIR, imageExts);
};

/**
 * List all documents in the directory
 */
const listDocuments = async () => {
  const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  return listFiles(DOCUMENTS_DIR, docExts);
};

/**
 * Get file from disk
 */
const getFile = async (fileName, type = 'image') => {
  try {
    const sanitized = path.basename(fileName);
    const targetDir = type === 'image' ? IMAGES_DIR : DOCUMENTS_DIR;
    const filePath = path.join(targetDir, sanitized);

    const resolved = path.resolve(filePath);
    const resolvedDir = path.resolve(targetDir);
    if (!resolved.startsWith(resolvedDir)) {
      throw new Error('Invalid file path');
    }

    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (error) {
    logger.error(`Error retrieving ${type}:`, error);
    throw error;
  }
};

/**
 * Delete file from server storage
 */
const deleteFile = async (fileName, type = 'image') => {
  try {
    const sanitized = path.basename(fileName);
    const targetDir = type === 'image' ? IMAGES_DIR : DOCUMENTS_DIR;
    const filePath = path.join(targetDir, sanitized);

    const resolved = path.resolve(filePath);
    const resolvedDir = path.resolve(targetDir);
    if (!resolved.startsWith(resolvedDir)) {
      throw new Error('Invalid file path');
    }

    await fs.unlink(filePath);
    logger.info(`${type === 'image' ? 'Image' : 'Document'} deleted: ${sanitized}`);
  } catch (error) {
    logger.error(`Error deleting ${type}:`, error);
    throw error;
  }
};

/**
 * Delete image from server storage
 */
const deleteImage = async (fileName) => {
  return deleteFile(fileName, 'image');
};

/**
 * Get image file from disk
 */
const getImage = async (fileName) => {
  return getFile(fileName, 'image');
};

/**
 * Upload file to server storage
 */
const uploadFile = async (fileName, buffer, mimeType, type = 'image') => {
  try {
    const sanitized = path.basename(fileName);
    const ext = path.extname(sanitized).toLowerCase();
    
    // Determine directory and allowed extensions
    let targetDir, allowedExts;
    if (type === 'image') {
      targetDir = IMAGES_DIR;
      allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    } else if (type === 'document') {
      targetDir = DOCUMENTS_DIR;
      allowedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    } else {
      throw new Error('Invalid file type');
    }

    if (!allowedExts.includes(ext)) {
      throw new Error(`File type not allowed. Allowed: ${allowedExts.join(', ')}`);
    }

    const uniqueFileName = `${Date.now()}-${sanitized}`;
    const filePath = path.join(targetDir, uniqueFileName);

    await fs.writeFile(filePath, buffer);

    logger.info(`${type === 'image' ? 'Image' : 'Document'} uploaded: ${uniqueFileName} (${buffer.length} bytes)`);

    return {
      fileName: uniqueFileName,
      path: `/api/admin/files/serve/${encodeURIComponent(uniqueFileName)}?type=${type}`,
      localPath: filePath,
      size: buffer.length,
      mimeType,
      uploadedAt: new Date(),
    };
  } catch (error) {
    logger.error(`Error uploading ${type}:`, error);
    throw error;
  }
};

/**
 * Upload image from buffer to server storage
 */
const uploadImage = async (fileName, buffer, mimeType) => {
  return uploadFile(fileName, buffer, mimeType, 'image');
};

/**
 * Upload document from buffer to server storage
 */
const uploadDocument = async (fileName, buffer, mimeType) => {
  return uploadFile(fileName, buffer, mimeType, 'document');
};

/**
 * Get MIME type for file extension
 */
const getMimeType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

module.exports = {
  initializeStorageDirs,
  initializeImageDir,
  listImages,
  listDocuments,
  uploadImage,
  uploadDocument,
  uploadFile,
  getImage,
  getFile,
  deleteImage,
  deleteFile,
  getMimeType,
  IMAGES_DIR,
  DOCUMENTS_DIR,
};
