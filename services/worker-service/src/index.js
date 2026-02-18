// Worker Service Entry Point
// Background service for emails, PDF invoice generation, and cache invalidation

const logger = require('@sarkari/logger');
const { connectSecondary } = require('@sarkari/database').connection;
const emailConsumer = require('./consumers/emailConsumer');
const invoiceConsumer = require('./consumers/invoiceConsumer');
const cacheConsumer = require('./consumers/cacheConsumer');

const start = async () => {
  try {
    await connectSecondary();

    logger.info('Worker Service starting...');

    logger.info('Starting email consumer...');
    await emailConsumer.startConsuming();

    logger.info('Starting invoice consumer...');
    await invoiceConsumer.startConsuming();

    logger.info('Starting cache invalidation consumer...');
    await cacheConsumer.startConsuming();

    logger.info('Worker Service fully started — all consumers active');
  } catch (error) {
    logger.error('Failed to start Worker Service:', error);
    process.exit(1);
  }
};

start();
