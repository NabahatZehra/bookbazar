import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * @desc    Get all conversations for the logged-in user
 * @route   GET /api/chat/conversations
 * @access  Private
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Use MongoDB aggregation to group messages by conversation partners
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { timestamp: -1 }, // Ensure we process newest messages first
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Populate the other user's basic info
    const populatedConversations = await User.populate(conversations, {
      path: '_id',
      select: 'name avatar',
    });

    // Format the response array nicer
    const formattedData = populatedConversations.map(conv => ({
      user: conv._id,
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCount,
    }));

    return res.json({ success: true, message: 'Conversations fetched', data: formattedData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get full message history between current user and specified user
 * @route   GET /api/chat/messages/:userId
 * @access  Private
 */
export const getMessageHistory = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: currentUserId },
      ],
    }).sort({ timestamp: 1 }); // Oldest first for chat window sorting

    // Automatically mark retrieved incoming messages as read
    const unreadMessages = messages.filter(m => m.receiverId.toString() === currentUserId.toString() && !m.isRead);
    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { senderId: targetUserId, receiverId: currentUserId, isRead: false },
        { $set: { isRead: true } }
      );
    }

    return res.json({ success: true, message: 'Message history fetched', data: messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
