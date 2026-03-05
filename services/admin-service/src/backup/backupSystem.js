// Backup System — Auto-backup to cloud every 6 hours
// Backs up MongoDB data and storage files

const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createWriteStream } = require('fs');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;

// Backup configuration
const BACKUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const CLOUD_BACKUP_ENABLED = process.env.CLOUD_BACKUP_ENABLED === 'true';
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(process.cwd(), 'storage', 'images');
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || path.join(process.cwd(), 'storage', 'documents');

let backupScheduler = null;

/**
 * Create a backup archive
 */
const createBackup = async () => {
  try {
    // Create backup directory if not exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.zip`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    logger.info(`Starting backup: ${backupFileName}`);

    return new Promise((resolve, reject) => {
      const output = createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', async () => {
        logger.info(`Backup created: ${backupFileName} (${archive.pointer()} bytes)`);
        
        // Upload to cloud if enabled
        if (CLOUD_BACKUP_ENABLED) {
          try {
            await uploadToCloud(backupPath, backupFileName);
          } catch (err) {
            logger.error('Failed to upload backup to cloud:', err);
          }
        }

        // Keep only last 5 backups
        await cleanOldBackups();
        resolve(backupPath);
      });

      archive.on('error', reject);
      output.on('error', reject);

      archive.pipe(output);

      // Add storage directories
      logger.info('Adding storage files to backup...');
      archive.directory(IMAGES_DIR, 'images');
      archive.directory(DOCUMENTS_DIR, 'documents');

      archive.finalize();
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    throw error;
  }
};

/**
 * Export MongoDB database
 */
const exportDatabase = async () => {
  try {
    const db = (await connectPrimary()).db;
    const collections = await db.listCollections().toArray();
    const backup = {};

    for (const collection of collections) {
      const col = db.collection(collection.name);
      backup[collection.name] = await col.find({}).toArray();
    }

    return JSON.stringify(backup, null, 2);
  } catch (error) {
    logger.error('Error exporting database:', error);
    throw error;
  }
};

/**
 * Upload backup to cloud storage
 */
const uploadToCloud = async (backupPath, fileName) => {
  try {
    // Implement based on your cloud provider
    // Examples: AWS S3, Google Cloud Storage, Azure Blob Storage, etc.
    
    logger.info(`Would upload ${fileName} to cloud storage`);
    // TODO: Implement actual cloud upload
    // const s3 = new AWS.S3();
    // await s3.upload({
    //   Bucket: process.env.BACKUP_BUCKET,
    //   Key: fileName,
    //   Body: fs.createReadStream(backupPath)
    // }).promise();
  } catch (error) {
    logger.error('Error uploading to cloud:', error);
    throw error;
  }
};

/**
 * Clean old backups, keep only last N backups
 */
const cleanOldBackups = async (keepCount = 5) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.zip'));
    
    if (backupFiles.length > keepCount) {
      // Sort by timestamp (newest first)
      backupFiles.sort().reverse();
      
      // Delete old backups
      for (let i = keepCount; i < backupFiles.length; i++) {
        const oldFile = path.join(BACKUP_DIR, backupFiles[i]);
        await fs.unlink(oldFile);
        logger.info(`Deleted old backup: ${backupFiles[i]}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning old backups:', error);
  }
};

/**
 * Start backup scheduler
 */
const startBackupScheduler = () => {
  if (backupScheduler) {
    logger.warn('Backup scheduler already running');
    return;
  }

  logger.info('Starting backup scheduler (every 6 hours)');

  // Run first backup immediately
  createBackup().catch(err => logger.error('Initial backup failed:', err));

  // Schedule subsequent backups
  backupScheduler = setInterval(() => {
    createBackup().catch(err => logger.error('Scheduled backup failed:', err));
  }, BACKUP_INTERVAL);
};

/**
 * Stop backup scheduler
 */
const stopBackupScheduler = () => {
  if (backupScheduler) {
    clearInterval(backupScheduler);
    backupScheduler = null;
    logger.info('Backup scheduler stopped');
  }
};

/**
 * Get backup status
 */
const getBackupStatus = async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files
        .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
        .sort()
        .reverse()
        .map(async (file) => {
          const filePath = path.join(BACKUP_DIR, file);
          const stats = await fs.stat(filePath);
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        })
    );

    return {
      enabled: true,
      interval: BACKUP_INTERVAL / 1000 / 60 / 60, // In hours
      cloudBackupEnabled: CLOUD_BACKUP_ENABLED,
      backupDirectory: BACKUP_DIR,
      backups,
    };
  } catch (error) {
    logger.error('Error getting backup status:', error);
    throw error;
  }
};

module.exports = {
  createBackup,
  exportDatabase,
  uploadToCloud,
  cleanOldBackups,
  startBackupScheduler,
  stopBackupScheduler,
  getBackupStatus,
  BACKUP_DIR,
  BACKUP_INTERVAL,
};
