// MinIO Client Configuration
// Shared storage client for file uploads

const { Client } = require('minio');
const logger = require('@sarkari/logger');

const minioUrl = new URL(process.env.MINIO_URL || 'http://localhost:9000');
const endPoint = minioUrl.hostname;
const port = parseInt(minioUrl.port || process.env.MINIO_PORT || '9000', 10);
const useSSL = minioUrl.protocol === 'https:' || (process.env.MINIO_USE_SSL || 'false') === 'true';
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

const minioClient = new Client({
  endPoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

// Buckets used across the platform
const BUCKETS = {
  PRODUCTS: 'products',
  DIGITAL: 'digital',
  NOTIFICATIONS: 'notifications',
  AVATARS: 'avatars',
};

/**
 * Ensure all required buckets exist at startup
 */
const ensureBuckets = async () => {
  for (const bucket of Object.values(BUCKETS)) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      // Set public read policy for product images
      if (bucket === BUCKETS.PRODUCTS || bucket === BUCKETS.AVATARS) {
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        });
        await minioClient.setBucketPolicy(bucket, policy);
      }
      logger.info(`Bucket created: ${bucket}`);
    }
  }
  logger.info('All MinIO buckets verified');
};

/**
 * Upload a buffer to MinIO
 * @param {string} bucket - Target bucket
 * @param {string} fileName - Object key / file name
 * @param {Buffer} buffer - File contents
 * @param {number} size - File size in bytes
 * @param {string} mimeType - Content type
 * @returns {object} { key, bucket, url, mimeType, fileSize }
 */
const uploadFile = async (bucket, fileName, buffer, size, mimeType) => {
  const key = `${Date.now()}-${fileName}`;

  await minioClient.putObject(bucket, key, buffer, size, {
    'Content-Type': mimeType,
  });

  const url = `${useSSL ? 'https' : 'http'}://${endPoint}:${port}/${bucket}/${key}`;

  logger.info(`File uploaded: ${bucket}/${key} (${size} bytes)`);

  return {
    key,
    bucket,
    url,
    mimeType,
    fileSize: size,
  };
};

/**
 * Delete an object from MinIO
 */
const deleteFile = async (bucket, key) => {
  if (!key) return;
  await minioClient.removeObject(bucket, key);
  logger.info(`File deleted: ${bucket}/${key}`);
};

/**
 * Generate a presigned URL for temporary access
 */
const getPresignedUrl = async (bucket, key, expirySeconds = 3600) => {
  return minioClient.presignedGetObject(bucket, key, expirySeconds);
};

module.exports = {
  minioClient,
  BUCKETS,
  ensureBuckets,
  uploadFile,
  deleteFile,
  getPresignedUrl,
};
