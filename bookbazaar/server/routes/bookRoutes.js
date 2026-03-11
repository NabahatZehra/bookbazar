import express from 'express';
import { body } from 'express-validator';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getSellerBooks,
} from '../controllers/bookController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getBooks);
router.get('/:id', getBookById);
router.get('/seller/:sellerId', getSellerBooks);

// Protected routes
router.post(
  '/',
  protect,
  upload.single('image'),
  [
    body('title', 'Title is required').notEmpty(),
    body('author', 'Author is required').notEmpty(),
    body('description', 'Description is required').notEmpty(),
    body('price', 'Price must be a positive number').isFloat({ min: 1 }),
    body('condition', 'Valid condition is required').isIn(['New', 'Good', 'Fair']),
  ],
  createBook
);

router.put('/:id', protect, upload.single('image'), updateBook);
router.delete('/:id', protect, deleteBook);

export default router;
