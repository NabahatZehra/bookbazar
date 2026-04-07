import Cart from '../models/Cart.js';
import Book from '../models/Book.js';

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate('items.bookId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }
    return res.json({ success: true, message: 'Cart fetched', data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Add book to cart
 * @route   POST /api/cart/add
 * @access  Private
 */
export const addToCart = async (req, res) => {
  try {
    const { bookId } = req.body;
    
    const book = await Book.findById(bookId);
    if (!book || book.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Book is not available', data: null });
    }

    if (book.sellerId.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot buy your own listing', data: null });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    const itemExists = cart.items.find(item => item.bookId.toString() === bookId.toString());
    if (itemExists) {
      return res.status(400).json({ success: false, message: 'Book is already in your cart', data: null });
    }

    cart.items.push({ bookId });
    await cart.save();

    return res.json({ success: true, message: 'Added to cart', data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Remove book from cart
 * @route   DELETE /api/cart/remove/:bookId
 * @access  Private
 */
export const removeFromCart = async (req, res) => {
  try {
    const { bookId } = req.params;

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found', data: null });
    }

    cart.items = cart.items.filter(item => item.bookId.toString() !== bookId.toString());
    await cart.save();

    return res.json({ success: true, message: 'Removed from cart', data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart/clear
 * @access  Private
 */
export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return res.json({ success: true, message: 'Cart cleared', data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
