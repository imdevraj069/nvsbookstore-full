// Print Order Controller — Print-on-demand order management

const logger = require('@sarkari/logger');
const { PrintOrder, Product } = require('@sarkari/database').models;
const producer = require('../events/producer');

/**
 * POST /api/print-orders
 * Create a print-on-demand order
 */
const createPrintOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      address,
      items,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one item required' });
    }

    // Validate items and snapshot titles + prices
    const orderItems = [];
    let totalPrice = 0;

    for (const item of items) {
      const product = await Product.findById(item.product).lean();
      if (!product) {
        return res.status(400).json({ success: false, error: `Product not found: ${item.product}` });
      }
      if (!product.isPrintable) {
        return res.status(400).json({ success: false, error: `Product not printable: ${product.title}` });
      }

      const copies = item.copies || 1;
      const pricePerCopy = product.printPrice;
      totalPrice += pricePerCopy * copies;

      orderItems.push({
        product: item.product,
        title: product.title,
        copies,
        pricePerCopy,
        details: item.details || {},
      });
    }

    const printOrder = await PrintOrder.create({
      customerId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      address,
      items: orderItems,
      totalPrice,
      paymentMethod: paymentMethod || 'razorpay',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      status: 'paid',
    });

    // Publish event for email notification
    await producer.publishEvent('print_order.created', {
      orderId: printOrder._id.toString(),
      customerName,
      customerEmail,
      items: orderItems,
      totalPrice,
    });

    logger.info(`Print order created: ${printOrder._id}`);
    res.status(201).json({ success: true, data: printOrder });
  } catch (error) {
    logger.error('Error creating print order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/print-orders/:id
 */
const getPrintOrder = async (req, res) => {
  try {
    const order = await PrintOrder.findById(req.params.id).populate('items.product');
    if (!order) {
      return res.status(404).json({ success: false, error: 'Print order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error fetching print order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/print-orders/my
 */
const getUserPrintOrders = async (req, res) => {
  try {
    const orders = await PrintOrder.find({ customerId: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error('Error fetching user print orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/print-orders/:id/status
 */
const updatePrintOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'printing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const order = await PrintOrder.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Print order not found' });
    }

    await producer.publishEvent('print_order.status_updated', {
      orderId: order._id.toString(),
      customerEmail: order.customerEmail,
      status: order.status,
    });

    logger.info(`Print order ${id} status → ${status}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating print order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/print-orders (admin — all)
 */
const getAllPrintOrders = async (req, res) => {
  try {
    const orders = await PrintOrder.find({})
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error('Error fetching all print orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createPrintOrder,
  getPrintOrder,
  getUserPrintOrders,
  updatePrintOrderStatus,
  getAllPrintOrders,
};
