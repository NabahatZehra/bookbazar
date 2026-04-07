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
    const existingForOrder = await Review.findOne({ orderId: order._id });
    if (existingForOrder) {
      return res.status(400).json({ success: false, message: 'Review already submitted for this order', data: null });
    }

    const existingForSeller = await Review.findOne({ reviewerId: req.user._id, sellerId: order.sellerId });
    if (existingForSeller) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this seller', data: null });
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
    const { sellerId } = req.params;

    const seller = await User.findById(sellerId).select('averageRating totalReviews name');

    const reviews = await Review.find({ sellerId })
      .populate('reviewerId', 'name avatar')
      .populate('orderId', 'bookId')
      .sort({ createdAt: -1 });

    const avgFromReviews = reviews.length
      ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length
      : 0;

    const averageRating = seller?.averageRating ?? Number(avgFromReviews.toFixed(1));
    const totalReviews = seller?.totalReviews ?? reviews.length;

    return res.json({
      success: true,
      message: 'Seller reviews fetched',
      data: {
        reviews,
        averageRating: Number(Number(averageRating).toFixed(1)),
        totalReviews,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Check if current user can leave a seller review (completed purchase)
 * @route   GET /api/reviews/seller/:sellerId/eligibility
 * @access  Private
 */
export const getSellerReviewEligibility = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const existing = await Review.findOne({ reviewerId: req.user._id, sellerId });
    if (existing) {
      return res.json({
        success: true,
        data: { canReview: false, orderId: null, reason: 'already_reviewed' },
      });
    }

    const order = await Order.findOne({
      buyerId: req.user._id,
      sellerId,
      paymentStatus: 'Paid',
      orderStatus: 'Completed',
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        canReview: Boolean(order),
        orderId: order?._id || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Create seller review (requires delivered/completed order)
 * @route   POST /api/reviews/seller/:sellerId
 * @access  Private
 */
export const createSellerReviewBySellerId = async (req, res) => {
  try {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    const { sellerId } = req.params;
    const { rating, comment, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required', data: null });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    if (order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed', data: null });
    }

    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(400).json({ success: false, message: 'Order does not match this seller', data: null });
    }

    if (order.paymentStatus !== 'Paid' || order.orderStatus !== 'Completed') {
      return res.status(403).json({
        success: false,
        message: 'You can only review sellers after completing a purchase',
        data: null,
      });
    }

    const existing = await Review.findOne({ reviewerId: req.user._id, sellerId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this seller', data: null });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5', data: null });
    }

    const review = await Review.create({
      reviewerId: req.user._id,
      sellerId,
      orderId: order._id,
      rating: numericRating,
      comment: comment || '',
    });

    const reviews = await Review.find({ sellerId });
    const totalReviews = reviews.length;
    const averageRating = totalReviews ? reviews.reduce((acc, item) => acc + item.rating, 0) / totalReviews : 0;

    await User.findByIdAndUpdate(sellerId, {
      totalReviews,
      averageRating: Number(averageRating.toFixed(1)),
    });

    return res.status(201).json({ success: true, message: 'Review added successfully', data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
