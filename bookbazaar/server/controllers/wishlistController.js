import User from '../models/User.js';

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    return res.json({ success: true, message: 'Wishlist fetched', data: user.wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { bookId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const isLiked = user.wishlist.some(id => id.toString() === bookId.toString());
    
    // Toggle logic for POST /api/wishlist/:bookId as requested
    if (isLiked) {
      user.wishlist = user.wishlist.filter(id => id.toString() !== bookId.toString());
    } else {
      user.wishlist.push(bookId);
    }
    await user.save();
    
    return res.json({ success: true, message: isLiked ? 'Removed from wishlist' : 'Added to wishlist', data: user.wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Explicit delete endpoint, just in case
export const removeFromWishlist = async (req, res) => {
  try {
    const { bookId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.wishlist = user.wishlist.filter(id => id.toString() !== bookId.toString());
    await user.save();
    
    return res.json({ success: true, message: 'Removed from wishlist', data: user.wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
