import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to protect admin routes by verifying JWT token
 * and ensuring the user has the 'admin' role.
 */
export const admin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access only' });
      }

      // Get user from the token and exclude password
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      if (user.isBanned === true) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to protect admin routes by checking `req.user`.
 * Assumes an auth middleware (e.g. `protect`) already populated `req.user`.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, no user context' });
  }

  const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  return next();
};
