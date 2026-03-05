// Backup Routes — Admin control for backups and restore

const express = require('express');
const { createBackup, getBackupStatus, BACKUP_DIR } = require('../backup/backupSystem');
const logger = require('@sarkari/logger');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

/**
 * GET /api/admin/backups/status
 * Get backup status and list of available backups
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getBackupStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Error getting backup status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/backups/create
 * Manually trigger a backup
 */
router.post('/create', async (req, res) => {
  try {
    logger.info('Manual backup requested');
    const backupPath = await createBackup();
    res.json({
      success: true,
      message: 'Backup created successfully',
      backupPath: path.basename(backupPath),
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/backups/download/:fileName
 * Download a specific backup file
 */
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    // Security check: prevent path traversal
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid file name' });
    }

    const backupPath = path.join(BACKUP_DIR, fileName);

    // Verify file exists in backup directory
    const stat = await fs.stat(backupPath);
    if (!stat.isFile()) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }

    res.download(backupPath, fileName, (err) => {
      if (err) {
        logger.error(`Error downloading backup ${fileName}:`, err);
      } else {
        logger.info(`Backup downloaded: ${fileName}`);
      }
    });
  } catch (error) {
    logger.error(`Error preparing backup download ${req.params.fileName}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
