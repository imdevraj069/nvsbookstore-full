// Cache Manager — Intelligent cache management with automatic invalidation
// Resets Redis cache on product/notification changes for lag-free navigation

const redis = require('redis');
const logger = require('@sarkari/logger');

// Cache configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_EXPIRY = {
  PRODUCTS: 30 * 60, // 30 minutes
  NOTIFICATIONS: 15 * 60, // 15 minutes
  TAGS: 60 * 60, // 1 hour
  SEARCH: 10 * 60, // 10 minutes
  USER: 5 * 60, // 5 minutes
};

let redisClient = null;

/**
 * Initialize Redis client
 */
const initializeRedis = async () => {
  if (redisClient) return redisClient;

  try {
    redisClient = redis.createClient({ url: REDIS_URL });
    
    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis for caching');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
};

/**
 * Get cached value
 */
const get = async (key) => {
  try {
    if (!redisClient) return null;
    const value = await redisClient.get(key);
    if (value) {
      logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(value);
    }
    logger.debug(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    logger.warn(`Cache get error for ${key}:`, error.message);
    return null;
  }
};

/**
 * Set cached value
 */
const set = async (key, value, expirySeconds = 3600) => {
  try {
    if (!redisClient) return;
    await redisClient.setEx(key, expirySeconds, JSON.stringify(value));
    logger.debug(`Cache SET: ${key} (expires in ${expirySeconds}s)`);
  } catch (error) {
    logger.warn(`Cache set error for ${key}:`, error.message);
  }
};

/**
 * Delete cached value
 */
const del = async (key) => {
  try {
    if (!redisClient) return;
    const result = await redisClient.del(key);
    if (result > 0) {
      logger.debug(`Cache DEL: ${key}`);
    }
  } catch (error) {
    logger.warn(`Cache delete error for ${key}:`, error.message);
  }
};

/**
 * Invalidate product cache
 */
const invalidateProducts = async () => {
  try {
    if (!redisClient) return;

    // Keys to invalidate
    const patterns = [
      'products:*',
      'product:*',
      'products-list',
      'featured-products',
      'search:products:*',
    ];

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Invalidated ${keys.length} product cache keys matching: ${pattern}`);
      }
    }
  } catch (error) {
    logger.warn('Error invalidating product cache (non-fatal):', error.message);
  }
};

/**
 * Invalidate notification cache
 */
const invalidateNotifications = async () => {
  try {
    if (!redisClient) return;

    const patterns = [
      'notifications:*',
      'notification:*',
      'notifications-list',
      'notifications-count',
    ];

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Invalidated ${keys.length} notification cache keys matching: ${pattern}`);
      }
    }
  } catch (error) {
    logger.warn('Error invalidating notification cache (non-fatal):', error.message);
  }
};

/**
 * Invalidate tags cache
 */
const invalidateTags = async () => {
  try {
    if (!redisClient) return;

    const patterns = [
      'tags:*',
      'tag:*',
      'tags-list',
    ];

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Invalidated ${keys.length} tag cache keys matching: ${pattern}`);
      }
    }
  } catch (error) {
    logger.warn('Error invalidating tags cache (non-fatal):', error.message);
  }
};

/**
 * Invalidate user cache
 */
const invalidateUser = async (userId) => {
  try {
    if (!redisClient) return;

    const patterns = [
      `user:${userId}:*`,
      `user-cart:${userId}`,
      `user-orders:${userId}`,
      `user-wishlist:${userId}`,
    ];

    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Invalidated ${keys.length} user cache keys for userId: ${userId}`);
      }
    }
  } catch (error) {
    logger.warn(`Error invalidating cache for user ${userId} (non-fatal):`, error.message);
  }
};

/**
 * Clear all cache
 */
const clearAll = async () => {
  try {
    if (!redisClient) return;
    await redisClient.flushDb();
    logger.warn('All cache cleared');
  } catch (error) {
    logger.warn('Error clearing all cache (non-fatal):', error.message);
  }
};

/**
 * Get cache statistics
 */
const getStats = async () => {
  try {
    if (!redisClient) {
      return {
        status: 'disconnected',
        message: 'Redis not initialized',
      };
    }
    
    const info = await redisClient.info('memory');
    const keys = await redisClient.keys('*');

    return {
      status: 'connected',
      totalKeys: keys.length,
      memory: {
        used: info.used_memory_human,
        peak: info.used_memory_peak_human,
      },
      defaultExpiry: CACHE_EXPIRY,
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};

/**
 * Warm cache on startup
 */
const warmCache = async () => {
  try {
    if (!redisClient) return; // Skip if Redis not initialized
    logger.info('Warming cache on startup...');
    
    // Will be populated by controllers on first request
    logger.info('Cache ready for warming');
  } catch (error) {
    logger.warn('Error warming cache (non-fatal):', error.message);
  }
};

/**
 * Close Redis connection
 */
const disconnect = async () => {
  try {
    if (redisClient) {
      await redisClient.disconnect();
      redisClient = null;
      logger.info('Disconnected from Redis');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
};

module.exports = {
  // Initialization
  initializeRedis,
  warmCache,
  disconnect,

  // Basic operations
  get,
  set,
  del,
  clearAll,

  // Invalidation by entity
  invalidateProducts,
  invalidateNotifications,
  invalidateTags,
  invalidateUser,

  // Utilities
  getStats,
  CACHE_EXPIRY,
};
