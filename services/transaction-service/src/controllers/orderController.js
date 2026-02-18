// Order Controller — Full order lifecycle with Razorpay verification

const logger = require('@sarkari/logger');
const { Order, Product } = require('@sarkari/database').models;
const producer = require('../events/producer');

/**
 * POST /api/orders
 * Create order with Razorpay payment verification
 */
const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod,
      price,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Razorpay signature verification for online payments
    if (paymentMethod !== 'cod') {
      const crypto = require('crypto');
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Payment verification failed' });
      }
    }

    // Snapshot product titles into order items
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product).lean();
      if (!product) {
        return res.status(400).json({ success: false, error: `Product not found: ${item.product}` });
      }
      orderItems.push({
        product: item.product,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        format: item.format || 'physical',
      });
    }

    const order = await Order.create({
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items: orderItems,
      paymentMethod,
      price,
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      razorpaySignature: razorpaySignature || '',
      status: paymentMethod === 'cod' ? 'pending' : 'paid',
    });

    // Populate for response
    const populated = await Order.findById(order._id).populate('items.product');

    // Publish event for email/invoice workers
    await producer.publishEvent('order.created', {
      orderId: order._id.toString(),
      customerName,
      customerEmail,
      items: orderItems,
      total: price.total,
    });

    logger.info(`Order created: ${order._id}`);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/orders/:orderId
 */
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.product');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/orders/my
 * Get all orders for the authenticated user
 */
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (admin)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true }).populate('items.product');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Publish status update event
    await producer.publishEvent('order.status_updated', {
      orderId: order._id.toString(),
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      status: order.status,
    });

    logger.info(`Order ${orderId} status → ${status}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/orders (admin — all orders)
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error('Error fetching all orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  getAllOrders,
};
