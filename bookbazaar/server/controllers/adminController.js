import User from '../models/User.js';
import Book from '../models/Book.js';
import Order from '../models/Order.js';
import Setting from '../models/Setting.js';

/**
 * @desc    Get all users (with pagination)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find({}).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'Users fetched successfully',
      data: { users, page, pages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found', data: null });

    // Optional: Cascading delete logic could be invoked here to remove books/orders
    await User.deleteOne({ _id: user._id });
    return res.json({ success: true, message: 'User removed successfully', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get all books
 * @route   GET /api/admin/books
 * @access  Private/Admin
 */
export const getAllBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Book.countDocuments();
    const books = await Book.find({}).populate('sellerId', 'name email').skip(skip).limit(limit).sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'Books fetched successfully',
      data: { books, page, pages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Delete a book
 * @route   DELETE /api/admin/books/:id
 * @access  Private/Admin
 */
export const deleteBookAdmin = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found', data: null });

    await Book.deleteOne({ _id: book._id });
    return res.json({ success: true, message: 'Book removed successfully', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get revenue details
 * @route   GET /api/admin/revenue
 * @access  Private/Admin
 */
export const getRevenue = async (req, res) => {
  try {
    // Note: Can use MongoDB aggregations to fetch exact revenue stats
    const orders = await Order.find({ paymentStatus: 'Paid' }).sort({ createdAt: -1 });
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, order) => acc + order.price, 0);
    const totalCommission = orders.reduce((acc, order) => acc + order.commissionAmount, 0);
    
    const commissionSetting = await Setting.findOne({ key: 'globalCommissionRate' });
    const commissionRate = commissionSetting ? commissionSetting.value : 0.10;

    const recentOrders = await Order.find({ paymentStatus: 'Paid' })
      .populate('bookId', 'title')
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    return res.json({
      success: true,
      message: 'Revenue stats fetched',
      data: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCommission: Number(totalCommission.toFixed(2)),
        commissionRate,
        recentOrders,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Update global commission rate
 * @route   PUT /api/admin/commission
 * @access  Private/Admin
 */
export const updateCommissionRate = async (req, res) => {
  try {
    const { rate } = req.body;
    if (typeof rate !== 'number' || rate < 0 || rate > 1) {
      return res.status(400).json({ success: false, message: 'Invalid commission rate (0-1)', data: null });
    }

    const setting = await Setting.findOneAndUpdate(
      { key: 'globalCommissionRate' },
      { value: rate },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: 'Commission rate updated', data: setting });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
export const getStats = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const booksCount = await Book.countDocuments();
    const ordersCount = await Order.countDocuments();
    
    // Total revenue from Paid orders
    const paidOrders = await Order.find({ paymentStatus: 'Paid' });
    const totalRevenue = paidOrders.reduce((acc, order) => acc + order.price, 0);

    return res.json({
      success: true,
      message: 'Dashboard stats fetched',
      data: {
        usersCount,
        booksCount,
        ordersCount,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
