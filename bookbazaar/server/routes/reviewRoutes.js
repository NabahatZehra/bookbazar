import express from 'express';
import { body } from 'express-validator';
import {
  createReview,
  getSellerReviews,
  getSellerReviewEligibility,
  createSellerReviewBySellerId,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/',
  protect,
  [
    body('orderId', 'Order ID is required').notEmpty(),
    body('rating', 'Rating must be between 1 and 5').isFloat({ min: 1, max: 5 }),
  ],
  createReview
);

router.get('/seller/:sellerId/eligibility', protect, getSellerReviewEligibility);
router.post(
  '/seller/:sellerId',
  protect,
  [
    body('orderId', 'Order ID is required').notEmpty(),
    body('rating', 'Rating must be between 1 and 5').isFloat({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 1000 }),
  ],
  createSellerReviewBySellerId
);
router.get('/seller/:sellerId', getSellerReviews);

export default router;
