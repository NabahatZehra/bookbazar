import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: 'https://via.placeholder.com/150', // placeholder URL
    },
    educationProfile: {
      level: {
        type: String,
        enum: ['primary', 'secondary', 'higher_secondary', 'university', 'other'],
        default: null,
      },
      currentGrade: { type: Number, min: 1, max: 12, default: null },
      university: { type: String, default: null },
      degree: { type: String, default: null },
      field: { type: String, default: null },
      semester: { type: Number, min: 1, max: 8, default: null },
      board: { type: String, default: null },
      institution: { type: String, default: null },
      isProfileComplete: { type: Boolean, default: false },
    },
    purchaseHistory: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        grade: { type: Number, default: null },
        field: { type: String, default: null },
        subject: { type: String, default: null },
        purchasedAt: { type: Date, default: Date.now },
      },
    ],
    viewedBooks: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
      },
    ],
    // Used by the AI recommendation agent (optional; can be empty).
    university: {
      type: String,
      trim: true,
      default: '',
    },
    course: {
      type: String,
      trim: true,
      default: '',
    },
    // Last books the user viewed (most recent first). Used for AI recommendations.
    recentlyViewedBooks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
      },
    ],
  },
  {
    timestamps: true, // Automates createdAt and updatedAt
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
