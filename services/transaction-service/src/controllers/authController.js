// User Auth Controller — Signup, Login, Profile

const bcrypt = require('bcryptjs');
const logger = require('@sarkari/logger');
const { User } = require('@sarkari/database').models;
const { generateToken } = require('@sarkari/auth');
const producer = require('../events/producer');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

/**
 * Generate random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * POST /api/auth/otp/request
 * Request OTP to be sent to email
 */
const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user for OTP login
      user = await User.create({
        name: email.split('@')[0],
        email: email.toLowerCase(),
        authType: 'otp',
        role: 'user',
        loginOtp: otp,
        loginOtpExpiry: otpExpiry,
      });
      logger.info(`New OTP user created: ${user.email}`);
    } else {
      // Update existing user's OTP
      user.loginOtp = otp;
      user.loginOtpExpiry = otpExpiry;
      await user.save();
      logger.info(`OTP sent to existing user: ${user.email}`);
    }

    // Queue email sending via RabbitMQ
    await producer.publishEvent('OTP_LOGIN', {
      email: user.email,
      name: user.name,
      otp: otp,
      expiresIn: 10,
    });

    res.json({
      success: true,
      message: `OTP sent to ${email}`,
      data: {
        email: email.toLowerCase(),
        expiresIn: 600, // 10 minutes in seconds
      },
    });
  } catch (error) {
    logger.error('OTP request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/otp/verify
 * Verify OTP and create session (72-hour JWT)
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found. Request OTP first.' });
    }

    // Check if OTP exists and hasn't expired
    if (!user.loginOtp || !user.loginOtpExpiry) {
      return res.status(400).json({ success: false, error: 'OTP not found. Request a new OTP.' });
    }

    if (user.loginOtpExpiry < new Date()) {
      user.loginOtp = '';
      user.loginOtpExpiry = null;
      await user.save();
      return res.status(401).json({ success: false, error: 'OTP has expired. Request a new one.' });
    }

    // Verify OTP matches
    if (user.loginOtp !== otp) {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    // Clear OTP after successful verification
    user.loginOtp = '';
    user.loginOtpExpiry = null;
    user.isVerified = true;
    await user.save();

    // Generate token with 72-hour expiry
    const token = generateToken(user, 259200000); // 72 hours in milliseconds = 259200000ms = 259200s

    logger.info(`User logged in via OTP: ${user.email}`);
    res.json({
      success: true,
      data: {
        token,
        expiresIn: 259200, // 72 hours in seconds
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
    });
  } catch (error) {
    logger.error('OTP verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || '',
      role,
      authType: 'credentials',
    });

    const token = generateToken(user);

    logger.info(`User signed up: ${user.email} (${user.role})`);
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: `This account uses ${user.authType} authentication. Please use that method to log in.`,
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    logger.info(`User logged in: ${user.email}`);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/auth/me
 * Requires: requireAuth middleware
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -signupOtp -verifyOtp -verifyId').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/auth/profile
 * Requires: requireAuth middleware
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, education, dateOfBirth, interests } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (education !== undefined) updates.education = education;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (interests !== undefined) updates.interests = interests;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true })
      .select('-password -signupOtp -verifyOtp -verifyId')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    logger.info(`Profile updated: ${user.email}`);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/address
 * Add a shipping address
 * Requires: requireAuth middleware
 */
const addAddress = async (req, res) => {
  try {
    const { label, address, city, state, pincode, phone, isDefault } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // If setting as default, unset all others
    if (isDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
    }

    user.addresses.push({
      label: label || 'Home',
      address,
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      phone: phone || '',
      isDefault: isDefault || user.addresses.length === 0, // first address is always default
    });

    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (error) {
    logger.error('Add address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/favorites/:productId
 * Toggle product in favorites
 * Requires: requireAuth middleware
 */
const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const idx = user.favorites.indexOf(productId);
    if (idx === -1) {
      user.favorites.push(productId);
    } else {
      user.favorites.splice(idx, 1);
    }

    await user.save();
    res.json({ success: true, data: { favorites: user.favorites, isFavorite: idx === -1 } });
  } catch (error) {
    logger.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/auth/favorites
 * Get user's favorites list (populated)
 * Requires: requireAuth middleware
 */
const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user.favorites });
  } catch (error) {
    logger.error('Get favorites error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/auth/google
 * Google OAuth — verify ID token and create/login user
 */
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential is required' });
    }

    // Verify the Google ID token
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();

    if (!googleRes.ok || payload.error) {
      return res.status(401).json({ success: false, error: 'Invalid Google token' });
    }

    // Verify audience matches our client ID
    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ success: false, error: 'Token not intended for this app' });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        image: picture || '',
        authType: 'google',
        googleId,
        role,
        isVerified: true,
      });
      logger.info(`New Google user created: ${user.email} (${user.role})`);
    } else {
      // Update image if not set
      if (!user.image && picture) {
        user.image = picture;
        await user.save();
      }
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
    });
  } catch (error) {
    logger.error('Google login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  signup,
  login,
  googleLogin,
  requestOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  addAddress,
  toggleFavorite,
  getFavorites,
};
