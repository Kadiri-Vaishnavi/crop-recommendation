const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// ─── Helper: Generate JWT Token ────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// ─── Helper: Send consistent error response ────────────────────────────────
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};

// ══════════════════════════════════════════════════════════════════════════
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// ══════════════════════════════════════════════════════════════════════════
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),

    body('region')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Region cannot exceed 100 characters'),
  ],
  async (req, res) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { name, email, password, region } = req.body;

    try {
      // 2. Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendError(res, 409, 'An account with this email already exists. Please sign in.');
      }

      // 3. Create and save the new user (password hashed by pre-save hook)
      const user = await User.create({ name, email, password, region });

      // 4. Generate JWT
      const token = generateToken(user._id);

      // 5. Respond with user info + token
      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to CropAI Connect.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          region: user.region,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error('[REGISTER ERROR]', err.message);
      // Handle Mongoose duplicate key error
      if (err.code === 11000) {
        return sendError(res, 409, 'An account with this email already exists.');
      }
      sendError(res, 500, 'Server error. Please try again later.');
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════
// @route   POST /api/auth/login
// @desc    Authenticate user & return token
// @access  Public
// ══════════════════════════════════════════════════════════════════════════
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, password } = req.body;

    try {
      // 2. Find user (explicitly select password field since it's hidden by default)
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        // Generic message to prevent user enumeration
        return sendError(res, 401, 'Invalid email or password. Please try again.');
      }

      // 3. Compare passwords
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return sendError(res, 401, 'Invalid email or password. Please try again.');
      }

      // 4. Update last login timestamp
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // 5. Generate JWT
      const token = generateToken(user._id);

      // 6. Respond with user info + token
      res.status(200).json({
        success: true,
        message: 'Login successful! Welcome back.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          region: user.region,
          lastLogin: user.lastLogin,
        },
      });
    } catch (err) {
      console.error('[LOGIN ERROR]', err.message);
      sendError(res, 500, 'Server error. Please try again later.');
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════
// @route   GET /api/auth/me
// @desc    Get currently logged-in user (Protected Route)
// @access  Private (requires valid JWT in Authorization header)
// ══════════════════════════════════════════════════════════════════════════
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        region: user.region,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Session expired. Please log in again.');
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token. Please log in again.');
    }
    sendError(res, 500, 'Server error.');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// @route   POST /api/auth/logout
// @desc    Logout (client-side clears token; server acknowledges)
// @access  Public
// ══════════════════════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = router;
