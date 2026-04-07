import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { messageImageUpload } from '../config/cloudinary.js';
import {
  getMessagesForConversation,
  sendMessageInConversation,
} from '../controllers/conversationRestController.js';

const router = express.Router();

router.get('/:conversationId', protect, getMessagesForConversation);

function handleMessageUpload(req, res, next) {
  messageImageUpload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image must be under 5MB', data: null });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Only JPG, PNG, and WEBP images are allowed',
        data: null,
      });
    }
    next();
  });
}

router.post('/', protect, handleMessageUpload, sendMessageInConversation);

export default router;
