// Document Routes — Serve and manage documents (PDFs, Office files, etc.)

const express = require('express');
const { getFile, deleteFile, listDocuments } = require('../storage/imageStorage');
const logger = require('@sarkari/logger');

const router = express.Router();

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
