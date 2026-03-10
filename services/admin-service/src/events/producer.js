// RabbitMQ Event Producer — Admin Service
// Publishes events for worker-service consumers (e.g., invitation emails)

const amqp = require('amqplib');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

let connection = null;
let channel = null;

const connect = async () => {
  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    logger.info('Admin Service connected to RabbitMQ');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    // Don't exit — admin service should work without RabbitMQ for non-email features
  }
};

const publishEvent = async (eventType, data) => {
  try {
    if (!channel) await connect();
    if (!channel) {
      logger.warn(`RabbitMQ not available, skipping event: ${eventType}`);
      return;
    }

    const exchange = 'sarkari_events';
    const message = JSON.stringify({ type: eventType, data, timestamp: new Date() });

    await channel.assertExchange(exchange, 'topic', { durable: true });
    channel.publish(exchange, eventType, Buffer.from(message));

    logger.info(`Event published: ${eventType}`);
  } catch (error) {
    logger.error('Error publishing event:', error);
  }
};

module.exports = { connect, publishEvent };
