import express from 'express';
import { body } from 'express-validator';
import {
  placeOrder,
  confirmOrder,
  mockCheckout,
  getMyOrders,
  getMySales,
  getOrderById,
  completeOrder,
  submitOrderReview,
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-payment-intent', protect, placeOrder);
router.post('/mock-checkout', protect, mockCheckout);
router.post('/confirm', protect, confirmOrder);
router.put('/:id/complete', protect, completeOrder);
router.post(
  '/:id/review',
  protect,
  [
    body('rating', 'Rating must be an integer between 1 and 5').isInt({ min: 1, max: 5 }),
    body('comment', 'Comment must be a string').optional().isString().isLength({ max: 1000 }),
  ],
  submitOrderReview
);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-sales', protect, getMySales);
router.get('/:id', protect, getOrderById);

export default router;
