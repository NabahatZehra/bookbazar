import User from '../models/User.js';
import Book from '../models/Book.js';
import Order from '../models/Order.js';

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Account stats: books listed, books sold, purchases made
    const booksListed = await Book.countDocuments({ sellerId: user._id });
    const booksSold = await Book.countDocuments({ sellerId: user._id, status: 'sold' });
    const purchasesMade = await Order.countDocuments({ buyerId: user._id, paymentStatus: 'Paid' });

    return res.json({
      success: true,
      data: {
        user,
        stats: { booksListed, booksSold, purchasesMade },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      if (typeof req.body.university === 'string') {
        user.university = req.body.university.trim();
      }
      if (typeof req.body.course === 'string') {
        user.course = req.body.course.trim();
      }
      
      let avatarUrl = user.avatar;
      if (req.file && req.file.path) {
        avatarUrl = req.file.path;
      } else if (req.body.avatar) {
        avatarUrl = req.body.avatar;
      }
      user.avatar = avatarUrl;

      const updatedUser = await user.save();

      return res.json({
        success: true,
        message: 'Profile updated',
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
        },
      });
    } else {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!(await user.matchPassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Invalid old password' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEducationProfile = async (req, res) => {
  try {
    const {
      level,
      currentGrade,
      university,
      degree,
      field,
      semester,
      institution,
      board,
    } = req.body || {};

    await User.findByIdAndUpdate(req.user._id, {
      educationProfile: {
        level: level || null,
        currentGrade: currentGrade ? Number(currentGrade) : null,
        university: university || null,
        degree: degree || null,
        field: field || null,
        semester: semester ? Number(semester) : null,
        institution: institution || null,
        board: board || null,
        isProfileComplete: true,
      },
    });

    return res.json({ success: true, message: 'Education profile saved' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
