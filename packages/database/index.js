// Shared Database Package
// Exports models and connection logic

const connection = require('./src/connection');

module.exports = {
  connection,
  models: {
    User: require('./src/models/User'),
    Product: require('./src/models/Product'),
    Order: require('./src/models/Order'),
    ExamResult: require('./src/models/ExamResult')
  }
};
