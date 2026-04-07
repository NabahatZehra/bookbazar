import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createOrGetConversation,
  listMyConversations,
} from '../controllers/conversationRestController.js';

const router = express.Router();

router.post('/', protect, createOrGetConversation);
router.get('/', protect, listMyConversations);

export default router;
