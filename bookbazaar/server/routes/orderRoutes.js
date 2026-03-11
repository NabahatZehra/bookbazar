import express from 'express';
import {
  placeOrder,
  confirmOrder,
  getMyOrders,
  getMySales,
  getOrderById,
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, placeOrder);
router.post('/confirm', protect, confirmOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-sales', protect, getMySales);
router.get('/:id', protect, getOrderById);

export default router;
