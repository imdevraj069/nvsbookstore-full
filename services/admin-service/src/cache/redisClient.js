// Redis Client for Admin Service — Cache Invalidation
// Flushes read-service cache keys after admin write operations

const redis = require('redis');
const logger = require('@sarkari/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;

const getClient = async () => {
  if (!client) {
    client = redis.createClient({ url: redisUrl });
    client.on('error', (err) => logger.error('Admin Redis error:', err));
    await client.connect();
    logger.info('Admin Service connected to Redis for cache invalidation');
  }
  return client;
};

/**
 * Flush all cache keys matching patterns for a given resource type
 * @param {'products' | 'notifications' | 'tags'} resourceType
 */
const invalidateCache = async (resourceType) => {
  try {
    const rc = await getClient();
    const pattern = `${resourceType}:*`;
    const keys = await rc.keys(pattern);
    if (keys.length > 0) {
      await rc.del(keys);
      logger.info(`Cache invalidated: deleted ${keys.length} keys matching "${pattern}"`);
    } else {
      logger.info(`Cache invalidation: no keys found for "${pattern}"`);
    }
  } catch (error) {
    // Non-fatal — log but don't throw, so admin operations still succeed
    logger.error('Cache invalidation error (non-fatal):', error);
  }
};

module.exports = { invalidateCache };
