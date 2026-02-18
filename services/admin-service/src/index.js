// Admin Service Entry Point
// Internal service for uploads and management

const express = require('express');
const multer = require('multer');
const logger = require('@sarkari/logger');
const { connectPrimary } = require('@sarkari/database').connection;
const minioClient = require('./storage/minioClient');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Configure multer
const upload = multer({ storage: multer.memoryStorage() });

// Upload route
app.post('/api/admin/upload', upload.single('file'), async (req, res) => {
  try {
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const bucketName = 'products';

    await minioClient.putObject(bucketName, fileName, req.file.buffer, req.file.size);

    logger.info(`File uploaded: ${fileName}`);
    res.json({ fileName, url: `http://minio:9000/${bucketName}/${fileName}` });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await connectPrimary();
    await minioClient.bucketExists('products');
    app.listen(PORT, () => {
      logger.info(`Admin Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Admin Service:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
