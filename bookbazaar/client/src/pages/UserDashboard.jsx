import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import { Heart, Package, Clock, ExternalLink } from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'wishlist'
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes, wishlistRes] = await Promise.all([
          api.get('/orders/my-orders'),
          api.get('/auth/wishlist')
        ]);
        
        if (ordersRes.data.success) {
           setOrders(ordersRes.data.data);
        }
        if (wishlistRes.data.success) {
           setWishlist(wishlistRes.data.data);
        }
      } catch (err) {
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  const handleRemoveWishlist = async (id) => {
    try {
      const res = await api.post('/auth/wishlist', { bookId: id });
      if (res.data.success) {
        setWishlist(wishlist.filter(item => item._id !== id));
        toast.success('Removed from wishlist');
      }
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
       <SEO title="My Profile" description="Manage your BookBazaar purchases and wishlist" />
       
       <div className="flex items-center gap-4 mb-8">
         <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex justify-center items-center text-2xl font-bold shadow-md">
            {user?.name?.charAt(0).toUpperCase()}
         </div>
         <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500 font-medium">{user?.email}</p>
         </div>
       </div>

       {/* Tabs */}
       <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
          <button 
             onClick={() => setActiveTab('orders')}
             className={`px-5 py-2.5 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <Package size={18} /> My Orders
          </button>
          <button 
             onClick={() => setActiveTab('wishlist')}
             className={`px-5 py-2.5 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'wishlist' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <Heart size={18} /> Wishlist ({wishlist.length})
          </button>
       </div>

       {/* Content */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
          {activeTab === 'orders' && (
             <div className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Order Tracking</h2>
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 font-medium">No orders placed yet.</div>
                ) : (
                  <div className="space-y-4">
                     {orders.map(order => (
                       <div key={order._id} className="border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-blue-200 transition-colors">
                          <div className="flex items-start md:items-center gap-4">
                             {order.bookId && order.bookId.image ? (
                               <img src={order.bookId.image} alt="Book" className="w-16 h-20 object-cover rounded shadow-sm" />
                             ) : (
                               <div className="w-16 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">?</div>
                             )}
                             <div>
                               <p className="font-bold text-gray-900">{order.bookId?.title || 'Unknown Book'}</p>
                               <span className="text-xs text-gray-400">Order ID: {order._id.substring(18)}</span>
                               <p className="text-sm font-bold mt-2">Rs. {order.price}</p>
                             </div>
                          </div>
                          
                          <div className="flex flex-col md:items-end gap-2">
                             <div className="flex items-center gap-2 text-sm font-bold">
                               <span className="text-gray-500">Status:</span>
                               <span className={`px-2.5 py-1 rounded-full text-xs ${
                                  order.orderStatus === 'Completed' ? 'bg-green-100 text-green-700' :
                                  order.orderStatus === 'Processing' ? 'bg-blue-100 text-blue-700' :
                                  order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                               }`}>
                                  {order.orderStatus}
                               </span>
                             </div>
                             <p className="flex items-center gap-1.5 text-xs text-gray-400">
                               <Clock size={14} /> {new Date(order.createdAt).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
             </div>
          )}

          {activeTab === 'wishlist' && (
             <div className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">My Wishlist</h2>
                {wishlist.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 font-medium">Your wishlist is empty.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                     {wishlist.map(book => (
                        <div key={book._id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group relative">
                           <button onClick={() => handleRemoveWishlist(book._id)} className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-pink-500 hover:text-pink-700 hover:bg-white z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Heart size={18} fill="currentColor" />
                           </button>
                           <Link to={`/books/${book._id}`} className="block relative pt-[120%] bg-gray-50">
                             <img src={book.image} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                           </Link>
                           <div className="p-4 flex flex-col flex-grow">
                             <Link to={`/books/${book._id}`} className="font-bold text-gray-900 hover:text-blue-600 line-clamp-1 mb-1 shadow-sm">
                               {book.title}
                             </Link>
                             <p className="text-xs text-gray-500 mb-3">{book.author}</p>
                             <div className="mt-auto flex items-center justify-between">
                               <span className="font-black text-gray-900">Rs. {book.price}</span>
                               <Link to={`/books/${book._id}`} className="text-blue-600 hover:text-blue-800">
                                 <ExternalLink size={18} />
                               </Link>
                             </div>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
             </div>
          )}
       </div>
    </div>
  );
};

export default UserDashboard;
