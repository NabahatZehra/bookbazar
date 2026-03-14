import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Star, ShieldCheck, MapPin, BookOpen } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await api.get(`/books/${id}`);
        if (res.data.success) {
          setBook(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load book parameters');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to purchase books');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    if (user._id === book.sellerId?._id) {
      toast.error('You cannot buy your own book');
      return;
    }

    addToCart(book);
    toast.success('Added to cart!');
  };

  const handleMessageSeller = () => {
    if (!user) {
      toast.error('Please login to message the seller');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    // Let ChatPage handle conversation creation upon navigating and selecting the user
    // (A real app might implicitly create the conversation row via API first)
    toast.success('Redirecting to chat...');
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!book) return null;

  const inCart = cart.some(item => item._id === book._id);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <SEO 
        title={book.title} 
        description={book.description.substring(0, 160)}
        image={book.image}
      />
      {/* Dynamic JSON-LD is handled inside SEO component ideally, but for specific Product schemas we can inject an extra one here or rely on the global one. We'll add it here for SEO compliance */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": book.title,
          "image": book.image,
          "description": book.description,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "PKR",
            "price": book.price,
            "availability": book.status === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        })}
      </script>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left: Image */}
          <div className="w-full md:w-2/5 md:border-r border-gray-100 bg-gray-50 p-8 flex items-center justify-center">
            <img 
              src={book.image} 
              alt={book.title} 
              className="max-h-[500px] w-auto object-contain rounded-lg shadow-md"
            />
          </div>

          {/* Right: Details */}
          <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col pt-10">
            <div className="flex items-center gap-3 mb-4">
               <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  book.condition === 'New' ? 'bg-green-100 text-green-700' : 
                  book.condition === 'Good' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
               }`}>
                 {book.condition} Condition
               </span>
               <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                 book.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
               }`}>
                 {book.status === 'available' ? 'In Stock' : 'Sold Out'}
               </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
              {book.title}
            </h1>
            <p className="text-xl text-gray-600 mb-6 font-medium">By {book.author}</p>

            <div className="text-3xl font-black text-gray-900 mb-8 border-b border-gray-100 pb-8">
              Rs. {book.price.toLocaleString()}
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-line">
              {book.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                   <MapPin size={20} />
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 font-medium">University</p>
                   <p className="text-sm font-bold text-gray-700">{book.university || 'General'}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                 <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                   <BookOpen size={20} />
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 font-medium">Course</p>
                   <p className="text-sm font-bold text-gray-700">{book.course || 'N/A'}</p>
                 </div>
               </div>
            </div>

            {/* Seller Info Mini Profile */}
            {book.sellerId && (
              <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
                    {book.sellerId.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-0.5">Sold by</p>
                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                      {book.sellerId.name} 
                      <ShieldCheck size={16} className="text-blue-500" />
                    </p>
                    <div className="flex items-center mt-1 text-yellow-400">
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} className="text-gray-300" />
                      <span className="text-xs text-gray-500 ml-1.5 font-medium">(4.0)</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleMessageSeller}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={18} className="text-blue-600" />
                  <span className="hidden sm:inline">Message</span>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-6 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleAddToCart}
                disabled={book.status !== 'available' || inCart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              >
                <ShoppingCart size={20} />
                {inCart ? 'Already in Cart' : book.status === 'available' ? 'Add to Cart' : 'Sold Out'}
              </button>
              {book.status === 'available' && !inCart && (
                <button 
                  onClick={() => {
                    handleAddToCart();
                    navigate('/cart');
                  }}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold flex items-center justify-center shadow-md transition-all hover:-translate-y-0.5"
                >
                  Buy Now
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
