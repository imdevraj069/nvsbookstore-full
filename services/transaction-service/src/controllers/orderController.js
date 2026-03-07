// Order Controller — Full order lifecycle with Razorpay verification

const logger = require('@sarkari/logger');
const { Order, Product, Cart } = require('@sarkari/database').models;
const producer = require('../events/producer');
const Razorpay = require('razorpay');
const path = require('path');
const fs = require('fs');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/orders/razorpay
 * Create a Razorpay order (returns order ID for frontend checkout)
 */
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body; // amount in paise (₹1 = 100 paise)

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount), // in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    });

    res.json({ success: true, data: { orderId: order.id, amount: order.amount, currency: order.currency } });
  } catch (error) {
    logger.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/orders
 * Create order with Razorpay payment verification
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
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

    // Snapshot product titles and format-aware prices into order items
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product).lean();
      if (!product) {
        return res.status(400).json({ success: false, error: `Product not found: ${item.product}` });
      }

      // Use format-aware pricing
      let itemPrice = product.price;
      if (item.format === 'digital') {
        if (item.subFormat === 'print-on-demand') {
          itemPrice = product.printPrice || product.price;
        } else {
          itemPrice = product.digitalPrice || product.price;
        }
      }

      orderItems.push({
        product: item.product,
        title: product.title,
        price: itemPrice,
        quantity: item.quantity,
        format: item.format || 'physical',
        subFormat: item.subFormat || '',
      });
    }

    // Digital-only orders (no physical/POD items) are delivered instantly
    const isDigitalOnly = orderItems.every(
      (oi) => oi.format === 'digital' && oi.subFormat !== 'print-on-demand'
    );

    const order = await Order.create({
      customerId: userId,
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
      status: isDigitalOnly ? 'delivered' : (paymentMethod === 'cod' ? 'pending' : 'paid'),
    });

    // Clear user's cart after successful order
    try {
      await Cart.findOneAndUpdate({ userId }, { items: [] });
    } catch (cartErr) {
      logger.warn('Failed to clear cart after order:', cartErr);
    }

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
    const { status, trackingNumber } = req.body;

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updateFields = { status };
    if (trackingNumber !== undefined) {
      updateFields.trackingNumber = trackingNumber;
    }

    const order = await Order.findByIdAndUpdate(orderId, updateFields, { new: true }).populate('items.product');
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

/**
 * GET /api/orders/:orderId/invoice
 * Serve the invoice PDF for an order
 */
const getInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check authorization: owner or admin
    if (order.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Try to find invoice file
    const invoiceDir = '/root/storage/invoices';
    const filename = order.invoicePath || `invoice_${order._id}.pdf`;
    const filePath = path.join(invoiceDir, path.basename(filename));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Invoice not yet generated. Please try again shortly.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    logger.error('Error serving invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/orders/:orderId/tracking
 * Update tracking number for an order (admin)
 * Only applies to orders with physical or print-on-demand items.
 */
const updateOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber } = req.body;

    if (trackingNumber === undefined || trackingNumber === null) {
      return res.status(400).json({ success: false, error: 'trackingNumber is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Only allow tracking for orders that have at least one physical/POD item
    const hasPhysical = (order.items || []).some(
      (item) => item.format === 'physical' || item.subFormat === 'print-on-demand'
    );
    if (!hasPhysical) {
      return res.status(400).json({ success: false, error: 'Tracking is only for orders with physical products' });
    }

    order.trackingNumber = trackingNumber;
    await order.save();

    const populated = await Order.findById(orderId).populate('items.product');
    logger.info(`Order ${orderId} tracking → ${trackingNumber}`);
    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error('Error updating order tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  createOrder,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  updateOrderTracking,
  getAllOrders,
  getInvoice,
};
