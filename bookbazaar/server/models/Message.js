import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      default: null,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'text+image'],
      default: 'text',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Keeping timestamps true helps if we need updatedAt later, though we have 'timestamp' field
    timestamps: true,
  }
);

// Indexing for faster queries when fetching chat history between two users
messageSchema.index({ senderId: 1, receiverId: 1 });

messageSchema.pre('validate', function (next) {
  const hasText = this.text && String(this.text).trim().length > 0;
  const hasImage = !!this.imageUrl;
  if (!hasText && !hasImage) {
    return next(new Error('Message must include text or an image'));
  }
  if (hasText && hasImage) this.messageType = 'text+image';
  else if (hasImage) this.messageType = 'image';
  else this.messageType = 'text';
  next();
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
