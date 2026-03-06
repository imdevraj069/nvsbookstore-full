// Cart Controller — Per-user cart management (uses req.user.id from JWT)

const logger = require('@sarkari/logger');
const { Cart, Product } = require('@sarkari/database').models;

/**
 * GET /api/cart
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await Cart.findOne({ userId }).populate('items.product');
    if (!cart) {
      cart = { userId, items: [] };
    }
    res.json({ success: true, data: cart });
  } catch (error) {
    logger.error('Error fetching cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/cart/items
 * Add item to cart (or increase quantity)
 * Digital products can only be added once (quantity locked to 1)
 * Physical products can have multiple quantities
 * Print-on-demand is a special case of digital
 */
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, format = 'physical', subFormat = null } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check stock for physical products
    if (format === 'physical') {
      if (product.stock <= 0) {
        return res.status(400).json({ success: false, error: 'This product is currently out of stock.' });
      }
      if (product.stock < quantity) {
        return res.status(400).json({ success: false, error: `Only ${product.stock} items available in stock.` });
      }
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if product already in cart with same format and subFormat
    const existingIdx = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.format === format && item.subFormat === subFormat
    );

    // Digital products (including print-on-demand) can only be added once
    if (format === 'digital') {
      if (existingIdx !== -1) {
        // Digital product already in cart - don't add again
        return res.status(400).json({ 
          success: false, 
          error: 'This digital product is already in your cart. You can only purchase one copy.' 
        });
      }
      // Always add digital with quantity 1
      cart.items.push({ product: productId, quantity: 1, format, subFormat });
    } else {
      // Physical/other formats: allow quantity increases
      if (existingIdx !== -1) {
        cart.items[existingIdx].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity, format, subFormat });
      }
    }

    await cart.save();
    const populated = await Cart.findById(cart._id).populate('items.product');

    logger.info(`Cart updated for user ${userId}`);
    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error('Error adding to cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/cart/items/:itemId
 * Update item quantity
 */
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      cart.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const populated = await Cart.findById(cart._id).populate('items.product');
    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error('Error updating cart item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    cart.items.pull(itemId);
    await cart.save();
    const populated = await Cart.findById(cart._id).populate('items.product');

    res.json({ success: true, data: populated });
  } catch (error) {
    logger.error('Error removing from cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/cart
 * Clear entire cart
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    await Cart.findOneAndUpdate(
      { userId },
      { items: [] },
      { new: true }
    );
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    logger.error('Error clearing cart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
