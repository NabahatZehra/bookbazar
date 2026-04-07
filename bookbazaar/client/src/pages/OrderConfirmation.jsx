import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MessageCircle, Package, CreditCard } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const OrderConfirmation = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/orders/${id}`);
        if (res.data.success) setOrder(res.data.data);
        else toast.error(res.data.message || 'Failed to load order');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Helmet>
          <title>Order Not Found - BookBazaar</title>
        </Helmet>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-2xl font-extrabold text-red-600 mb-2">Order not found</h1>
          <p className="text-gray-600">The order might have been removed or is unavailable.</p>
          <div className="mt-6">
            <Link to="/" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 lg:px-0 px-4">
      <Helmet>
        <title>Order Placed Successfully - BookBazaar</title>
      </Helmet>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
              <CreditCard size={18} />
              <span className="font-bold">Payment confirmed</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Order Placed Successfully!</h1>
            <p className="text-gray-600">
              Track your order and review the seller after completion.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p className="font-semibold text-gray-700">Order ID</p>
            <p className="font-mono">{order._id}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package size={22} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Book Details</h2>
            </div>

            <div className="flex gap-4">
              <div className="w-24 h-28 bg-white border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={order.bookId?.image || 'https://via.placeholder.com/150'}
                  alt={order.bookId?.title || 'Book cover'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-gray-900 truncate">{order.bookId?.title || 'Unknown book'}</p>
                <p className="text-gray-600 mt-1">{order.bookId?.description ? 'Seller listing details available' : order.bookId?.title}</p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {order.orderStatus || 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Breakdown</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Book Price</span>
                <span className="font-bold text-gray-900">Rs. {Number(order.price || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Platform Commission (10%)</span>
                <span className="font-bold text-gray-900">Rs. {Number(order.commissionAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-700 font-semibold">Seller Amount</span>
                <span className="font-bold text-blue-700">Rs. {Number(order.sellerAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-white border border-gray-100 p-4">
              <p className="text-xs text-gray-500 font-medium">Amount Paid</p>
              <p className="text-2xl font-black text-gray-900">Rs. {Number(order.price || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/messages"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            <MessageCircle size={18} />
            Messages
          </Link>
          <Link
            to={`/orders/${order._id}`}
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-800 border border-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

