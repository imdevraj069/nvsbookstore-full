// Database Connection Logic
// Handles Primary vs Secondary connections

const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sarkari';

const options = {
  retryWrites: true,
  w: 'majority',
};

const connectPrimary = async () => {
  try {
    await mongoose.connect(mongoUri, {
      ...options,
      readPreference: 'primary'
    });
    console.log('Connected to MongoDB Primary');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
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
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = {
  connectPrimary,
  connectSecondary
};
