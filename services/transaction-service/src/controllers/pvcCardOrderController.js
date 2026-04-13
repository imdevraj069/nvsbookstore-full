// PVC Card Order Controller — Customer order management for PVC cards

const logger = require('@sarkari/logger');
const { PVCCard, PVCCardOrder, PVCCardQuestion } = require('@sarkari/database').models;
const producer = require('../events/producer');

/**
 * GET /api/pvc-cards
 * Get all available PVC cards for customer (with questions)
 */
const getAllPVCCards = async (req, res) => {
  try {
    const cards = await PVCCard.find({ isActive: true })
      .select('-createdBy -updatedBy')
      .sort({ displayOrder: 1 })
      .lean();

    // Fetch questions for each card
    const cardsWithQuestions = await Promise.all(
      cards.map(async (card) => {
        const questions = await PVCCardQuestion.find({ pvcCard: card._id })
          .select('-createdBy')
          .sort({ sortOrder: 1 })
          .lean();
        return { ...card, questions };
      })
    );

    res.json({ success: true, data: cardsWithQuestions });
  } catch (error) {
    logger.error('Error fetching PVC cards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/pvc-cards/:cardId
 * Get single PVC card with all questions
 */
const getPVCCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await PVCCard.findById(cardId).lean();
    if (!card || !card.isActive) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    const questions = await PVCCardQuestion.find({ pvcCard: cardId })
      .select('-createdBy')
      .sort({ sortOrder: 1 })
      .lean();

    res.json({ success: true, data: { ...card, questions } });
  } catch (error) {
    logger.error('Error fetching PVC card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/pvc-card-orders
 * Create a PVC card order
 * Body: { customerId, customerName, customerEmail, customerPhone, shippingAddress, items, paymentMethod, razorpayOrderId, razorpayPaymentId }
 * items: [{ pvcCard, variation: { name, price }, quantity, answers: [{ questionId, question, answer }] }]
 */
const createPVCCardOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one card item required' });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.pincode) {
      return res.status(400).json({ success: false, error: 'Valid shipping address is required' });
    }

    // Process items and calculate pricing
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      // Fetch card details
      const card = await PVCCard.findById(item.pvcCard);
      if (!card || !card.isActive) {
        return res.status(400).json({ success: false, error: `Card not found: ${item.pvcCard}` });
      }

      // Validate variation exists
      const variation = card.variations.find((v) => v.name === item.variation.name);
      if (!variation) {
        return res.status(400).json({
          success: false,
          error: `Variation not found for ${card.name}: ${item.variation.name}`,
        });
      }

      // Validate answers
      if (!item.answers || !Array.isArray(item.answers)) {
        return res.status(400).json({
          success: false,
          error: `Answers required for ${card.name}`,
        });
      }

      const quantity = item.quantity || 1;
      const pricePerCard = variation.price;
      const itemTotal = pricePerCard * quantity;
      subtotal += itemTotal;

      orderItems.push({
        pvcCard: item.pvcCard,
        cardName: card.name,
        variation: {
          name: variation.name,
          price: variation.price,
        },
        quantity,
        pricePerCard,
        totalPrice: itemTotal,
        answers: item.answers,
      });
    }

    // Generate order number
    const orderNumber = `PVC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate totals (can add tax/shipping later)
    const tax = 0;
    const shippingCost = 0;
    const discount = 0;
    const totalAmount = subtotal + tax + shippingCost - discount;

    // Create order
    const pvcCardOrder = await PVCCardOrder.create({
      orderNumber,
      customerId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      shippingAddress,
      items: orderItems,
      subtotal,
      tax,
      shippingCost,
      discount,
      totalAmount,
      paymentMethod: paymentMethod || 'razorpay',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      razorpaySignature: razorpaySignature || '',
      status: razorpayPaymentId ? 'paid' : 'pending',
      paidAt: razorpayPaymentId ? new Date() : null,
    });

    // Publish event for email notification with invoice
    await producer.publishEvent('pvc_card_order.created', {
      orderId: pvcCardOrder._id.toString(),
      orderNumber: pvcCardOrder.orderNumber,
      customerName,
      customerEmail,
      items: orderItems,
      totalAmount,
      status: pvcCardOrder.status,
    });

    logger.info(`PVC Card order created: ${pvcCardOrder.orderNumber}`);
    res.status(201).json({ success: true, data: pvcCardOrder });
  } catch (error) {
    logger.error('Error creating PVC card order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/pvc-card-orders/:orderId
 * Get order details
 */
const getPVCCardOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await PVCCardOrder.findById(orderId).populate({
      path: 'items.pvcCard',
      select: 'name slug',
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check authorization (user can only see their own order)
    if (order.customerId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error fetching PVC card order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/pvc-card-orders
 * Get customer's orders
 */
const getCustomerPVCCardOrders = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const { status, skip = 0, limit = 10 } = req.query;

    const filter = { customerId };
    if (status) filter.status = status;

    const orders = await PVCCardOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .select('-items.answers') // Don't include detailed answers in list
      .lean();

    const total = await PVCCardOrder.countDocuments(filter);

    res.json({ success: true, data: orders, total, page: Math.ceil(skip / limit) + 1 });
  } catch (error) {
    logger.error('Error fetching customer orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/pvc-card-orders/:orderId
 * Update order status (admin only)
 */
const updatePVCCardOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, courierName, trackingNumber, notes } = req.body;
    const userId = req.user?.id;

    const updateData = {};
    if (status) updateData.status = status;
    if (courierName) updateData.courierName = courierName;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (notes !== undefined) updateData.notes = notes;
    updateData.lastUpdatedBy = userId;

    // Handle delivery date
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const order = await PVCCardOrder.findByIdAndUpdate(orderId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Publish event for status update notification
    if (status) {
      await producer.publishEvent('pvc_card_order.status_updated', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        status,
        courierName: courierName || '',
        trackingNumber: trackingNumber || '',
      });
    }

    logger.info(`PVC Card order updated: ${orderId} → ${status}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating PVC card order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllPVCCards,
  getPVCCard,
  createPVCCardOrder,
  getPVCCardOrder,
  getCustomerPVCCardOrders,
  updatePVCCardOrder,
};
