// Database Connection Logic
// Handles Primary vs Secondary connections

const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sarkari';

const options = {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  minPoolSize: 2,
};

const connectPrimary = async () => {
  try {
    await mongoose.connect(mongoUri, {
      ...options,
      readPreference: 'primary'
    });
    console.log('Connected to MongoDB Primary');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    // Retry after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectPrimary().catch(() => {
        process.exit(1);
      });
    }, 5000);
  }
};

const connectSecondary = async () => {
  try {
    await mongoose.connect(mongoUri, {
      ...options,
      readPreference: 'secondary'
    });
    console.log('Connected to MongoDB Secondary');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    // Retry after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectSecondary().catch(() => {
        process.exit(1);
      });
    }, 5000);
  }
};

module.exports = {
  connectPrimary,
  connectSecondary
};
