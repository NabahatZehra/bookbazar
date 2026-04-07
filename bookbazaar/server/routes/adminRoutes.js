import express from 'express';
import {
  getUsers,
  getUserById,
  banUser,
  deleteUser,
  getAllBooks,
  deleteBookAdmin,
  getRevenue,
  updateCommissionRate,
  getStats,
  createBookAdmin,
  updateBookAdmin,
  updateBookStatus,
} from '../controllers/adminController.js';
import { upload } from '../config/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect, requireAdmin);

router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);

router.get('/books', getAllBooks);
router.post('/books', upload.single('image'), createBookAdmin);
router.put('/books/:id', upload.single('image'), updateBookAdmin);
router.patch('/books/:id/status', updateBookStatus);
router.delete('/books/:id', deleteBookAdmin);

router.get('/revenue', getRevenue);
router.put('/commission', updateCommissionRate);

router.get('/stats', getStats);

export default router;
