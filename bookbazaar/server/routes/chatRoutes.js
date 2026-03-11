import express from 'express';
import { getConversations, getMessageHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.get('/messages/:userId', protect, getMessageHistory);

export default router;
