import Stripe from 'stripe';
import Order from '../models/Order.js';
import Book from '../models/Book.js';
import { calculateCommission } from '../utils/commissionCalculator.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Place a new order (creates PaymentIntent)
 * @route   POST /api/orders
 * @access  Private
 */
export const placeOrder = async (req, res) => {
  try {
    const { bookId } = req.body;

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found', data: null });
    }

    if (book.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Book is already sold or unavailable', data: null });
    }

    // You cannot buy your own book
    if (book.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot buy your own book', data: null });
    }

    // Calculate commission
    // Assuming a global commission rate of 10% (0.10) for now. Admin can update logic later
    const rate = 0.10;
    const { commissionAmount, sellerAmount, buyerPays } = calculateCommission(book.price, rate);

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(buyerPays * 100), // Stripe requires the amount in cents
      currency: 'usd',
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
    });

    const createdOrder = await order.save();

    return res.status(201).json({
      success: true,
      message: 'Order placed, awaiting payment',
      data: {
        orderId: createdOrder._id,
        clientSecret: paymentIntent.client_secret,
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
    }

    return res.json({ success: true, message: 'Order confirmed successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: null });
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
