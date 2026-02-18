// JWT Auth Middleware
// Shared auth utilities for all services

const jwt = require('jsonwebtoken');
const logger = require('@sarkari/logger');

const JWT_SECRET = process.env.JWT_SECRET || '644bbdd2fa39b94fa75e8bfa1775c973';

/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

/**
 * Verify a JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Middleware — Require authentication
 * Extracts user from Bearer token and attaches to req.user
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    logger.error('Auth error:', error);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

/**
 * Middleware — Require admin role
 * Must be used AFTER requireAuth
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

/**
 * Middleware — Optional auth (attach user if token present, but don't reject)
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = verifyToken(token);
    }
  } catch {
    // Token invalid — continue without user
  }
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  optionalAuth,
};
