import express from 'express';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWishlist);
router.post('/:bookId', protect, addToWishlist); // Works as a toggle
router.delete('/:bookId', protect, removeFromWishlist); // Explicit remove

export default router;
