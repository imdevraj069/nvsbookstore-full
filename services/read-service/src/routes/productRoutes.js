// Read Service — Cached Product Routes
// Reads from MongoDB secondary replica, caches in Redis

const express = require('express');
const router = express.Router();
const logger = require('@sarkari/logger');
const { Product } = require('@sarkari/database').models;
const redisClient = require('../cache/redisClient');

const CACHE_TTL = 3600; // 1 hour

/**
 * GET /api/products
 * Returns all visible products (fast direct DB fetch, background cache sync)
 */
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'products:all';
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const products = await Product.find({ isVisible: true })
      .sort({ publishingDate: -1, createdAt: -1 })
      .lean();

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(products)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: products });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/products/featured
 * Returns featured products (fast direct DB fetch, background cache sync)
 */
router.get('/featured', async (req, res) => {
  try {
    const cacheKey = 'products:featured';
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const products = await Product.find({ isVisible: true, isFeatured: true })
      .sort({ publishingDate: -1, createdAt: -1 })
      .lean();

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(products)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: products });
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/products/tag/:tag
 * Returns products by tag (fast direct DB fetch, background cache sync)
 */
router.get('/tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const cacheKey = `products:tag:${tag}`;
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const products = await Product.find({ isVisible: true, tags: tag })
      .sort({ createdAt: -1 })
      .lean();

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(products)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: products });
  } catch (error) {
    logger.error('Error fetching products by tag:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/products/search?q=query
 * Full-text search on products (not cached — real-time)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const products = await Product.find({
      isVisible: true,
      $text: { $search: q },
    })
      .sort({ score: { $meta: 'textScore' } })
      .lean();

    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/products/slug/:slug
 * Returns a single product by slug (fast direct DB fetch, background cache sync)
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `products:slug:${slug}`;
    // DISABLED: Cache layer commented out for faster initial loads
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    // }

    const product = await Product.findOne({ slug, isVisible: true }).lean();
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Background cache sync (commented out - fire and forget when re-enabled)
    // redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(product)).catch(err => 
    //   logger.error('Cache sync error:', err)
    // );
    
    res.json({ success: true, source: 'db', data: product });
  } catch (error) {
    logger.error('Error fetching product by slug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
