import Stripe from 'stripe';
import Order from '../models/Order.js';
import Book from '../models/Book.js';
import Cart from '../models/Cart.js';
import { calculateCommission } from '../utils/commissionCalculator.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    return new Stripe(key);
  } catch {
    return null;
  }
}

/**
 * @desc    Place a new order (creates PaymentIntent)
 * @route   POST /api/orders
 * @access  Private
 */
export const placeOrder = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Card payments are not configured. Use “Place order” (mock checkout) instead.',
        data: { code: 'NO_STRIPE' },
      });
    }

    const { bookId, deliveryInfo } = req.body;

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found', data: null });
    }

    if (book.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Book is already sold or unavailable', data: null });
    }

    if (book.sellerId.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot buy your own listing', data: null });
    }

    // Calculate commission (prefers DB setting if present)
    const setting = await Setting.findOne({ key: 'globalCommissionRate' });
    const envRate = parseFloat(process.env.COMMISSION_RATE);
    const settingRate = setting ? Number(setting.value) : NaN;
    const rate = Number.isFinite(settingRate)
      ? settingRate
      : (Number.isFinite(envRate) ? envRate : 0.10);

    const { commissionAmount, sellerAmount, buyerPays } = calculateCommission(book.price, rate);

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(buyerPays * 100), // Stripe requires the amount in cents
      currency: 'pkr',
      metadata: { bookId: book._id.toString(), buyerId: req.user._id.toString() },
    });

    // Create pending Order
    const order = new Order({
      buyerId: req.user._id,
      sellerId: book.sellerId,
      bookId: book._id,
      price: book.price,
      commissionRate: rate,
      commissionAmount,
      sellerAmount,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      stripePaymentIntentId: paymentIntent.id,
      deliveryInfo: {
        fullName: deliveryInfo?.fullName || '',
        phone: deliveryInfo?.phone || '',
        addressLine1: deliveryInfo?.addressLine1 || '',
        city: deliveryInfo?.city || '',
        notes: deliveryInfo?.notes || '',
      },
    });

    const createdOrder = await order.save();

    return res.status(201).json({
      success: true,
      message: 'Order placed, awaiting payment',
      data: {
        orderId: createdOrder._id,
        clientSecret: paymentIntent.client_secret,
        amount: Math.round(buyerPays * 100), // Stripe format or standard buyerPays? The frontend expects amount.
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Confirm successful payment manually or via webhook success trigger
 * @route   POST /api/orders/confirm
 * @access  Private
 */
export const confirmOrder = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    if (order.stripePaymentIntentId !== paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Invalid payment intent', data: null });
    }

    // Validate with Stripe to ensure it was actually paid
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ success: false, message: 'Stripe is not configured', data: null });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment intent not succeeded', data: null });
    }

    order.paymentStatus = 'Paid';
    order.orderStatus = 'Processing';
    await order.save();

    const book = await Book.findById(order.bookId);
    if (book) {
      book.status = 'sold';
      await book.save();

      await User.findByIdAndUpdate(order.buyerId, {
        $push: {
          purchaseHistory: {
            bookId: book._id,
            grade: book.educationMeta?.grade || null,
            field: book.educationMeta?.field || null,
            subject: book.educationMeta?.subject || null,
          },
        },
      });
      
      // Clear from user wishlists
      await import('../models/User.js').then(({ default: User }) => {
        return User.updateMany(
          { wishlist: book._id },
          { $pull: { wishlist: book._id } }
        );
      });

      // Clear from all carts
      await import('../models/Cart.js').then(({ default: Cart }) => {
        return Cart.updateMany(
          { 'items.bookId': book._id },
          { $pull: { items: { bookId: book._id } } }
        );
      });
    }

    return res.json({ success: true, message: 'Order confirmed successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Mark an order as completed (seller action)
 * @route   PUT /api/orders/:id/complete
 * @access  Private
 */
export const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({ success: false, message: 'Payment must be marked as Paid first', data: null });
    }

    const isSeller = order.sellerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this order', data: null });
    }

    order.orderStatus = 'Completed';
    await order.save();

    return res.json({ success: true, message: 'Order marked as completed', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Submit a review for a completed order (buyer action)
 * @route   POST /api/orders/:id/review
 * @access  Private
 */
export const submitOrderReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({ success: false, message: 'Payment must be marked as Paid first', data: null });
    }

    if (order.orderStatus !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Order must be completed before leaving a review', data: null });
    }

    const isBuyer = order.buyerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the buyer can review this order', data: null });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5', data: null });
    }

    const existingReview = await Review.findOne({ orderId: order._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already submitted for this order', data: null });
    }

    const existingSellerReview = await Review.findOne({ reviewerId: req.user._id, sellerId: order.sellerId });
    if (existingSellerReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this seller', data: null });
    }

    const review = await Review.create({
      reviewerId: req.user._id,
      sellerId: order.sellerId,
      orderId: order._id,
      rating: numericRating,
      comment: comment || '',
    });

    const reviews = await Review.find({ sellerId: order.sellerId });
    const totalReviews = reviews.length;
    const averageRating = totalReviews ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

    await User.findByIdAndUpdate(order.sellerId, {
      totalReviews,
      averageRating: Number(averageRating.toFixed(1)),
    });

    return res.status(201).json({ success: true, message: 'Review added successfully', data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Mock checkout — no Stripe; creates paid orders from cart items
 * @route   POST /api/orders/mock-checkout
 * @access  Private
 */
export const mockCheckout = async (req, res) => {
  try {
    const { items, totalPrice, paymentMethod, deliveryInfo } = req.body;

    if (paymentMethod !== 'mock') {
      return res.status(400).json({ success: false, message: 'Invalid payment method', data: null });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in checkout', data: null });
    }
    if (!deliveryInfo?.fullName || !deliveryInfo?.phone || !deliveryInfo?.addressLine1 || !deliveryInfo?.city) {
      return res.status(400).json({ success: false, message: 'Delivery details are required', data: null });
    }

    const buyerId = req.user._id;

    const setting = await Setting.findOne({ key: 'globalCommissionRate' });
    const envRate = parseFloat(process.env.COMMISSION_RATE);
    const settingRate = setting ? Number(setting.value) : NaN;
    const rate = Number.isFinite(settingRate)
      ? settingRate
      : (Number.isFinite(envRate) ? envRate : 0.10);

    let serverSum = 0;
    const orderIds = [];
    const seenBook = new Set();

    const processCheckout = async () => {
      for (const item of items) {
        const bid = item.bookId?.toString();
        if (!bid) throw new Error('Each item must include bookId');
        if (seenBook.has(bid)) throw new Error('Duplicate book in checkout payload');
        seenBook.add(bid);
        const book = await Book.findById(item.bookId);
        if (!book) {
          throw new Error('Book not found');
        }
        if (book.status !== 'available') {
          throw new Error(`This book is no longer available: ${book.title}`);
        }
        if (book.sellerId.toString() === buyerId.toString()) {
          throw Object.assign(new Error('You cannot buy your own listing'), { code: 'OWN_LISTING' });
        }

        const priceNum = Number(book.price);
        if (Number(item.price) !== priceNum) {
          throw new Error('Price mismatch — refresh cart and try again');
        }

        const { commissionAmount, sellerAmount, buyerPays } = calculateCommission(priceNum, rate);
        serverSum += buyerPays;

        const order = new Order({
          buyerId,
          sellerId: book.sellerId,
          bookId: book._id,
          price: priceNum,
          commissionRate: rate,
          commissionAmount,
          sellerAmount,
          paymentStatus: 'Paid',
          orderStatus: 'Processing',
          stripePaymentIntentId: `mock_${Date.now()}_${book._id}`,
          deliveryInfo: {
            fullName: deliveryInfo.fullName,
            phone: deliveryInfo.phone,
            addressLine1: deliveryInfo.addressLine1,
            city: deliveryInfo.city,
            notes: deliveryInfo.notes || '',
          },
        });
        await order.save();
        orderIds.push(order._id);

        book.status = 'sold';
        await book.save();

        await User.findByIdAndUpdate(buyerId, {
          $push: {
            purchaseHistory: {
              bookId: book._id,
              grade: book.educationMeta?.grade || null,
              field: book.educationMeta?.field || null,
              subject: book.educationMeta?.subject || null,
            },
          },
        });

        await User.updateMany({ wishlist: book._id }, { $pull: { wishlist: book._id } });
        await Cart.updateMany({ 'items.bookId': book._id }, { $pull: { items: { bookId: book._id } } });
      }

      await Cart.findOneAndUpdate({ userId: buyerId }, { $set: { items: [] } }, { upsert: true });

      if (Math.abs(serverSum - Number(totalPrice)) > 0.01) {
        throw new Error('Total does not match cart — please refresh and try again');
      }
    };

    try {
      await processCheckout();
    } catch (err) {
      if (String(err.message || '').includes('Transaction numbers are only allowed on a replica set member or mongos')) {
        throw new Error('Database transaction mode is not available. Please retry checkout.');
      }
      throw err;
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { orderId: orderIds[0], orderIds },
    });
  } catch (error) {
    if (error.code === 'OWN_LISTING') {
      return res.status(403).json({ success: false, message: 'You cannot buy your own listing', data: null });
    }
    return res.status(400).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get buyer's placed orders
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user._id })
      .populate('bookId', 'title image price condition')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, message: 'Buyer orders fetched', data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get seller's generated orders
 * @route   GET /api/orders/my-sales
 * @access  Private
 */
export const getMySales = async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user._id })
      .populate('bookId', 'title image price condition')
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, message: 'Seller sales fetched', data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};

/**
 * @desc    Get single order details
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('bookId', 'title image description')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    // Only buyer, seller, or admin can view
    if (
      order.buyerId._id.toString() !== req.user._id.toString() &&
      order.sellerId._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order', data: null });
    }

    return res.json({ success: true, message: 'Order fetched', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
  }
};
