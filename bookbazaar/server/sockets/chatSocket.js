import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';

// Global map to track active user sockets -> { userId: socketId }
const onlineUsers = new Map();

/**
 * Attaches Socket.io events for real-time chat
 * @param {import('socket.io').Server} io - The Socket.io server instance
 */
const chatSocket = (io) => {
  // Middleware for Authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication Error: No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id; // Attach decoded user ID to the socket
      next();
    } catch (err) {
      next(new Error('Authentication Error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} with socket ID: ${socket.id}`);

    // Add to online users tracking
    onlineUsers.set(socket.userId.toString(), socket.id);
    
    // Broadcast updated online users to everyone
    io.emit('online_users', Array.from(onlineUsers.keys()));

    // Join a conversation room between two users
    socket.on('join_conversation', (targetUserId) => {
      // Room name based on sorted IDs to ensure both users join the exact same string room
      const room = `conv_${[socket.userId, targetUserId].sort().join('_')}`;
      socket.join(room);
      console.log(`User ${socket.userId} joined room ${room}`);
    });

    // Send a message
    socket.on('send_message', async (data) => {
      const { receiverId, text } = data;
      const senderId = socket.userId;

      try {
        // Save to Database
        const newMessage = new Message({
          senderId,
          receiverId,
          text,
          isRead: false,
        });
        const savedMessage = await newMessage.save();

        const room = `conv_${[senderId, receiverId].sort().join('_')}`;
        
        // Emit to everyone in the room (including sender to verify delivery)
        // You could also emit directly to the receiver's socket:
        // const receiverSocketId = onlineUsers.get(receiverId);
        // if (receiverSocketId) io.to(receiverSocketId).emit('receive_message', savedMessage);
        io.to(room).emit('receive_message', savedMessage);
      } catch (error) {
        console.error('Message save error:', error);
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      const { senderId } = data; // the user who sent the messages that are now being read
      const receiverId = socket.userId; // the current user reading them
      
      try {
        await Message.updateMany(
          { senderId, receiverId, isRead: false },
          { $set: { isRead: true } }
        );

        // Notify the sender that messages were read
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read', { readerId: receiverId });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Typing indicators
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const room = `conv_${[socket.userId, receiverId].sort().join('_')}`;
      socket.to(room).emit('user_typing', { senderId: socket.userId, isTyping });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId.toString());
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
};

export default chatSocket;
