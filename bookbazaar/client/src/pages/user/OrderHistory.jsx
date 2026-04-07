import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Package, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Pending</span>;
      case 'Processing':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold flex items-center gap-1"><Package size={12}/> Processing</span>;
      case 'Completed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Completed</span>;
      case 'Cancelled':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> Cancelled</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading orders...</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 lg:px-4 space-y-8">
      <Helmet><title>Order History - BookBazaar</title></Helmet>
      
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <Package className="text-blue-600" size={32} />
        <div>
           <h1 className="text-3xl font-extrabold text-gray-900">Order History</h1>
           <p className="text-gray-500 text-sm mt-1">Track and manage your past purchases</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">When you buy a book, it will appear here. Start exploring our marketplace today!</p>
          <Link to="/" className="inline-block bg-blue-600 outline-none text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md">
            Browse Books
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
           {orders.map(order => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row group transition-all hover:shadow-md">
                 <div className="w-full sm:w-40 h-48 sm:h-auto bg-gray-50 flex-shrink-0 border-r border-gray-100">
                    <img src={order.bookId?.image || 'https://via.placeholder.com/150'} alt="Book Cover" className="w-full h-full object-contain p-4 mix-blend-multiply" />
                 </div>
                 <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-2">
                          <div>
                             <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{order.bookId?.title || 'Unknown Book'}</h3>
                             <p className="text-xs text-gray-400">Order ID: {order._id}</p>
                          </div>
                          <div>{getStatusBadge(order.orderStatus)}</div>
                       </div>
                       <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 inline-block mb-4">
                          <p><span className="font-medium">Placed on:</span> {new Date(order.createdAt).toLocaleDateString()}</p>
                          <p><span className="font-medium">Seller:</span> {order.sellerId?.name || 'Unknown'}</p>
                       </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                       <div>
                          <p className="text-xs text-gray-500 mb-1">Total Paid (incl. fee)</p>
                          <p className="text-2xl font-black text-gray-900">Rs. {(order.price + order.commissionAmount).toLocaleString()}</p>
                       </div>
                       <Link to={`/orders/${order._id}`} className="bg-white border border-gray-200 shadow-sm text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors">
                         <Eye size={16} /> View Details
                       </Link>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
};
export default OrderHistory;
