// Order Controller

const logger = require('@sarkari/logger');
const { Order } = require('@sarkari/database').models;
const producer = require('../events/producer');

const createOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount } = req.body;

    const order = new Order({
      userId,
      items,
      totalAmount,
      status: 'pending'
    });

    await order.save();
    logger.info(`Order created: ${order._id}`);

    // Publish order created event
    await producer.publishEvent('order.created', {
      orderId: order._id,
      userId,
      totalAmount
    });

    res.status(201).json(order);
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrder
};
