// Worker Service Entry Point
// Background service for emails and PDF generation

const logger = require('@sarkari/logger');
const { connectSecondary } = require('@sarkari/database').connection;
const emailConsumer = require('./consumers/emailConsumer');
const invoiceConsumer = require('./consumers/invoiceConsumer');

const start = async () => {
  try {
    await connectSecondary();
    
    logger.info('Worker Service started');
    logger.info('Starting email consumer...');
    await emailConsumer.startConsuming();
    
    logger.info('Starting invoice consumer...');
    await invoiceConsumer.startConsuming();
  } catch (error) {
    logger.error('Failed to start Worker Service:', error);
    process.exit(1);
  }
};

start();
