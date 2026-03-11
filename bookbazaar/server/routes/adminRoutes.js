import express from 'express';
import {
  getUsers,
  deleteUser,
  getAllBooks,
  deleteBookAdmin,
  getRevenue,
  updateCommissionRate,
  getStats,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect, admin);

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

router.get('/books', getAllBooks);
router.delete('/books/:id', deleteBookAdmin);

router.get('/revenue', getRevenue);
router.put('/commission', updateCommissionRate);

router.get('/stats', getStats);

export default router;
