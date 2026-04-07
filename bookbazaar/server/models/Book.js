import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least 1'],
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: ['New', 'Good', 'Fair'],
    },
    image: {
      type: String,
      required: [true, 'Book image is required'],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
    status: {
      type: String,
      enum: ['available', 'sold', 'removed'],
      default: 'available',
    },
    educationMeta: {
      level: {
        type: String,
        enum: ['primary', 'secondary', 'higher_secondary', 'university', 'general'],
        default: 'general',
      },
      grade: { type: Number, min: 1, max: 12, default: null },
      subject: { type: String, default: null },
      field: { type: String, default: null },
      semester: { type: Number, default: null },
      board: { type: String, default: null },
      tags: [{ type: String }],
    },
    views: {
      type: Number,
      default: 0,
    },
    seoTitle: {
      type: String,
      trim: true,
      default: '',
    },
    seoDescription: {
      type: String,
      trim: true,
      default: '',
      maxLength: 160,
    },
    seoKeywords: {
      type: String,
      trim: true,
      default: '',
    },
    canonicalUrl: {
      type: String,
      trim: true,
      default: '',
    },
    ogImage: {
      type: String,
      trim: true,
      default: '',
    },
    structuredData: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Add text indexes for search functionality
bookSchema.index({ title: 'text', author: 'text', university: 'text', course: 'text' });

const Book = mongoose.model('Book', bookSchema);
export default Book;
