import Review from '../models/Review.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors.array() });
  }
};

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
export const createReview = async (req, res) => {
  try {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    const { orderId, rating, comment } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    // Only the buyer can leave a review
    if (order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the buyer can review this order', data: null });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ orderId: order._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already submitted for this order', data: null });
    }

    const review = new Review({
      reviewerId: req.user._id,
      sellerId: order.sellerId,
      orderId: order._id,
      rating: Number(rating),
      comment,
    });

    await review.save();

    // Update seller's average rating and total reviews
    const reviews = await Review.find({ sellerId: order.sellerId });
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / totalReviews;

    await User.findByIdAndUpdate(order.sellerId, {
      totalReviews,
      averageRating: Number(averageRating.toFixed(1)),
    });

    return res.status(201).json({ success: true, message: 'Review added successfully', data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get all reviews for a specific seller
 * @route   GET /api/reviews/seller/:sellerId
 * @access  Public
 */
export const getSellerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ sellerId: req.params.sellerId })
      .populate('reviewerId', 'name avatar')
      .populate('orderId', 'bookId')
      .sort({ createdAt: -1 });

    return res.json({ success: true, message: 'Seller reviews fetched', data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
