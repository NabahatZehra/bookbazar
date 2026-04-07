import User from '../models/User.js';
import generateTokens from '../utils/generateToken.js';
import { validationResult } from 'express-validator';

/**
 * Helper to process validation errors
 */
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors.array(),
    });
  }
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    const { name, email, password, role } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (normalizedEmail === 'admin@bookbazaar.com' || role === 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists', data: null });
    }

    const user = await User.create({ name, email: normalizedEmail, password, role: 'user' });

    if (user) {
      const { accessToken, refreshToken } = generateTokens(user);

      // Optionally set the refresh token in an HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
          token: accessToken,
          refreshToken,
        },
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data', data: null });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Auth user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid email or password', data: null });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get user profile data
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = req.user; // Appended by authMiddleware
    if (user) {
      return res.json({
        success: true,
        message: 'User profile fetched successfully',
        data: user, // Password already excluded by protect middleware
      });
    } else {
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = async (req, res) => {
  try {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    return res.json({ success: true, message: 'Logged out successfully', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Toggle item in wishlist
 * @route   POST /api/auth/wishlist
 * @access  Private
 */
export const toggleWishlist = async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }

    const isLiked = user.wishlist.some(id => id.toString() === bookId.toString());

    if (isLiked) {
      user.wishlist = user.wishlist.filter(id => id.toString() !== bookId.toString());
    } else {
      user.wishlist.push(bookId);
    }

    await user.save();

    return res.json({
      success: true,
      message: isLiked ? 'Removed from wishlist' : 'Added to wishlist',
      data: user.wishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get user wishlist
 * @route   GET /api/auth/wishlist
 * @access  Private
 */
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }

    return res.json({
      success: true,
      message: 'Wishlist fetched successfully',
      data: user.wishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
