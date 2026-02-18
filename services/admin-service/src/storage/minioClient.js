// MinIO Client Configuration

const { Client } = require('minio');
const logger = require('@sarkari/logger');

const minioUrl = process.env.MINIO_URL || 'http://localhost:9000';
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

const client = new Client({
  endPoint: minioUrl.replace('http://', ''),
  accessKey,
  secretKey,
  useSSL: false
});

client.setBucketNotification('products', null).catch(err => {
  logger.info('No existing notifications');
});

logger.info('MinIO client initialized');

module.exports = client;
