// Shared Database Package
// Exports models and connection logic

const connection = require('./src/connection');

module.exports = {
  connection,
  models: {
    User: require('./src/models/User'),
    Product: require('./src/models/Product'),
    Order: require('./src/models/Order'),
    Notification: require('./src/models/Notification'),
    Tag: require('./src/models/Tag'),
    Cart: require('./src/models/Cart'),
    PrintOrder: require('./src/models/PrintOrder'),
  },
};
