import Book from '../models/Book.js';
import cloudinary from '../config/cloudinary.js';
import { validationResult } from 'express-validator';

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: errors.array() });
  }
};

/**
 * @desc    Get all available books with pagination, filtering, searching, and sorting
 * @route   GET /api/books
 * @access  Public
 */
export const getBooks = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      condition, 
      university, 
      course, 
      minPrice, 
      maxPrice, 
      search, 
      sort = 'newest' 
    } = req.query;

    const query = { status: 'available' };

    // Filters
    if (condition) query.condition = condition;
    if (university) query.university = { $regex: university, $options: 'i' };
    if (course) query.course = { $regex: course, $options: 'i' };
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search text (title or author)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting overrides
    let sortObj = {};
    switch (sort) {
      case 'price-asc': sortObj = { price: 1 }; break;
      case 'price-desc': sortObj = { price: -1 }; break;
      case 'popular': sortObj = { views: -1 }; break;
      default: sortObj = { createdAt: -1 }; // 'newest'
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .populate('sellerId', 'name avatar') // Embed brief seller data
      .sort(sortObj)
      .skip(skip)
      .limit(limitNumber);

    return res.json({
      success: true,
      message: 'Books fetched successfully',
      data: {
        books,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
        total,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get single book details & increment views
 * @route   GET /api/books/:id
 * @access  Public
 */
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('sellerId', 'name avatar averageRating totalReviews');
    
    if (book) {
      // Increment views
      book.views += 1;
      await book.save();
      
      return res.json({ success: true, message: 'Book fetched', data: book });
    } else {
      return res.status(404).json({ success: false, message: 'Book not found', data: null });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Add a new book
 * @route   POST /api/books
 * @access  Private
 */
export const createBook = async (req, res) => {
  try {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    const { title, author, description, price, condition, university, course } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required. Make sure image size is < 5MB', data: null });
    }

    const imageUrl = req.file.path; // Cloudinary automatically uploads and provides URL in req.file.path

    const book = new Book({
      title,
      author,
      description,
      price,
      condition,
      image: imageUrl,
      sellerId: req.user._id,
      university: university || '',
      course: course || '',
    });

    const createdBook = await book.save();
    return res.status(201).json({ success: true, message: 'Book listed successfully', data: createdBook });
  } catch (error) {
    console.error('Error in createBook:', error.message);
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Update a book
 * @route   PUT /api/books/:id
 * @access  Private (Owner/Admin)
 */
export const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found', data: null });
    }

    // Verify ownership or Admin role
    if (book.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this book', data: null });
    }

    // We only update specific fields, status or image too if provided
    book.title = req.body.title || book.title;
    book.author = req.body.author || book.author;
    book.description = req.body.description || book.description;
    book.price = req.body.price || book.price;
    book.condition = req.body.condition || book.condition;
    book.university = req.body.university !== undefined ? req.body.university : book.university;
    book.course = req.body.course !== undefined ? req.body.course : book.course;
    book.status = req.body.status || book.status;

    // Optional image replacement
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'bookbazaar/books',
      });
      book.image = uploadResponse.secure_url;
    }

    const updatedBook = await book.save();
    return res.json({ success: true, message: 'Book updated successfully', data: updatedBook });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Delete a book
 * @route   DELETE /api/books/:id
 * @access  Private (Owner/Admin)
 */
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found', data: null });
    }

    // Verify ownership or Admin role
    if (book.sellerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this book', data: null });
    }

    await Book.deleteOne({ _id: book._id });
    return res.json({ success: true, message: 'Book removed', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get all books by a seller
 * @route   GET /api/books/seller/:sellerId
 * @access  Public
 */
export const getSellerBooks = async (req, res) => {
  try {
    const books = await Book.find({ sellerId: req.params.sellerId }).sort({ createdAt: -1 });
    return res.json({ success: true, message: 'Seller books fetched', data: books });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
