// Cache Invalidation Consumer
// Listens for admin write events and invalidates Redis cache

const amqp = require('amqplib');
const redis = require('redis');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const startConsuming = async () => {
  try {
    // Connect to Redis
    const redisClient = redis.createClient({ url: redisUrl });
    redisClient.on('error', (err) => logger.error('Redis error:', err));
    await redisClient.connect();

    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    const exchange = 'sarkari_events';
    const queue = 'cache_invalidation_queue';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });

    // Listen for product and notification write events
    await channel.bindQueue(queue, exchange, 'product.*');
    await channel.bindQueue(queue, exchange, 'notification.*');
    await channel.bindQueue(queue, exchange, 'tag.*');

    channel.consume(queue, async (msg) => {
      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Cache invalidation event: ${event.type}`);

        let patterns = [];

        if (event.type.startsWith('product.')) {
          patterns = ['products:*'];
        } else if (event.type.startsWith('notification.')) {
          patterns = ['notifications:*'];
        } else if (event.type.startsWith('tag.')) {
          patterns = ['tags:*'];
        }

        for (const pattern of patterns) {
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
            logger.info(`Invalidated ${keys.length} cache keys for: ${pattern}`);
          }
        }

        channel.ack(msg);
      } catch (error) {
        logger.error('Error invalidating cache:', error);
        channel.nack(msg, false, true);
      }
    });

    logger.info('Cache invalidation consumer started — listening for product.*, notification.*, tag.*');
  } catch (error) {
    logger.error('Cache invalidation consumer error:', error);
  }
};

module.exports = { startConsuming };
