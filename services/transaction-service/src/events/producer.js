// RabbitMQ Event Producer

const amqp = require('amqplib');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

let connection = null;
let channel = null;

const connect = async () => {
  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    logger.info('Connected to RabbitMQ');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    process.exit(1);
  }
};

const publishEvent = async (eventType, data) => {
  try {
    if (!channel) await connect();

    const exchange = 'sarkari_events';
    const message = JSON.stringify({ type: eventType, data, timestamp: new Date() });

    await channel.assertExchange(exchange, 'topic', { durable: true });
    channel.publish(exchange, eventType, Buffer.from(message));

    logger.info(`Event published: ${eventType}`);
  } catch (error) {
    logger.error('Error publishing event:', error);
  }
};

module.exports = {
  connect,
  publishEvent
};
