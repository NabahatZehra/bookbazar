import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { Heart, Search } from 'lucide-react';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/wishlist');
      if (res.data.success) {
        setWishlist(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async (bookId) => {
    try {
      const res = await api.post(`/wishlist/${bookId}`);
      if (res.data.success) {
         // If we're on the wishlist page and we toggle it, it's removed.
         setWishlist(wishlist.filter(book => book._id !== bookId));
         toast.success('Removed from wishlist');
      }
    } catch (err) {
      toast.error('Could not update wishlist');
    }
  }

  const handleMoveToCart = (book) => {
    addToCart(book);
    toggleWishlist(book._id); // Remove from wishlist after adding to cart
    toast.success('Moved to cart!');
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading your wishlist...</div>;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
        <Heart className="text-red-500" fill="currentColor" /> My Wishlist
      </h1>

      {wishlist.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-8">Save items you like to your wishlist and review them anytime.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800">
            <Search size={18}/> Browse Books
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map(book => (
            <div key={book._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow group flex flex-col">
              <div className="relative aspect-[3/4] bg-gray-100">
                <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                <button 
                  onClick={() => toggleWishlist(book._id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full text-red-500 hover:scale-110 transition-transform shadow-sm"
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  <Link to={`/book/${book._id}`}>{book.title}</Link>
                </h3>
                <p className="text-xs text-gray-500 mb-2">{book.author}</p>
                <div className="text-lg font-black text-gray-900 mb-4">Rs. {book.price}</div>
                
                <button 
                  onClick={() => handleMoveToCart(book)}
                  disabled={book.status !== 'available'}
                  className="mt-auto w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400"
                >
                  {book.status === 'available' ? 'Move to Cart' : 'Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Wishlist;
