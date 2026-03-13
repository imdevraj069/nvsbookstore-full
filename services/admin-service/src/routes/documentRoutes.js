const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const {
  getFile,
  deleteFile,
  listDocuments,
  uploadDocument,
  DOCUMENTS_DIR,
  IMAGES_DIR,
} = require('../storage/imageStorage');
const {
  initializeUploadSession,
  saveChunk,
  getUploadProgress,
  finalizeUpload,
  abortUpload,
  CHUNK_SIZE,
} = require('../storage/chunkUpload');
const logger = require('@sarkari/logger');

const router = express.Router();

// Multer for single chunk uploads (50 MB limit per chunk)
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CHUNK_SIZE,
  },
});

// Legacy upload with 50 MB limit
const legacyUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit for single upload
  },
});

/**
 * POST /api/admin/documents/chunk/init
 * Initialize chunked upload session
 * Body: { fileName, totalSize, mimeType }
 */
router.post('/chunk/init', async (req, res) => {
  try {
    const { fileName, totalSize, mimeType } = req.body;

    if (!fileName || !totalSize || !mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileName, totalSize, mimeType',
      });
    }

    if (totalSize > 500 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'File size exceeds 500 MB limit',
      });
    }

    const result = await initializeUploadSession(fileName, totalSize, mimeType);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error initializing chunked upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/documents/chunk/upload
 * Upload a single chunk
 * Params: { sessionId, chunkIndex }
 * Body: FormData with 'chunk' file and optional 'hash' field
 */
router.post('/chunk/upload', chunkUpload.single('chunk'), async (req, res) => {
  try {
    const { sessionId, chunkIndex } = req.query;
    const chunkHash = req.body?.hash || req.query?.hash;

    if (!sessionId || chunkIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query params: sessionId, chunkIndex',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No chunk data provided',
      });
    }

    const chunkIndexNum = parseInt(chunkIndex, 10);
    if (isNaN(chunkIndexNum) || chunkIndexNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chunkIndex',
      });
    }

    const result = await saveChunk(sessionId, chunkIndexNum, req.file.buffer, chunkHash);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error uploading chunk:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/documents/chunk/progress/:sessionId
 * Get upload progress for a session
 */
router.get('/chunk/progress/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
      });
    }

    const result = await getUploadProgress(sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting upload progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/documents/chunk/finalize
 * Finalize chunked upload and reassemble file
 * Body: { sessionId }
 */
router.post('/chunk/finalize', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
      });
    }

    const fileData = await finalizeUpload(sessionId, DOCUMENTS_DIR, 'document');

    // Return file data like regular upload
    const result = {
      fileName: fileData.fileName,
      path: `/files/serve/${encodeURIComponent(fileData.fileName)}?type=document`,
      size: fileData.size,
      mimeType: fileData.mimeType,
      uploadedAt: fileData.uploadedAt,
    };

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error finalizing chunked upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/documents/chunk/abort
 * Abort upload session and clean up chunks
 * Body: { sessionId }
 */
router.post('/chunk/abort', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
      });
    }

    const result = await abortUpload(sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error aborting upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/documents/upload
 * Legacy single-file upload (non-chunked)
 * For files under 50 MB
 */
router.post('/upload', legacyUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    // For files over 50 MB, recommend chunked upload
    if (req.file.size > 50 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'File too large for single upload. Use chunked upload API instead.',
        suggestedEndpoint: '/api/admin/documents/chunk/init',
      });
    }

    const result = await uploadDocument(req.file.originalname, req.file.buffer, req.file.mimetype);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/documents/list
 * List all documents in storage
 */
router.get('/list', async (req, res) => {
  try {
    const documents = await listDocuments();
    res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Error listing documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/documents/serve/:fileName
 * Serve a document file (PDF, DOCX, etc.)
 */
router.get('/serve/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const fileData = await getFile(fileName, 'document');

    if (!fileData) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.set('Content-Type', fileData.mimeType);
    res.set('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
    res.send(fileData.buffer);
  } catch (error) {
    logger.error(`Error serving document ${req.params.fileName}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/documents/:fileName
 * Delete a document file
 */
router.delete('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    await deleteFile(fileName, 'document');
    logger.info(`Document deleted: ${fileName}`);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting document ${req.params.fileName}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
