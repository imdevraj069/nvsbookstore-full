// Redis Client Configuration

const redis = require('redis');
const logger = require('@sarkari/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = redis.createClient({
  url: redisUrl
});

client.on('error', (err) => logger.error('Redis error:', err));
client.on('connect', () => logger.info('Connected to Redis'));

// Connect to Redis
client.connect();

module.exports = client;
