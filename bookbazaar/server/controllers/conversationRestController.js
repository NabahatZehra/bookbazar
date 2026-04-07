import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { uploadMessageImage } from '../config/cloudinary.js';

function participantKeyFor(a, b) {
  return [a.toString(), b.toString()].sort().join(':');
}

function isParticipant(conv, userId) {
  return conv.participants.some((p) => p.toString() === userId.toString());
}

function otherParticipantId(conv, userId) {
  return conv.participants.find((p) => p.toString() !== userId.toString());
}

/**
 * @route POST /api/conversations
 * body: { recipientId, bookId? }
 */
export const createOrGetConversation = async (req, res) => {
  try {
    const { recipientId, bookId } = req.body;
    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required' });
    }
    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    const otherExists = await User.exists({ _id: recipientId });
    if (!otherExists) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    let bookObjectId = null;
    if (bookId) {
      const book = await Book.findById(bookId).select('sellerId');
      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found' });
      }
      if (book.sellerId.toString() !== recipientId.toString()) {
        return res.status(400).json({ success: false, message: 'Seller does not match this book' });
      }
      bookObjectId = book._id;
    }

    const pKey = participantKeyFor(req.user._id, recipientId);

    const lookup = { participantKey: pKey };
    lookup.bookId = bookObjectId || null;

    let conversation = await Conversation.findOne(lookup);

    if (!conversation) {
      conversation = await Conversation.create({
        participantKey: pKey,
        participants: [req.user._id, recipientId],
        bookId: bookObjectId,
        lastMessageText: '',
        lastMessageAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation ready',
      data: { conversationId: conversation._id },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @route GET /api/conversations
 */
export const listMyConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name avatar')
      .populate('bookId', 'title')
      .sort({ lastMessageAt: -1 })
      .lean();

    const withPreview = await Promise.all(
      conversations.map(async (c) => {
        const other = c.participants.find((p) => p._id.toString() !== userId.toString());
        return {
          conversationId: c._id,
          otherUser: other || null,
          book: c.bookId || null,
          lastMessageText: c.lastMessageText,
          lastMessageAt: c.lastMessageAt,
        };
      })
    );

    return res.json({ success: true, message: 'Conversations fetched', data: withPreview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @route GET /api/messages/:conversationId
 */
export const getMessagesForConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!isParticipant(conversation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not a participant' });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ timestamp: 1 });

    const partnerId = otherParticipantId(conversation, req.user._id);
    await Message.updateMany(
      { conversationId: conversation._id, senderId: partnerId, receiverId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({ success: true, message: 'Messages fetched', data: messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @route POST /api/messages
 * body (JSON or multipart): conversationId, content (optional), image (optional file)
 */
export const sendMessageInConversation = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const trimmed = content != null ? String(content).trim() : '';
    const hasFile = !!req.file?.buffer;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' });
    }
    if (!trimmed && !hasFile) {
      return res.status(400).json({
        success: false,
        message: 'Message must include text or an image',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!isParticipant(conversation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not a participant' });
    }

    const receiverId = otherParticipantId(conversation, req.user._id);
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Invalid conversation' });
    }

    let imageUrl = null;
    if (hasFile) {
      const publicBase = `${req.protocol}://${req.get('host')}`;
      try {
        imageUrl = await uploadMessageImage(req.file.buffer, req.file.mimetype, publicBase);
      } catch (uploadErr) {
        console.error(uploadErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to send image, please try again',
          data: null,
        });
      }
    }

    const msg = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      receiverId,
      text: trimmed,
      imageUrl,
      isRead: false,
    });

    const preview = trimmed
      ? trimmed.length > 200
        ? `${trimmed.slice(0, 200)}…`
        : trimmed
      : imageUrl
        ? 'Photo'
        : '';
    conversation.lastMessageText = preview;
    conversation.lastMessageAt = msg.timestamp || new Date();
    await conversation.save();

    return res.status(201).json({ success: true, message: 'Message sent', data: msg });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
