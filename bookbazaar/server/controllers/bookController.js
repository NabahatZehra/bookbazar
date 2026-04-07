import Book from '../models/Book.js';
import cloudinary from '../config/cloudinary.js';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
    if (req.query.category) {
      const c = String(req.query.category).toLowerCase();
      if (c === 'primary') {
        query.$or = [...(query.$or || []), { 'educationMeta.level': 'primary' }, { 'educationMeta.grade': { $gte: 1, $lte: 5 } }];
      } else if (c === 'secondary') {
        query.$or = [...(query.$or || []), { 'educationMeta.level': 'secondary' }, { 'educationMeta.grade': { $gte: 6, $lte: 10 } }];
      } else if (c === 'higher_secondary') {
        query.$or = [...(query.$or || []), { 'educationMeta.level': 'higher_secondary' }, { 'educationMeta.grade': { $gte: 11, $lte: 12 } }];
      } else if (c === 'university') {
        query.$or = [...(query.$or || []), { 'educationMeta.level': 'university' }, { university: { $regex: 'university|fast|lums|nust|comsats', $options: 'i' } }];
      }
    }
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search text (tokenized, across multiple relevant fields)
    if (search) {
      const normalizedSearch = String(search).trim();
      const tokens = normalizedSearch
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff\s-]/gi, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((t) => !['book', 'books', 'grade', 'for', 'the', 'and', 'or', 'primary', 'secondary', 'higher', 'university', 'school', 'level', 'levels'].includes(t));

      const searchableFields = [
        'title',
        'author',
        'description',
        'course',
        'university',
        'educationMeta.subject',
        'educationMeta.field',
        'educationMeta.tags',
      ];

      const hasCategory = Boolean(req.query.category);
      if (tokens.length > 0) {
        const broadOr = searchableFields.map((field) => ({
          [field]: { $regex: normalizedSearch, $options: 'i' },
        }));
        query.$and = tokens.map((token) => ({
          $or: searchableFields.map((field) => ({
            [field]: { $regex: token, $options: 'i' },
          })),
        }));
        query.$or = broadOr;
      } else if (!hasCategory) {
        query.$or = searchableFields.map((field) => ({
          [field]: { $regex: normalizedSearch, $options: 'i' },
        }));
      }
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
        pages: Math.max(1, Math.ceil(total / limitNumber)),
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

      // If the user is logged in, track their recent browsing history for AI recommendations.
      // This endpoint is public, so we treat auth as optional here.
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded?.id;
          if (userId) {
            const u = await User.findById(userId);
            if (u) {
              const existing = Array.isArray(u.recentlyViewedBooks) ? u.recentlyViewedBooks : [];
              const filtered = existing.filter((bId) => bId.toString() !== book._id.toString());
              u.recentlyViewedBooks = [book._id, ...filtered].slice(0, 10);
              await u.save();
            }
          }
        }
      } catch {
        // Ignore invalid tokens; browsing history is best-effort only.
      }

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

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required. Make sure image size is < 5MB', data: null });
    }

    let imageUrl = '';
    if (req.file.path) {
      imageUrl = req.file.path;
    } else if (req.file.buffer) {
      // Sandbox Mode: Base64 encode if Cloudinary keys aren't configured
      const b64 = req.file.buffer.toString('base64');
      imageUrl = `data:${req.file.mimetype};base64,${b64}`;
    }

    const {
      title,
      author,
      description,
      price,
      condition,
      university,
      course,
      seoTitle,
      seoDescription,
      metaTags,
      educationLevel,
      grade,
      subject,
      field,
      semester,
      board,
      tags,
    } = req.body;

    let parsedMetaTags = [];
    if (metaTags) {
      parsedMetaTags = typeof metaTags === 'string' ? metaTags.split(',').map(tag => tag.trim()) : metaTags;
    }

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
      seoTitle: seoTitle || '',
      seoDescription: seoDescription || '',
      metaTags: parsedMetaTags,
      educationMeta: {
        level: educationLevel || 'general',
        grade: grade ? Number(grade) : null,
        subject: subject || null,
        field: field || null,
        semester: semester ? Number(semester) : null,
        board: board || null,
        tags: typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      },
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
    book.seoTitle = req.body.seoTitle !== undefined ? req.body.seoTitle : book.seoTitle;
    book.seoDescription = req.body.seoDescription !== undefined ? req.body.seoDescription : book.seoDescription;
    
    if (req.body.metaTags !== undefined) {
      book.metaTags = typeof req.body.metaTags === 'string' 
        ? req.body.metaTags.split(',').map(tag => tag.trim()) 
        : req.body.metaTags;
    }

    const nextEducationMeta = {
      ...book.educationMeta?.toObject?.(),
      level: req.body.educationLevel !== undefined ? req.body.educationLevel : book.educationMeta?.level || 'general',
      grade: req.body.grade !== undefined && req.body.grade !== '' ? Number(req.body.grade) : book.educationMeta?.grade ?? null,
      subject: req.body.subject !== undefined ? (req.body.subject || null) : book.educationMeta?.subject ?? null,
      field: req.body.field !== undefined ? (req.body.field || null) : book.educationMeta?.field ?? null,
      semester: req.body.semester !== undefined && req.body.semester !== '' ? Number(req.body.semester) : book.educationMeta?.semester ?? null,
      board: req.body.board !== undefined ? (req.body.board || null) : book.educationMeta?.board ?? null,
      tags: req.body.tags !== undefined
        ? (typeof req.body.tags === 'string'
          ? req.body.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : req.body.tags)
        : (book.educationMeta?.tags || []),
    };
    book.educationMeta = nextEducationMeta;

    // Optional image replacement
    if (req.file) {
      if (req.file.path) {
        book.image = req.file.path;
      } else if (req.file.buffer) {
        const b64 = req.file.buffer.toString('base64');
        book.image = `data:${req.file.mimetype};base64,${b64}`;
      }
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

export const trackBookView = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          viewedBooks: {
            $each: [{ bookId: book._id }],
            $slice: -20,
          },
        },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
