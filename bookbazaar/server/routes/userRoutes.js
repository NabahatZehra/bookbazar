import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateEducationProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';
import { body } from 'express-validator';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('avatar'), updateUserProfile);
router.put(
  '/change-password',
  protect,
  [
    body('oldPassword', 'Old password is required').exists(),
    body('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  changePassword
);
router.put('/education-profile', protect, updateEducationProfile);

export default router;
